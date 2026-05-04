const PI = Math.PI
const A = 6378245.0
const EE = 0.00669342162296594323

function outOfChina(lng, lat) {
    return lng < 72.004 || lng > 137.8347 || lat < 0.8293 || lat > 55.8271
}

function transformLat(lng, lat) {
    let ret = -100.0 + 2.0 * lng + 3.0 * lat + 0.2 * lat * lat + 0.1 * lng * lat + 0.2 * Math.sqrt(Math.abs(lng))

    ret += ((20.0 * Math.sin(6.0 * lng * PI) + 20.0 * Math.sin(2.0 * lng * PI)) * 2.0) / 3.0

    ret += ((20.0 * Math.sin(lat * PI) + 40.0 * Math.sin((lat / 3.0) * PI)) * 2.0) / 3.0

    ret += ((160.0 * Math.sin((lat / 12.0) * PI) + 320 * Math.sin((lat * PI) / 30.0)) * 2.0) / 3.0

    return ret
}

function transformLng(lng, lat) {
    let ret = 300.0 + lng + 2.0 * lat + 0.1 * lng * lng + 0.1 * lng * lat + 0.1 * Math.sqrt(Math.abs(lng))

    ret += ((20.0 * Math.sin(6.0 * lng * PI) + 20.0 * Math.sin(2.0 * lng * PI)) * 2.0) / 3.0

    ret += ((20.0 * Math.sin(lng * PI) + 40.0 * Math.sin((lng / 3.0) * PI)) * 2.0) / 3.0

    ret += ((150.0 * Math.sin((lng / 12.0) * PI) + 300.0 * Math.sin((lng / 30.0) * PI)) * 2.0) / 3.0

    return ret
}

export function wgs84ToGcj02Point(point) {
    const [lng, lat] = point

    if (outOfChina(lng, lat)) {
        return [lng, lat]
    }

    let dLat = transformLat(lng - 105.0, lat - 35.0)
    let dLng = transformLng(lng - 105.0, lat - 35.0)

    const radLat = (lat / 180.0) * PI
    let magic = Math.sin(radLat)
    magic = 1 - EE * magic * magic

    const sqrtMagic = Math.sqrt(magic)

    dLat = (dLat * 180.0) / (((A * (1 - EE)) / (magic * sqrtMagic)) * PI)
    dLng = (dLng * 180.0) / ((A / sqrtMagic) * Math.cos(radLat) * PI)

    return [lng + dLng, lat + dLat]
}

export function gcj02ToWgs84Point(point) {
    const [lng, lat] = point

    if (outOfChina(lng, lat)) {
        return [lng, lat]
    }

    const [gcjLng, gcjLat] = wgs84ToGcj02Point([lng, lat])

    return [lng * 2 - gcjLng, lat * 2 - gcjLat]
}

function convertCoordinates(coords, pointConverter) {
    if (typeof coords[0] === 'number') {
        return pointConverter(coords)
    }

    return coords.map(item => convertCoordinates(item, pointConverter))
}

export function convertGeometry(geometry, pointConverter) {
    if (!geometry) {
        return null
    }

    return {
        ...geometry,
        coordinates: convertCoordinates(geometry.coordinates, pointConverter)
    }
}

export function convertGeojson(geojson, pointConverter) {
    if (!geojson) {
        return null
    }

    if (geojson.type === 'FeatureCollection') {
        return {
            ...geojson,
            features: geojson.features.map(feature => ({
                ...feature,
                geometry: convertGeometry(feature.geometry, pointConverter)
            }))
        }
    }

    if (geojson.type === 'Feature') {
        return {
            ...geojson,
            geometry: convertGeometry(geojson.geometry, pointConverter)
        }
    }

    return convertGeometry(geojson, pointConverter)
}
