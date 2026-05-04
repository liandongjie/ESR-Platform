'''
Author: liandongjie
Date: 2026-05-03 13:59:22
LastEditors: liandongjie
LastEditTime: 2026-05-03 14:00:05
Description: 
'''
import numpy as np
import rasterio
from rasterio.mask import mask


def calc_stats(arr):
    """
    计算数组的 min / max / mean。
    自动忽略 nan。
    如果全是 nan，返回 None。
    """
    valid = arr[np.isfinite(arr)]

    if valid.size == 0:
        return {
            "min": None,
            "max": None,
            "mean": None
        }

    return {
        "min": float(np.min(valid)),
        "max": float(np.max(valid)),
        "mean": float(np.mean(valid))
    }


def clip_raster_for_api(raster_path, geoms, out_path):
    """
    API 版栅格裁剪函数。
    """
    with rasterio.open(raster_path) as src:
        out_image, out_transform = mask(src, geoms, crop=True)
        out_meta = src.meta.copy()
        nodata = src.nodata

    out_meta.update({
        "driver": "GTiff",
        "height": out_image.shape[1],
        "width": out_image.shape[2],
        "transform": out_transform
    })

    with rasterio.open(out_path, "w", **out_meta) as dest:
        dest.write(out_image)

    band = out_image[0].astype(np.float32)

    if nodata is not None:
        band[band == nodata] = np.nan

    stats = calc_stats(band)

    return {
        "array": band,
        "meta": out_meta,
        "stats": stats
    }