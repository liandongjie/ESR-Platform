# system
import os
import json
import urllib
import zipfile
import requests
import datetime
import numpy as np

# vector and raster
import fiona
import geopandas as gpd
import rasterio
from osgeo import gdal
from rasterio.mask import mask

# flask
import flask
from flask import Flask
from flask import request
from flask import url_for
from flask import jsonify
from flask import make_response

# project
from backend_config import tifFolder, saveFolder, tifs, indicators
from raster_service import calc_stats, clip_raster_for_api
from api_routes import api_bp

app = Flask(__name__, template_folder='./', static_folder='./', static_url_path='')
app.register_blueprint(api_bp)
# 获取日期
def getTimeStr(style='datetime'):
    curTime = datetime.datetime.now()
    dateStr = curTime.strftime('%y%m%d')
    timeStr = curTime.strftime('%H%M%S')
    if style == 'date':
        return dateStr
    elif style == 'time':
        return timeStr
    elif style == 'datetime':
        return dateStr + 'T' + timeStr

# 裁剪影像
def maskRaster(raster, shape):  # 裁剪影像，获取裁剪部分的信息
    geoms = shape
    with rasterio.open(raster) as src:  # 读取影像
        out_image, out_transform = mask(src, geoms, crop=True)  # 裁剪
        out_meta = src.meta.copy()  # 拷贝元数据信息
    out_meta.update({'driver': 'GTiff',  # 更新影像元数据信息
                     'height': out_image.shape[1],
                     'width': out_image.shape[2],
                     'transform': out_transform})
    del src

    path = './static/temp/' + raster.split('/')[-1]
    with rasterio.open(path, 'w', **out_meta) as dest:
        dest.write(out_image)
    del dest

    nv = out_meta['nodata']  # 空值，nan value
    band = out_image[0]  # out_image是numpy.ndarray对象
    band[band == nv] = np.nan  # 将空值替换为np.nan
    fband = band.flatten()  # 将矩阵展平，f代表flatten
    # 返回影像矩阵，影像矩阵（替换后的），地理坐标转换（6参数），元数据（包含坐标系信息），最小值，最大值，平均值
    return path, out_image[0], band, out_transform, out_meta, np.nanmin(fband), np.nanmax(fband), np.nanmean(fband)


@app.after_request
def af_request(resp):
    """
    #请求钩子，在所有的请求发生后执行，加入headers用于解决跨域问题
    :param resp:
    :return:
    """
    resp = make_response(resp)
    resp.headers['Access-Control-Allow-Origin'] = '*'
    resp.headers['Access-Control-Allow-Methods'] = 'GET,POST'
    resp.headers['Access-Control-Allow-Headers'] = 'x-requested-with,content-type'
    return resp


@app.route('/')
def index():  # put application's code here
    try:
        fobj = open('./templates/index.html', 'rb')
        data = fobj.read()
        fobj.close()
        return data
    except Exception as err:
        return str(err)



@app.route('/download')
def download():
    try:
        fobj = open('./templates/download.html', 'rb')
        data = fobj.read()
        fobj.close()
        return data
    except Exception as err:
        return str(err)


@app.route('/eReport')
def eReport():
    try:
        # 矢量坐标
        coordinates = urllib.parse.unquote(flask.request.args.get('coordinates'))
        geoms = [{'type': 'Polygon',  # 直接提取坐标信息，将其转化为rasterio.mask所需要的矢量格式
                'coordinates': eval('[[' + coordinates.replace('[', '(').replace(']', ')')[2:-2] + ']]')}]
        print('geoms:', geoms)

        # 权重数组
        weights = urllib.parse.unquote(flask.request.args.get('weights'))
        weightsArr = weights.split(';')
        print('权重数组: ', weightsArr)

        responseText = ''  # 用于将计算结果返回给前端
        data, outImage = [], []
        # 将裁剪的影像都压缩到zip文件里面

        timeStr = getTimeStr(style="datetime")  # 获取当前格式化字符串
        file = './static/temp/环境社会风险分析数据-' + timeStr + '.zip'  # 压缩文件
        zip_1 = zipfile.ZipFile(file, 'w')

        # 对影像进行运算操作
        for weight in weightsArr:
            this_indic = weight.split(',')[0]  # 指标变量
            this_w = float(weight.split(',')[1]) * 1.0 / 100  # 指标权重
            tif = tifFolder + tifs[this_indic]  # 影像位置
            print('影像:', tif)
            indexPath, _, band, transform, meta, minv, maxv, meanv = maskRaster(tif, geoms)
            responseText += (this_indic + ',' + str(minv) + ',' + str(maxv) + ',' + str(meanv) + ';')
            print('影像路径：',indexPath)
            zip_1.write(indexPath, indicators[indexPath.split('/')[-1][:-4]]+'.tif', compress_type=zipfile.ZIP_DEFLATED)
            os.remove(indexPath)  # 删除之前存储的

            data.append([_, band, transform, meta, minv, maxv, meanv])
            outImage.append(band * this_w)
        print('求和前', outImage)
        outImage = np.sum(outImage, axis=0)
        print('输出结果', outImage)
        outMin, outMax, outMean = np.nanmin(outImage), np.nanmax(outImage), np.nanmean(outImage)
        responseText += ('esr' + ',' + str(outMin) + ',' + str(outMax) + ',' + str(outMean))
        outMeta = data[0][3]
        outImage = np.array([outImage.astype(np.float32)])  # 只有1个波段
        path = saveFolder + '环境社会风险指数.tif'
        with rasterio.open(path, 'w', **outMeta) as dest: dest.write(outImage)
        del dest
        zip_1.write(path, '环境社会风险指数.tif', compress_type=zipfile.ZIP_DEFLATED)
        os.remove(path)  # 删除影像（不重复存储）

        # 存储矢量数据
        jsonStr = '{"type":"Polygon","coordinates":' + coordinates + '}'
        temp_json = json.loads(jsonStr)
        temp_f = open(saveFolder + timeStr + '.json', 'w')
        json.dump(temp_json, temp_f)
        temp_f.close()
        temp_data = gpd.read_file(saveFolder + timeStr + '.json')
        temp_data.to_file(saveFolder + timeStr, driver='ESRI Shapefile', encoding='utf-8')
        zip_1.write(saveFolder + timeStr + '.json', timeStr + '.json', compress_type=zipfile.ZIP_DEFLATED)
        for f in os.listdir(saveFolder + timeStr):
            zip_1.write(saveFolder + timeStr+'/'+f, f, compress_type=zipfile.ZIP_DEFLATED)
            os.remove(saveFolder + timeStr+'/'+f)
        zip_1.close()
        os.remove(saveFolder+timeStr+'.json')
        os.rmdir(saveFolder + timeStr)
        responseData = {"weights": responseText, "path": file}
        return jsonify(responseData)

    except Exception as err:
        return str(err)


@app.route('/shp2json', methods=['POST'])
def shp2json():
    vecfile = request.files.get('vecfile')
    path = "./static/shp/"
    vecfile_name = vecfile.filename
    vecfile_path = path + vecfile_name
    vecfile.save(vecfile_path)
    vec = gpd.read_file('zip://' + vecfile_path)
    crs = vec.crs
    out_data = gpd.GeoSeries(vec.geometry, crs=crs)
    geojson_file = "./static/temp/temp.json"
    out_data.to_file(geojson_file, driver='GeoJSON', encoding="utf-8")

    with open(geojson_file, 'r', encoding='utf8') as fp:
        json_data = json.load(fp)
    print(json_data)
    print(type(json_data))
    return json_data


if __name__ == '__main__':
    app.run()
