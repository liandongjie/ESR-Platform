'''
Author: liandongjie
Date: 2026-05-03 14:08:59
LastEditors: liandongjie
LastEditTime: 2026-05-03 14:09:12
Description: 
'''
import json
import geopandas as gpd


def read_shapefile_zip(zip_path):
    """
    读取 Shapefile zip 压缩包，并统一转成 EPSG:4326。
    """
    gdf = gpd.read_file("zip://" + zip_path)

    if gdf.empty:
        raise ValueError("上传的 Shapefile 中没有要素")

    if gdf.crs is None:
        gdf = gdf.set_crs("EPSG:4326")
    else:
        gdf = gdf.to_crs("EPSG:4326")

    return gdf


def shapefile_zip_to_geojson(zip_path):
    """
    将 Shapefile zip 转成 GeoJSON。
    """
    gdf = read_shapefile_zip(zip_path)

    geojson = json.loads(gdf.to_json())

    return {
        "geojson": geojson,
        "featureCount": int(len(gdf)),
        "crs": "EPSG:4326"
    }