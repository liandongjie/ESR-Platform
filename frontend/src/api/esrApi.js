const API_BASE = ''

async function request(path, options = {}) {
    const response = await fetch(`${API_BASE}${path}`, options)
    const text = await response.text()

    let data

    try {
        data = text ? JSON.parse(text) : null
    } catch {
        throw new Error(`接口返回的不是 JSON，HTTP ${response.status}，请检查后端路由：${path}`)
    }

    if (!response.ok || data.code !== 200) {
        throw new Error(data?.message || '请求失败')
    }

    return data.data
}

export function getIndicators() {
    return request('/api/indicators')
}

export function uploadShapefile(file) {
    const formData = new FormData()
    formData.append('vecfile', file)

    return request('/api/vector/shp-to-geojson', {
        method: 'POST',
        body: formData
    })
}

export function createReport(payload) {
    return request('/api/report', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    })
}

export function getDownloadUrl(downloadUrl) {
    return downloadUrl
}

export function createBuffer(payload) {
    return request('/api/geometry/buffer_geojson', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    })
}
