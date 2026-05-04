import os
import uuid
import zipfile
import shutil

import numpy as np
import geopandas as gpd
import rasterio
from shapely.geometry import shape as shapely_shape

from backend_config import tifFolder, saveFolder, tifs, indicators
from raster_service import calc_stats, clip_raster_for_api


def create_report_task(geometry, weights, time_str):
    """
    根据研究区 geometry 和指标权重生成环境社会风险分析结果。
    返回 statistics、downloadUrl、file、taskId。
    """
    task_dir = None

    try:
        validate_geometry(geometry)
        validate_weights(weights)

        geoms = [geometry]

        task_id = time_str + "_" + uuid.uuid4().hex[:8]

        os.makedirs(saveFolder, exist_ok=True)

        task_dir = os.path.join(saveFolder, task_id)
        os.makedirs(task_dir, exist_ok=True)

        zip_name = f"环境社会风险分析数据-{task_id}.zip"
        zip_path = os.path.join(saveFolder, zip_name)

        results = []
        esr_array = None
        esr_valid_mask = None
        esr_meta = None

        with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as zip_file:
            for item in weights:
                key = item.get("key")
                weight_value = parse_weight(item)

                raster_path = os.path.join(tifFolder, tifs[key])

                if not os.path.exists(raster_path):
                    raise ValueError(f"指标 {key} 对应的栅格文件不存在: {raster_path}")

                clipped_tif_path = os.path.join(task_dir, f"{key}.tif")

                clipped = clip_raster_for_api(
                    raster_path=raster_path,
                    geoms=geoms,
                    out_path=clipped_tif_path
                )

                band = clipped["array"]
                stats = clipped["stats"]

                if esr_array is None:
                    esr_array = np.zeros_like(band, dtype=np.float32)
                    esr_valid_mask = np.isfinite(band)
                    esr_meta = clipped["meta"].copy()
                else:
                    if band.shape != esr_array.shape:
                        raise ValueError(
                            f"指标 {key} 裁剪结果尺寸为 {band.shape}，"
                            f"与前面指标尺寸 {esr_array.shape} 不一致。"
                            "当前版本要求所有指标栅格已预先对齐。"
                        )

                    esr_valid_mask = esr_valid_mask & np.isfinite(band)

                w = weight_value / 100.0
                esr_array += np.nan_to_num(band, nan=0.0) * w

                results.append({
                    "key": key,
                    "name": indicators.get(key, key),
                    "weight": weight_value,
                    "min": stats["min"],
                    "max": stats["max"],
                    "mean": stats["mean"]
                })

                zip_file.write(
                    clipped_tif_path,
                    indicators.get(key, key) + ".tif",
                    compress_type=zipfile.ZIP_DEFLATED
                )

            if esr_array is None:
                raise ValueError("没有可用于计算的指标")

            esr_array[~esr_valid_mask] = np.nan

            esr_stats = calc_stats(esr_array)

            results.append({
                "key": "esr",
                "name": indicators.get("esr", "环境社会风险"),
                "weight": 100,
                "min": esr_stats["min"],
                "max": esr_stats["max"],
                "mean": esr_stats["mean"]
            })

            write_esr_tif(
                esr_array=esr_array,
                esr_meta=esr_meta,
                task_dir=task_dir,
                zip_file=zip_file
            )

            write_geometry_files(
                geometry=geometry,
                task_id=task_id,
                task_dir=task_dir,
                zip_file=zip_file
            )

        download_url = "/" + zip_path.replace("\\", "/").lstrip("./")

        return {
            "taskId": task_id,
            "statistics": results,
            "downloadUrl": download_url,
            "file": zip_name
        }

    finally:
        if task_dir is not None and os.path.exists(task_dir):
            shutil.rmtree(task_dir, ignore_errors=True)


def validate_geometry(geometry):
    if geometry is None:
        raise ValueError("缺少 geometry 参数")

    try:
        geom_obj = shapely_shape(geometry)
    except Exception as err:
        raise ValueError(f"geometry 不是合法的 GeoJSON 格式: {str(err)}")

    if geom_obj.is_empty:
        raise ValueError("geometry 为空")

    if not geom_obj.is_valid:
        raise ValueError("geometry 不是合法的 Polygon/MultiPolygon")


def validate_weights(weights):
    if not isinstance(weights, list) or len(weights) == 0:
        raise ValueError("weights 必须是非空数组")

    for item in weights:
        key = item.get("key")

        if key not in tifs:
            raise ValueError(f"未知指标: {key}")

        parse_weight(item)


def parse_weight(item):
    key = item.get("key")
    weight = item.get("weight")

    import math
    try:
        weight_value = float(weight)
    except Exception:
        raise ValueError(f"指标 {key} 的 weight 不是合法数字")

    if not math.isfinite(weight_value):
        raise ValueError(f"指标 {key} 的 weight 不是合法数字")

    return weight_value


def write_esr_tif(esr_array, esr_meta, task_dir, zip_file):
    esr_out = np.where(np.isfinite(esr_array), esr_array, -9999).astype(np.float32)

    esr_meta.update({
        "driver": "GTiff",
        "count": 1,
        "dtype": "float32",
        "nodata": -9999
    })

    esr_tif_path = os.path.join(task_dir, "环境社会风险指数.tif")

    with rasterio.open(esr_tif_path, "w", **esr_meta) as dest:
        dest.write(esr_out, 1)

    zip_file.write(
        esr_tif_path,
        "环境社会风险指数.tif",
        compress_type=zipfile.ZIP_DEFLATED
    )


def write_geometry_files(geometry, task_id, task_dir, zip_file):
    geom_obj = shapely_shape(geometry)

    gdf = gpd.GeoDataFrame(
        {"id": [task_id]},
        geometry=[geom_obj],
        crs="EPSG:4326"
    )

    geojson_path = os.path.join(task_dir, f"{task_id}.geojson")
    gdf.to_file(geojson_path, driver="GeoJSON", encoding="utf-8")

    zip_file.write(
        geojson_path,
        f"{task_id}.geojson",
        compress_type=zipfile.ZIP_DEFLATED
    )

    shp_dir = os.path.join(task_dir, "shp")
    os.makedirs(shp_dir, exist_ok=True)

    gdf.to_file(shp_dir, driver="ESRI Shapefile", encoding="utf-8")

    for fname in os.listdir(shp_dir):
        fpath = os.path.join(shp_dir, fname)

        zip_file.write(
            fpath,
            os.path.join("shp", fname),
            compress_type=zipfile.ZIP_DEFLATED
        )