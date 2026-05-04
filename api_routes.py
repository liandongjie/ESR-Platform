import os
import uuid
import shutil
import datetime

from flask import Blueprint, jsonify, request

from backend_config import indicators, tifs
from report_service import create_report_task
from vector_service import shapefile_zip_to_geojson
from buffer_service import buffer_geojson_geometry

api_bp = Blueprint("api", __name__, url_prefix="/api")


def get_time_str(style="datetime"):
    cur_time = datetime.datetime.now()
    date_str = cur_time.strftime("%y%m%d")
    time_str = cur_time.strftime("%H%M%S")

    if style == "date":
        return date_str
    if style == "time":
        return time_str
    return date_str + "T" + time_str


@api_bp.route("/health", methods=["GET"])
def api_health():
    return jsonify({
        "code": 200,
        "message": "ok",
        "data": {
            "service": "ESR Platform Backend"
        }
    })


@api_bp.route("/indicators", methods=["GET"])
def api_indicators():
    data = []

    for key, name in indicators.items():
        if key == "esr":
            continue

        data.append({
            "key": key,
            "name": name,
            "tif": tifs.get(key)
        })

    return jsonify({
        "code": 200,
        "message": "success",
        "data": data
    })


@api_bp.route("/report", methods=["POST"])
def api_report():
    try:
        data = request.get_json(silent=True)

        if data is None:
            return jsonify({
                "code": 400,
                "message": "请求体必须是 JSON",
                "data": None
            }), 400

        geometry = data.get("geometry")
        weights = data.get("weights")

        result = create_report_task(
            geometry=geometry,
            weights=weights,
            time_str=get_time_str(style="datetime")
        )

        return jsonify({
            "code": 200,
            "message": "success",
            "data": result
        })

    except ValueError as err:
        return jsonify({
            "code": 400,
            "message": str(err),
            "data": None
        }), 400

    except Exception as err:
        return jsonify({
            "code": 500,
            "message": str(err),
            "data": None
        }), 500


@api_bp.route("/geometry/buffer_geojson", methods=["POST"])
def api_buffer_geojson():
    try:
        data = request.get_json(silent=True)

        if data is None:
            return jsonify({
                "code": 400,
                "message": "请求体必须是 JSON",
                "data": None
            }), 400

        geometry = data.get("geometry") or data.get("geojson")
        radius = data.get("buffer", data.get("radius", 0))

        buffer_geometry = buffer_geojson_geometry(
            geometry=geometry,
            radius_meters=radius
        )

        buffer_geojson = {
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "properties": {
                        "source": "buffer",
                        "buffer": radius
                    },
                    "geometry": buffer_geometry
                }
            ]
        }

        return jsonify({
            "code": 200,
            "message": "success",
            "data": {
                "geometry": buffer_geometry,
                "geojson": buffer_geojson
            }
        })

    except ValueError as err:
        return jsonify({
            "code": 400,
            "message": str(err),
            "data": None
        }), 400

    except Exception as err:
        return jsonify({
            "code": 500,
            "message": str(err),
            "data": None
        }), 500        
        
@api_bp.route("/vector/shp-to-geojson", methods=["POST"])
def api_shp_to_geojson():
    task_dir = None

    try:
        vecfile = request.files.get("vecfile")

        if vecfile is None:
            return jsonify({
                "code": 400,
                "message": "缺少 vecfile 文件",
                "data": None
            }), 400

        if vecfile.filename == "":
            return jsonify({
                "code": 400,
                "message": "上传文件名为空",
                "data": None
            }), 400

        if not vecfile.filename.lower().endswith(".zip"):
            return jsonify({
                "code": 400,
                "message": "请上传 Shapefile 的 zip 压缩包",
                "data": None
            }), 400

        task_id = get_time_str(style="datetime") + "_" + uuid.uuid4().hex[:8]

        upload_root = "./static/shp/"
        os.makedirs(upload_root, exist_ok=True)

        task_dir = os.path.join(upload_root, task_id)
        os.makedirs(task_dir, exist_ok=True)

        zip_path = os.path.join(task_dir, vecfile.filename)
        vecfile.save(zip_path)

        result = shapefile_zip_to_geojson(zip_path)

        return jsonify({
            "code": 200,
            "message": "success",
            "data": {
                "taskId": task_id,
                "geojson": result["geojson"],
                "featureCount": result["featureCount"],
                "crs": result["crs"]
            }
        })

    except Exception as err:
        return jsonify({
            "code": 500,
            "message": str(err),
            "data": None
        }), 500

    finally:
        if task_dir is not None and os.path.exists(task_dir):
            shutil.rmtree(task_dir, ignore_errors=True)