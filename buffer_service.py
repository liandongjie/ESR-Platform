import math

from shapely.geometry import shape, mapping, Polygon, MultiPolygon, GeometryCollection
from shapely.ops import transform
from pyproj import CRS, Transformer


def _extract_polygonal(geom):
    if geom.is_empty:
        return geom

    if isinstance(geom, (Polygon, MultiPolygon)):
        return geom

    if isinstance(geom, GeometryCollection):
        polygons = [
            g for g in geom.geoms
            if isinstance(g, (Polygon, MultiPolygon)) and not g.is_empty
        ]

        if not polygons:
            return geom

        if len(polygons) == 1:
            return polygons[0]

        return MultiPolygon([
            p
            for g in polygons
            for p in (g.geoms if isinstance(g, MultiPolygon) else [g])
        ])

    return geom


def _build_local_aeqd_crs(geom):
    centroid = geom.centroid

    lon = float(centroid.x)
    lat = float(centroid.y)

    return CRS.from_proj4(
        f"+proj=aeqd +lat_0={lat} +lon_0={lon} "
        "+x_0=0 +y_0=0 +datum=WGS84 +units=m +no_defs"
    )


def buffer_geojson_geometry(geometry, radius_meters):
    """
    输入：
        geometry: WGS84 GeoJSON geometry
        radius_meters: 缓冲区半径，单位 m，可正、可负、可 0

    输出：
        WGS84 GeoJSON geometry

    规则对齐原始版本：
        1. 正缓冲：点、线、面都允许
        2. 0 缓冲：只允许 Polygon / MultiPolygon
        3. 负缓冲：只允许 Polygon / MultiPolygon
    """

    if geometry is None:
        raise ValueError("缺少 geometry")

    try:
        radius_meters = float(radius_meters)
    except Exception:
        raise ValueError("缓冲区半径不是合法数字")

    if not math.isfinite(radius_meters):
        raise ValueError("缓冲区半径不是合法数字")

    geom = shape(geometry)

    if geom.is_empty:
        raise ValueError("geometry 为空")

    geom_type = geom.geom_type

    if radius_meters == 0:
        if geom_type not in ("Polygon", "MultiPolygon"):
            raise ValueError("点或线作为研究对象时，缓冲区半径必须大于 0")

        return mapping(geom)

    if radius_meters < 0 and geom_type not in ("Polygon", "MultiPolygon"):
        raise ValueError("点或线不支持负缓冲区")

    if not geom.is_valid and geom_type in ("Polygon", "MultiPolygon"):
        geom = geom.buffer(0)

    local_crs = _build_local_aeqd_crs(geom)

    to_local = Transformer.from_crs("EPSG:4326", local_crs, always_xy=True).transform
    to_wgs84 = Transformer.from_crs(local_crs, "EPSG:4326", always_xy=True).transform

    local_geom = transform(to_local, geom)

    buffered = local_geom.buffer(radius_meters, resolution=64)

    if buffered.is_empty:
        raise ValueError("缓冲区结果为空，可能半径为负且已超出当前研究区范围")

    buffered = _extract_polygonal(buffered)

    if buffered.is_empty:
        raise ValueError("缓冲区结果为空，请检查输入是否合法")

    wgs84_buffered = transform(to_wgs84, buffered)

    return mapping(wgs84_buffered)