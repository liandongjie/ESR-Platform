# 数据目录
tifFolder = './static/tif/'
saveFolder = './static/temp/'

# 栅格文件映射
tifs = {
    'PM25': 'PM25.tif',
    'AQI': 'AQI.tif',
    'NDVI': 'NDVI.tif',
    'hwmd': 'hwmd.tif',
    'rkmd': 'rkmd.tif',
    'xxmd': 'xxmd.tif',
    'jmdmd': 'jmdmd.tif',
    'xspb': 'xspb.tif',
    'xsqs': 'xsqs.tif',
    'gyfb': 'gyfb.tif',
    'fmyl': 'fmyl.tif',
    'fmts': 'fmts.tif',
}

# 指标名称映射
indicators = {
    'PM25': '细颗粒物 (PM2.5)',
    'AQI': '空气质量指数 (AQI)',
    'NDVI': '归一化差值植被指数',
    'hwmd': '河网密度',
    'rkmd': '人口密度',
    'xxmd': '学校密度',
    'jmdmd': '居民点密度',
    'xspb': '刑事批捕率',
    'xsqs': '刑事起诉率',
    'gyfb': '官员腐败指数',
    'fmyl': '垃圾焚烧负面舆论占比',
    'fmts': '环境投诉负面数量占比',
    'esr': '环境社会风险',
}