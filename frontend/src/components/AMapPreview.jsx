import { useEffect, useRef, useState } from 'react';
import AMapLoader from '@amap/amap-jsapi-loader';
import riskPoints from '../data/riskPoints';
function AMapPreview({
    geojson,
    mapStyle,
    measureMode,
    measureClearSignal,
    searchKeyword,
    searchSignal,
    searchClearSignal,
    studyDrawMode,
    studyClearSignal,
    onSearchKeywordChange,
    onMeasureModeChange,
    onStudyObjectChange,
    onGeometryChange,
    poiKeyword,
    poiSearchSignal,
    poiClearSignal,
    poiDownloadSignal,
    onPoiStatusChange,
    studyPlaceKeyword,
    studyPlaceSearchSignal,
    studySelectedPlace,
    studySelectedPlaceSignal,
    onStudyPlaceResultsChange,
    onStudyPlaceStatusChange,
    
    // districtKeyword,
    // districtLevel,
    // districtSearchSignal,
    // districtResults,
    // selectedDistrict,
    // selectedDistrictSignal,
    // onDistrictResultsChange,
    selectedProvinceForDistrict,
    selectedCityForDistrict,
    selectedAdministrativeDistrict,
    selectedAdministrativeDistrictSignal,
    onProvinceOptionsChange,
    onCityOptionsChange,
    onCountyOptionsChange,
    onDistrictStatusChange,
    showRiskPoints,

    coordLocatePoint,
    coordLocateSignal,
}) {
    const containerRef = useRef(null);
    const mapRef = useRef(null);
    const amapRef = useRef(null);
    const mouseToolRef = useRef(null);
    const overlaysRef = useRef([]);
    const activeToolRef = useRef(null);
    const callbackRef = useRef(onGeometryChange);
    const placeSearchRef = useRef(null);
    // const geocoderRef = useRef(null);
    const searchMarkerRef = useRef(null);
    const searchInfoWindowRef = useRef(null);
    const autoCompleteRef = useRef(null);
    const keywordChangeRef = useRef(onSearchKeywordChange);
    const studyOverlayRef = useRef([]);
    const poiSearchRef = useRef(null);
    // const studyOverlayRef = useRef([]);
    const studyObjectCallbackRef = useRef(onStudyObjectChange);
    const [mapReady, setMapReady] = useState(false);

    const [showSatellite, setShowSatellite] = useState(false);
    const [showTraffic, setShowTraffic] = useState(false);

    const studyPlaceMarkerRef = useRef(null);
    const studyPlaceInfoWindowRef = useRef(null);

    const districtOverlayRef = useRef([]);

    const riskPointOverlaysRef = useRef([]);
    const riskPointTimerRef = useRef(null);

    const satelliteLayerRef = useRef(null);
    const roadNetLayerRef = useRef(null);
    const trafficLayerRef = useRef(null);

    const coordMarkerRef = useRef(null);
    const coordInfoWindowRef = useRef(null);

    useEffect(() => {
        keywordChangeRef.current = onSearchKeywordChange;
    }, [onSearchKeywordChange]);

    useEffect(() => {
        callbackRef.current = onGeometryChange;
    }, [onGeometryChange]);

    useEffect(() => {
        const securityCode = import.meta.env.VITE_AMAP_SECURITY_CODE;

        if (securityCode) {
            window._AMapSecurityConfig = {
                securityJsCode: securityCode,
            };
        }

        AMapLoader.load({
            key: import.meta.env.VITE_AMAP_KEY,
            version: '2.0',
            plugins: [
                'AMap.MouseTool',
                'AMap.AutoComplete',
                'AMap.PlaceSearch',
                'AMap.DistrictSearch',
                'AMap.ToolBar',
            ],
        })
            .then((AMap) => {
                if (!containerRef.current || mapRef.current) {
                    return;
                }

                amapRef.current = AMap;

                const map = new AMap.Map(containerRef.current, {
                    zoom: 10,
                    center: [113.05, 34.05],
                    viewMode: '2D',
                    mapStyle: `amap://styles/${mapStyle || 'macaron'}`,
                });

                mapRef.current = map;

                map.addControl(
                    new AMap.ToolBar({
                        position: {
                            top: '18px',
                            left: '18px',
                        },
                        liteStyle: false,
                        locate: false,
                        noIpLocate: true,
                    })
                );

                satelliteLayerRef.current = new AMap.TileLayer.Satellite();
                roadNetLayerRef.current = new AMap.TileLayer.RoadNet();
                trafficLayerRef.current = new AMap.TileLayer.Traffic({
                    zIndex: 20,
                });

                const mouseTool = new AMap.MouseTool(map);
                mouseToolRef.current = mouseTool;

                poiSearchRef.current = new AMap.PlaceSearch({
                    type:
                        '汽车服务|汽车销售|汽车维修|摩托车服务|' +
                        '餐饮服务|购物服务|生活服务|体育休闲服务|' +
                        '医疗保健服务|住宿服务|风景名胜|商务住宅|' +
                        '政府机构及社会团体|科教文化服务|交通设施服务|' +
                        '金融保险服务|公司企业|道路附属设施|地名地址信息|公共设施',
                    pageSize: 5,
                    pageIndex: 1,
                    extensions: 'all',
                    map,
                    panel: 'poi-result-panel',
                    autoFitView: true,
                });

                const clearSearchResult = () => {
                    if (placeSearchRef.current && typeof placeSearchRef.current.clear === 'function') {
                        placeSearchRef.current.clear();
                    }

                    if (searchMarkerRef.current) {
                        map.remove(searchMarkerRef.current);
                        searchMarkerRef.current = null;
                    }

                    if (searchInfoWindowRef.current) {
                        searchInfoWindowRef.current.close();
                        searchInfoWindowRef.current = null;
                    }
                };

                const normalizePoint = (point) => {
                    if (!point) {
                        return null;
                    }

                    if (Array.isArray(point)) {
                        return point;
                    }

                    if (typeof point.getLng === 'function') {
                        return [point.getLng(), point.getLat()];
                    }

                    if (point.lng !== undefined && point.lat !== undefined) {
                        return [point.lng, point.lat];
                    }

                    return null;
                };

                const locateSinglePoi = (poi) => {
                    const position = normalizePoint(poi.location);

                    if (!position) {
                        return false;
                    }

                    clearSearchResult();

                    const marker = new AMap.Marker({
                        position,
                        title: poi.name,
                        anchor: 'bottom-center',
                    });

                    const infoWindow = new AMap.InfoWindow({
                        content: `<div class="search-info-window">${poi.name || ''}<br />${poi.district || poi.address || ''}</div>`,
                        offset: new AMap.Pixel(0, -32),
                    });

                    map.add(marker);
                    searchMarkerRef.current = marker;
                    searchInfoWindowRef.current = infoWindow;

                    map.setZoomAndCenter(16, position);
                    infoWindow.open(map, position);

                    return true;
                };

                const searchSelectedPoi = (poi) => {
                    if (!poi || !poi.name) {
                        alert('未找到该地址或地点');
                        return;
                    }

                    if (keywordChangeRef.current) {
                        keywordChangeRef.current(poi.name);
                    }

                    clearSearchResult();

                    const city = poi.adcode || poi.citycode || poi.district || '全国';

                    const placeSearch = new AMap.PlaceSearch({
                        city,
                        citylimit: city !== '全国',
                        pageSize: 10,
                        pageIndex: 1,
                        map,
                        autoFitView: true,
                    });

                    placeSearchRef.current = placeSearch;

                    placeSearch.search(poi.name, (status, result) => {
                        const pois = result?.poiList?.pois || [];

                        if (status === 'complete' && pois.length > 0) {
                            const exact =
                                pois.find((item) => item.id && poi.id && item.id === poi.id) ||
                                pois.find((item) => item.name === poi.name) ||
                                pois[0];

                            locateSinglePoi(exact);
                            return;
                        }

                        if (poi.location) {
                            locateSinglePoi(poi);
                            return;
                        }

                        alert('未找到该地址或地点');
                    });
                };

                const autoComplete = new AMap.AutoComplete({
                    city: '全国',
                    input: 'amap-search-input',
                });

                autoCompleteRef.current = autoComplete;

                AMap.Event.addListener(autoComplete, 'select', (event) => {
                    searchSelectedPoi(event.poi);
                });

                placeSearchRef.current = new AMap.PlaceSearch({
                    city: '全国',
                    pageSize: 10,
                    pageIndex: 1,
                });

                // geocoderRef.current = new AMap.Geocoder({
                //     city: '全国',
                // });

                mouseTool.on('draw', (event) => {
                    if (activeToolRef.current === 'study-draw') {
                        const overlay = event.obj;
                        const geometry = overlayToStudyGeometry(overlay);

                        if (!geometry) {
                            activeToolRef.current = null;
                            mouseTool.close(false);
                            return;
                        }

                        studyOverlayRef.current.push(overlay);

                        const nextGeojson = {
                            type: 'FeatureCollection',
                            features: [
                                {
                                    type: 'Feature',
                                    properties: {
                                        source: 'study-draw',
                                    },
                                    geometry,
                                },
                            ],
                        };

                        mouseTool.close(false);
                        activeToolRef.current = null;

                        if (studyObjectCallbackRef.current) {
                            studyObjectCallbackRef.current(geometry, nextGeojson, {
                                source: '在线绘制',
                                name: geometry.type,
                            });
                        }

                        return;
                    }

                    if (activeToolRef.current !== 'draw-polygon') {
                        activeToolRef.current = null;

                        if (onMeasureModeChange) {
                            onMeasureModeChange('none');
                        }

                        return;
                    }

                    const polygon = event.obj;
                    const path = polygon.getPath();

                    const coordinates = path.map((point) => {
                        if (typeof point.getLng === 'function') {
                            return [point.getLng(), point.getLat()];
                        }

                        return [point.lng, point.lat];
                    });

                    if (coordinates.length > 0) {
                        const first = coordinates[0];
                        const last = coordinates[coordinates.length - 1];

                        if (first[0] !== last[0] || first[1] !== last[1]) {
                            coordinates.push(first);
                        }
                    }

                    const geometry = {
                        type: 'Polygon',
                        coordinates: [coordinates],
                    };

                    const nextGeojson = {
                        type: 'FeatureCollection',
                        features: [
                            {
                                type: 'Feature',
                                properties: {
                                    source: 'draw',
                                },
                                geometry,
                            },
                        ],
                    };

                    map.remove(polygon);
                    mouseTool.close(false);
                    activeToolRef.current = null;

                    if (callbackRef.current) {
                        callbackRef.current(geometry, nextGeojson);
                    }
                });

                setMapReady(true);
            })
            .catch((err) => {
                console.error('高德地图加载失败:', err);
            });

        return () => {
            if (mouseToolRef.current) {
                mouseToolRef.current.close(true);
                mouseToolRef.current = null;
            }

            if (mapRef.current) {
                mapRef.current.destroy();
                mapRef.current = null;
            }
        };
    }, []);

    // useEffect(() => {
    //     if (!mapReady || !mapRef.current || !amapRef.current) {
    //         return;
    //     }

    //     const AMap = amapRef.current;
    //     const map = mapRef.current;

    //     if (overlaysRef.current.length > 0) {
    //         map.remove(overlaysRef.current);
    //         overlaysRef.current = [];
    //     }

    //     if (!geojson) {
    //         return;
    //     }

    //     const polygons = buildPolygonsFromGeoJSON(geojson, AMap);

    //     if (polygons.length === 0) {
    //         console.warn('没有可绘制的 Polygon/MultiPolygon:', geojson);
    //         return;
    //     }

    //     map.add(polygons);
    //     overlaysRef.current = polygons;
    //     map.setFitView(polygons, false, [40, 40, 40, 40]);
    // }, [geojson, mapReady]);

    useEffect(() => {
        if (!mapReady || !mapRef.current || !amapRef.current) {
            return;
        }

        const AMap = amapRef.current;
        const map = mapRef.current;

        if (overlaysRef.current.length > 0) {
            map.remove(overlaysRef.current);
            overlaysRef.current = [];
        }

        if (!geojson) {
            clearStudyAreaGraphics();
            return;
        }

        const polygons = buildPolygonsFromGeoJSON(geojson, AMap);

        if (polygons.length === 0) {
            console.warn('没有可绘制的 Polygon/MultiPolygon:', geojson);
            return;
        }

        map.add(polygons);
        overlaysRef.current = polygons;
        map.setFitView(polygons, false, [40, 40, 40, 40]);
    }, [geojson, mapReady]);

    useEffect(() => {
        if (
            !mapReady ||
            !autoCompleteRef.current ||
            !searchKeyword ||
            !searchKeyword.trim()
        ) {
            return;
        }

        const keyword = searchKeyword.trim();

        autoCompleteRef.current.search(keyword, (status, result) => {
            const tips = (result?.tips || []).filter((tip) => {
                return tip && tip.name && tip.name !== '[]';
            });

            if (status === 'complete' && tips.length > 0) {
                const exact =
                    tips.find((tip) => tip.name === keyword) ||
                    tips.find((tip) => tip.name.includes(keyword)) ||
                    tips[0];

                if (!exact) {
                    alert('未找到该地址或地点');
                    return;
                }

                const AMap = amapRef.current;
                const map = mapRef.current;

                const clearSearchResult = () => {
                    if (placeSearchRef.current && typeof placeSearchRef.current.clear === 'function') {
                        placeSearchRef.current.clear();
                    }

                    if (searchMarkerRef.current) {
                        map.remove(searchMarkerRef.current);
                        searchMarkerRef.current = null;
                    }

                    if (searchInfoWindowRef.current) {
                        searchInfoWindowRef.current.close();
                        searchInfoWindowRef.current = null;
                    }
                };

                const normalizePoint = (point) => {
                    if (!point) {
                        return null;
                    }

                    if (Array.isArray(point)) {
                        return point;
                    }

                    if (typeof point.getLng === 'function') {
                        return [point.getLng(), point.getLat()];
                    }

                    if (point.lng !== undefined && point.lat !== undefined) {
                        return [point.lng, point.lat];
                    }

                    return null;
                };

                const locateSinglePoi = (poi) => {
                    const position = normalizePoint(poi.location);

                    if (!position) {
                        return false;
                    }

                    clearSearchResult();

                    const marker = new AMap.Marker({
                        position,
                        title: poi.name,
                        anchor: 'bottom-center',
                    });

                    const infoWindow = new AMap.InfoWindow({
                        content: `<div class="search-info-window">${poi.name || ''}<br />${poi.district || poi.address || ''}</div>`,
                        offset: new AMap.Pixel(0, -32),
                    });

                    map.add(marker);
                    searchMarkerRef.current = marker;
                    searchInfoWindowRef.current = infoWindow;

                    map.setZoomAndCenter(16, position);
                    infoWindow.open(map, position);

                    return true;
                };

                const city = exact.adcode || exact.citycode || exact.district || '全国';

                clearSearchResult();

                const placeSearch = new AMap.PlaceSearch({
                    city,
                    citylimit: city !== '全国',
                    pageSize: 10,
                    pageIndex: 1,
                    map,
                    autoFitView: true,
                });

                placeSearchRef.current = placeSearch;

                placeSearch.search(exact.name, (searchStatus, searchResult) => {
                    const pois = searchResult?.poiList?.pois || [];

                    if (searchStatus === 'complete' && pois.length > 0) {
                        const target =
                            pois.find((item) => item.id && exact.id && item.id === exact.id) ||
                            pois.find((item) => item.name === exact.name) ||
                            pois[0];

                        locateSinglePoi(target);
                        return;
                    }

                    if (exact.location) {
                        locateSinglePoi(exact);
                        return;
                    }

                    alert('未找到该地址或地点');
                });

                return;
            }

            alert('未找到该地址或地点');
        });
    }, [searchSignal, mapReady]);

    useEffect(() => {
        if (!mapReady || !mapRef.current) {
            return;
        }

        const map = mapRef.current;

        if (placeSearchRef.current && typeof placeSearchRef.current.clear === 'function') {
            placeSearchRef.current.clear();
        }

        if (searchMarkerRef.current) {
            map.remove(searchMarkerRef.current);
            searchMarkerRef.current = null;
        }

        if (searchInfoWindowRef.current) {
            searchInfoWindowRef.current.close();
            searchInfoWindowRef.current = null;
        }
    }, [searchClearSignal, mapReady]);

    useEffect(() => {
        if (!mapReady || !mouseToolRef.current) {
            return;
        }

        const mouseTool = mouseToolRef.current;

        if (measureMode === 'distance') {
            mouseTool.close(false);
            activeToolRef.current = 'measure-distance';

            mouseTool.rule({
                lineOptions: {
                    strokeColor: '#1e88e5',
                    strokeWeight: 3,
                    strokeOpacity: 0.95,
                },
                startMarkerOptions: {
                    content:
                        '<div class="measure-node-marker measure-node-start"></div>',
                    offset: new window.AMap.Pixel(-6, -6),
                },
                endMarkerOptions: {
                    content:
                        '<div class="measure-node-marker measure-node-end"></div>',
                    offset: new window.AMap.Pixel(-6, -6),
                },
                midMarkerOptions: {
                    content:
                        '<div class="measure-node-marker measure-node-mid"></div>',
                    offset: new window.AMap.Pixel(-6, -6),
                },
            });

            return;
        }

        if (measureMode === 'area') {
            mouseTool.close(false);
            activeToolRef.current = 'measure-area';

            mouseTool.measureArea({
                strokeColor: '#006dcc',
                strokeWeight: 3,
                strokeOpacity: 0.9,
                fillColor: '#4096ff',
                fillOpacity: 0.25,
                zIndex: 120,
            });

            return;
        }

        if (activeToolRef.current === 'measure-distance' || activeToolRef.current === 'measure-area') {
            mouseTool.close(false);
            activeToolRef.current = null;
        }
    }, [measureMode, mapReady]);

    useEffect(() => {
        if (!mapReady || !mouseToolRef.current) {
            return;
        }

        mouseToolRef.current.close(true);
        activeToolRef.current = null;
    }, [measureClearSignal, mapReady]);

    useEffect(() => {
        if (!mapReady || !mapRef.current) {
            return;
        }

        mapRef.current.setMapStyle(`amap://styles/${mapStyle || 'macaron'}`);
    }, [mapStyle, mapReady]);

    // useEffect(() => {
    //     if (!mapReady || !mapRef.current || !mouseToolRef.current) {
    //         return;
    //     }

    //     mouseToolRef.current.close(false);
    //     activeToolRef.current = null;

    //     if (studyOverlayRef.current.length > 0) {
    //         mapRef.current.remove(studyOverlayRef.current);
    //         studyOverlayRef.current = [];
    //     }
    // }, [studyClearSignal, mapReady]);

    useEffect(() => {
        if (!mapReady || !amapRef.current || !mapRef.current) {
            return;
        }

        if (!poiSearchSignal) {
            return;
        }

        const keyword = String(poiKeyword || '').trim();

        if (!keyword) {
            onPoiStatusChange?.('请输入兴趣点关键词');
            return;
        }

        const polygons = getPoiSearchPolygons();

        if (polygons.length === 0) {
            onPoiStatusChange?.('请先生成缓冲区后再进行兴趣点分析');
            return;
        }

        const AMap = amapRef.current;
        const map = mapRef.current;

        const placeSearch = new AMap.PlaceSearch({
            type:
                '汽车服务|汽车销售|汽车维修|摩托车服务|' +
                '餐饮服务|购物服务|生活服务|体育休闲服务|' +
                '医疗保健服务|住宿服务|风景名胜|商务住宅|' +
                '政府机构及社会团体|科教文化服务|交通设施服务|' +
                '金融保险服务|公司企业|道路附属设施|地名地址信息|公共设施',
            pageSize: 5,
            pageIndex: 1,
            extensions: 'all',
            map,
            panel: 'poi-result-panel',
            autoFitView: true,
        });

        poiSearchRef.current = placeSearch;

        placeSearch.searchInBounds(keyword, polygons[0], (status, result) => {
            if (status === 'complete') {
                const count = result?.poiList?.count ?? result?.poiList?.pois?.length ?? 0;
                onPoiStatusChange?.(`搜索完成，共找到 ${count} 条相关兴趣点`);
                return;
            }

            onPoiStatusChange?.('未搜索到相关兴趣点');
        });
    }, [poiSearchSignal, mapReady]);

    useEffect(() => {
        if (!mapReady) {
            return;
        }

        if (poiSearchRef.current && typeof poiSearchRef.current.clear === 'function') {
            poiSearchRef.current.clear();
        }

        const panel = document.getElementById('poi-result-panel');

        if (panel) {
            panel.innerHTML = '';
        }

        onPoiStatusChange?.('');
    }, [poiClearSignal, mapReady]);

    useEffect(() => {
        if (!mapReady || !amapRef.current) {
            return;
        }

        if (!poiDownloadSignal) {
            return;
        }

        const keyword = String(poiKeyword || '').trim();

        if (!keyword) {
            onPoiStatusChange?.('请输入兴趣点关键词');
            return;
        }

        const polygons = getPoiSearchPolygons();

        if (polygons.length === 0) {
            onPoiStatusChange?.('请先生成缓冲区后再下载兴趣点数据');
            return;
        }

        const AMap = amapRef.current;
        const allPois = [];
        const poiIdSet = new Set();

        const searchPage = (pageIndex) => {
            const placeSearch = new AMap.PlaceSearch({
                type:
                    '汽车服务|汽车销售|汽车维修|摩托车服务|' +
                    '餐饮服务|购物服务|生活服务|体育休闲服务|' +
                    '医疗保健服务|住宿服务|风景名胜|商务住宅|' +
                    '政府机构及社会团体|科教文化服务|交通设施服务|' +
                    '金融保险服务|公司企业|道路附属设施|地名地址信息|公共设施',
                pageSize: 50,
                pageIndex,
                extensions: 'all',
                autoFitView: false,
            });

            placeSearch.searchInBounds(keyword, polygons[0], (status, result) => {
                if (status !== 'complete') {
                    if (allPois.length === 0) {
                        onPoiStatusChange?.('未搜索到可下载的兴趣点数据');
                        return;
                    }

                    downloadPoiCsv(allPois);
                    onPoiStatusChange?.(`下载完成，共导出 ${allPois.length} 条兴趣点数据`);
                    return;
                }

                const pois = result?.poiList?.pois || [];

                pois.forEach((poi) => {
                    const id = poi.id || `${poi.name}-${poi.location?.lng}-${poi.location?.lat}`;

                    if (!poiIdSet.has(id)) {
                        poiIdSet.add(id);
                        allPois.push(poi);
                    }
                });

                const total = result?.poiList?.count || allPois.length;
                const maxPage = Math.ceil(total / 50);

                onPoiStatusChange?.(`正在下载兴趣点数据：第 ${pageIndex} / ${maxPage} 页`);

                if (pageIndex >= maxPage || pois.length === 0) {
                    downloadPoiCsv(allPois);
                    onPoiStatusChange?.(`下载完成，共导出 ${allPois.length} 条兴趣点数据`);
                    return;
                }

                searchPage(pageIndex + 1);
            });
        };

        searchPage(1);
    }, [poiDownloadSignal, mapReady]);

    useEffect(() => {
        studyObjectCallbackRef.current = onStudyObjectChange;
    }, [onStudyObjectChange]);

    useEffect(() => {
        if (!mapReady || !mouseToolRef.current) {
            return;
        }

        if (!studyDrawMode || studyDrawMode === 'none') {
            return;
        }

        const mouseTool = mouseToolRef.current;

        mouseTool.close(false);
        activeToolRef.current = 'study-draw';

        if (onMeasureModeChange) {
            onMeasureModeChange('none');
        }

        if (studyDrawMode === 'point') {
            mouseTool.marker({
                anchor: 'bottom-center',
                draggable: false,
            });
            return;
        }

        if (studyDrawMode === 'polyline') {
            mouseTool.polyline({
                strokeColor: '#0ccfff',
                strokeWeight: 3,
                strokeOpacity: 1,
                zIndex: 130,
            });
            return;
        }

        if (studyDrawMode === 'rectangle') {
            mouseTool.rectangle({
                strokeColor: '#0091ea',
                strokeWeight: 2,
                strokeOpacity: 0.95,
                fillColor: '#80d8ff',
                fillOpacity: 0.28,
                zIndex: 130,
            });
            return;
        }

        if (studyDrawMode === 'polygon') {
            mouseTool.polygon({
                strokeColor: '#0091ea',
                strokeWeight: 2,
                strokeOpacity: 0.95,
                fillColor: '#80d8ff',
                fillOpacity: 0.28,
                zIndex: 130,
            });
        }
    }, [studyDrawMode, mapReady]);

    // useEffect(() => {
    //     if (!mapReady || !mapRef.current || !mouseToolRef.current) {
    //         return;
    //     }

    //     mouseToolRef.current.close(false);
    //     activeToolRef.current = null;

    //     if (studyOverlayRef.current.length > 0) {
    //         mapRef.current.remove(studyOverlayRef.current);
    //         studyOverlayRef.current = [];
    //     }

    //     if (studyPlaceMarkerRef.current) {
    //         mapRef.current.remove(studyPlaceMarkerRef.current);
    //         studyPlaceMarkerRef.current = null;
    //     }

    //     if (studyPlaceInfoWindowRef.current) {
    //         studyPlaceInfoWindowRef.current.close();
    //         studyPlaceInfoWindowRef.current = null;
    //     }
        
    //     if (districtOverlayRef.current.length > 0) {
    //         mapRef.current.remove(districtOverlayRef.current);
    //         districtOverlayRef.current = [];
    //     }

    //     // clearRiskPointOverlays();
    // }, [studyClearSignal, mapReady]);

    useEffect(() => {
        if (!mapReady || !mapRef.current) {
            return;
        }

        clearStudyAreaGraphics();
    }, [studyClearSignal, mapReady]);

    useEffect(() => {
        if (
            !mapReady ||
            !amapRef.current ||
            !studyPlaceSearchSignal
        ) {
            return;
        }

        const keyword = String(studyPlaceKeyword || '').trim();

        if (!keyword) {
            onStudyPlaceStatusChange?.('请输入要查找的地址或地点');
            onStudyPlaceResultsChange?.([]);
            return;
        }

        const AMap = amapRef.current;

        const placeSearch = new AMap.PlaceSearch({
            city: '全国',
            citylimit: false,
            pageSize: 10,
            pageIndex: 1,
            extensions: 'all',
        });

        placeSearch.search(keyword, (status, result) => {
            const pois = result?.poiList?.pois || [];

            if (status !== 'complete' || pois.length === 0) {
                onStudyPlaceStatusChange?.('未找到匹配地点');
                onStudyPlaceResultsChange?.([]);
                return;
            }

            const results = pois
                .map((poi) => {
                    const location = normalizeAmapPoint(poi.location);

                    if (!location) {
                        return null;
                    }

                    return {
                        id: poi.id || `${poi.name}-${location[0]}-${location[1]}`,
                        name: poi.name || keyword,
                        type: poi.type || '',
                        typecode: poi.typecode || '',
                        address: poi.address || '',
                        pname: poi.pname || '',
                        cityname: poi.cityname || '',
                        adname: poi.adname || '',
                        adcode: poi.adcode || '',
                        district: [poi.pname, poi.cityname, poi.adname]
                            .filter(Boolean)
                            .join(''),
                        location,
                    };
                })
                .filter(Boolean);

            onStudyPlaceResultsChange?.(results);
            onStudyPlaceStatusChange?.(`找到 ${results.length} 个地点，请选择一个作为研究对象`);
        });
    }, [studyPlaceSearchSignal, mapReady]);

    useEffect(() => {
        if (
            !mapReady ||
            !mapRef.current ||
            !amapRef.current ||
            !studySelectedPlaceSignal ||
            !studySelectedPlace
        ) {
            return;
        }

        const AMap = amapRef.current;
        const map = mapRef.current;

        const position = normalizeAmapPoint(studySelectedPlace.location);

        if (!position) {
            onStudyPlaceStatusChange?.('所选地点没有有效坐标');
            return;
        }

        if (studyPlaceMarkerRef.current) {
            map.remove(studyPlaceMarkerRef.current);
            studyPlaceMarkerRef.current = null;
        }

        if (studyPlaceInfoWindowRef.current) {
            studyPlaceInfoWindowRef.current.close();
            studyPlaceInfoWindowRef.current = null;
        }

        const marker = new AMap.Marker({
            position,
            title: studySelectedPlace.name,
            anchor: 'bottom-center',
        });

        const infoWindow = new AMap.InfoWindow({
            content: `
                <div class="search-info-window">
                    <strong>${studySelectedPlace.name || ''}</strong><br />
                    ${studySelectedPlace.district || ''}${studySelectedPlace.address || ''}
                </div>
            `,
            offset: new AMap.Pixel(0, -32),
        });

        map.add(marker);
        studyPlaceMarkerRef.current = marker;
        studyPlaceInfoWindowRef.current = infoWindow;

        map.setZoomAndCenter(16, position);
        infoWindow.open(map, position);

        const geometry = {
            type: 'Point',
            coordinates: position,
        };

        const nextGeojson = {
            type: 'FeatureCollection',
            features: [
                {
                    type: 'Feature',
                    properties: {
                        source: 'study-place-search',
                        id: studySelectedPlace.id,
                        name: studySelectedPlace.name,
                        type: studySelectedPlace.type,
                        address: studySelectedPlace.address,
                        adcode: studySelectedPlace.adcode,
                    },
                    geometry,
                },
            ],
        };

        if (studyObjectCallbackRef.current) {
            studyObjectCallbackRef.current(geometry, nextGeojson, {
                source: '查找地址或地点',
                name: studySelectedPlace.name,
                properties: {
                    id: studySelectedPlace.id,
                    type: studySelectedPlace.type,
                    address: studySelectedPlace.address,
                    adcode: studySelectedPlace.adcode,
                },
            });
        }

        onStudyPlaceStatusChange?.(`已选择：${studySelectedPlace.name}`);
    }, [studySelectedPlaceSignal, mapReady]);

    useEffect(() => {
        if (!mapReady || !mapRef.current) {
            return;
        }

        const map = mapRef.current;

        const handleViewportChange = () => {
            if (riskPointTimerRef.current) {
                clearTimeout(riskPointTimerRef.current);
            }

            riskPointTimerRef.current = setTimeout(() => {
                renderRiskPointsInView();
            }, 180);
        };

        renderRiskPointsInView();

        map.on('moveend', handleViewportChange);
        map.on('zoomend', handleViewportChange);

        return () => {
            map.off('moveend', handleViewportChange);
            map.off('zoomend', handleViewportChange);

            if (riskPointTimerRef.current) {
                clearTimeout(riskPointTimerRef.current);
                riskPointTimerRef.current = null;
            }
        };
    }, [showRiskPoints, mapReady]);

    useEffect(() => {
        if (!mapReady || !amapRef.current) {
            return;
        }

        const AMap = amapRef.current;

        const districtSearch = new AMap.DistrictSearch({
            level: 'country',
            subdistrict: 1,
            extensions: 'base',
            showbiz: false,
        });

        districtSearch.search('中国', (status, result) => {
            if (status !== 'complete') {
                onDistrictStatusChange?.('省级行政区加载失败');
                onProvinceOptionsChange?.([]);
                return;
            }

            const provinces = sortDistrictsByAdcode(
                getDistrictChildren(result)
                    .map(normalizeDistrictItem)
                    .filter(Boolean)
            );

            onProvinceOptionsChange?.(provinces);
        });
    }, [mapReady]);

    useEffect(() => {
        if (!mapReady || !amapRef.current || !selectedProvinceForDistrict) {
            onCityOptionsChange?.([]);
            onCountyOptionsChange?.([]);
            return;
        }

        const AMap = amapRef.current;

        const districtSearch = new AMap.DistrictSearch({
            level: 'province',
            subdistrict: 1,
            extensions: 'base',
            showbiz: false,
        });

        districtSearch.search(selectedProvinceForDistrict.name, (status, result) => {
            if (status !== 'complete') {
                onDistrictStatusChange?.('市级行政区加载失败');
                onCityOptionsChange?.([]);
                onCountyOptionsChange?.([]);
                return;
            }

            const children = sortDistrictsByAdcode(
                getDistrictChildren(result)
                    .map(normalizeDistrictItem)
                    .filter(Boolean)
            );

            // 北京、上海、天津、重庆等直辖市，接口常直接返回区县。
            // 这里把直辖市本身放到第二级，保持“省 → 市 → 区县”三级结构。
            if (children.length > 0 && children[0].level === 'district') {
                onCityOptionsChange?.([
                    {
                        ...selectedProvinceForDistrict,
                        level: 'city',
                    },
                ]);
                onCountyOptionsChange?.([]);
                onDistrictStatusChange?.('请选择市级行政区');
                return;
            }

            onCityOptionsChange?.(children);
            onCountyOptionsChange?.([]);
            onDistrictStatusChange?.(
                children.length > 0 ? '请选择市级行政区' : '未获取到市级行政区'
            );
        });
    }, [selectedProvinceForDistrict?.adcode, mapReady]);

    useEffect(() => {
        if (!mapReady || !amapRef.current || !selectedCityForDistrict) {
            onCountyOptionsChange?.([]);
            return;
        }

        const AMap = amapRef.current;

        const districtSearch = new AMap.DistrictSearch({
            level: 'city',
            subdistrict: 1,
            extensions: 'base',
            showbiz: false,
        });

        districtSearch.search(selectedCityForDistrict.name, (status, result) => {
            if (status !== 'complete') {
                onDistrictStatusChange?.('区县级行政区加载失败');
                onCountyOptionsChange?.([]);
                return;
            }

            const counties = sortDistrictsByAdcode(
                getDistrictChildren(result)
                    .map(normalizeDistrictItem)
                    .filter(Boolean)
            );

            onCountyOptionsChange?.(counties);
            onDistrictStatusChange?.(
                counties.length > 0 ? '请选择区县级行政区' : '未获取到区县级行政区'
            );
        });
    }, [selectedCityForDistrict?.adcode, mapReady]);

    useEffect(() => {
        if (
            !mapReady ||
            !mapRef.current ||
            !amapRef.current ||
            !selectedAdministrativeDistrictSignal ||
            !selectedAdministrativeDistrict
        ) {
            return;
        }

        const AMap = amapRef.current;
        const target = selectedAdministrativeDistrict;

        const districtSearch = new AMap.DistrictSearch({
            level: target.level || 'district',
            subdistrict: 0,
            extensions: 'all',
            showbiz: false,
        });

        districtSearch.search(target.name, (status, result) => {
            const list = result?.districtList || [];

            if (status !== 'complete' || list.length === 0) {
                onDistrictStatusChange?.('行政区边界加载失败');
                return;
            }

            const matched =
                list.find((item) => String(item.adcode) === String(target.adcode)) ||
                list[0];

            const normalizedDistrict = normalizeDistrictItem(matched);

            if (!normalizedDistrict) {
                onDistrictStatusChange?.('行政区数据无效');
                return;
            }

            const district = {
                ...normalizedDistrict,
                boundaries: matched.boundaries || [],
            };

            if (!district.boundaries || district.boundaries.length === 0) {
                onDistrictStatusChange?.('行政区没有可用边界');
                return;
            }

            const geometry = buildDistrictGeometry(district.boundaries);

            if (!geometry) {
                onDistrictStatusChange?.('行政区边界无效');
                return;
            }

            drawDistrictBoundary(district);

            const nextGeojson = {
                type: 'FeatureCollection',
                features: [
                    {
                        type: 'Feature',
                        properties: {
                            source: 'district-cascade',
                            name: district.name,
                            level: district.level,
                            adcode: district.adcode,
                            citycode: district.citycode,
                        },
                        geometry,
                    },
                ],
            };

            if (studyObjectCallbackRef.current) {
                studyObjectCallbackRef.current(geometry, nextGeojson, {
                    source: '选择行政区',
                    name: district.name,
                    properties: {
                        level: district.level,
                        adcode: district.adcode,
                        citycode: district.citycode,
                    },
                });
            }

            onDistrictStatusChange?.(`已选择：${district.name}`);
        });
    }, [selectedAdministrativeDistrictSignal, mapReady]);

    useEffect(() => {
        if (!mapReady || !mapRef.current) {
            return;
        }

        const map = mapRef.current;

        if (showSatellite) {
            if (satelliteLayerRef.current) {
                map.add(satelliteLayerRef.current);
            }

            if (roadNetLayerRef.current) {
                map.add(roadNetLayerRef.current);
            }
        } else {
            if (satelliteLayerRef.current) {
                map.remove(satelliteLayerRef.current);
            }

            if (roadNetLayerRef.current) {
                map.remove(roadNetLayerRef.current);
            }
        }
    }, [showSatellite, mapReady]);

    useEffect(() => {
        if (!mapReady || !mapRef.current) {
            return;
        }

        const map = mapRef.current;

        if (showTraffic) {
            if (trafficLayerRef.current) {
                trafficLayerRef.current.show();
                map.add(trafficLayerRef.current);
            }
        } else if (trafficLayerRef.current) {
            trafficLayerRef.current.hide();
            map.remove(trafficLayerRef.current);
        }
    }, [showTraffic, mapReady]);

    useEffect(() => {
        if (
            !mapReady ||
            !mapRef.current ||
            !amapRef.current ||
            !coordLocateSignal ||
            !coordLocatePoint
        ) {
            return;
        }

        const AMap = amapRef.current;
        const map = mapRef.current;
        const position = coordLocatePoint.position;

        if (
            !Array.isArray(position) ||
            !Number.isFinite(Number(position[0])) ||
            !Number.isFinite(Number(position[1]))
        ) {
            return;
        }

        if (coordMarkerRef.current) {
            map.remove(coordMarkerRef.current);
            coordMarkerRef.current = null;
        }

        if (coordInfoWindowRef.current) {
            coordInfoWindowRef.current.close();
            coordInfoWindowRef.current = null;
        }

        const marker = new AMap.Marker({
            position,
            title: coordLocatePoint.name || '输入坐标',
            anchor: 'bottom-center',
        });

        const infoWindow = new AMap.InfoWindow({
            content: `
                <div class="search-info-window">
                    <strong>输入坐标</strong><br />
                    ${coordLocatePoint.name || ''}
                </div>
            `,
            offset: new AMap.Pixel(0, -32),
        });

        map.add(marker);
        coordMarkerRef.current = marker;
        coordInfoWindowRef.current = infoWindow;

        map.setZoomAndCenter(16, position);
        infoWindow.open(map, position);
    }, [coordLocateSignal, mapReady]);

    const boundaryPointToArray = (point) => {
        if (!point) {
            return null;
        }

        if (Array.isArray(point)) {
            return [Number(point[0]), Number(point[1])];
        }

        if (typeof point.getLng === 'function') {
            return [Number(point.getLng()), Number(point.getLat())];
        }

        if (point.lng !== undefined && point.lat !== undefined) {
            return [Number(point.lng), Number(point.lat)];
        }

        return null;
    };

    const normalizeDistrictItem = (item) => {
        if (!item || !item.name) {
            return null;
        }

        return {
            name: item.name,
            level: item.level,
            adcode: item.adcode,
            citycode: item.citycode,
            center: item.center ? boundaryPointToArray(item.center) : null,
            boundaries: item.boundaries || [],
        };
    };

    const sortDistrictsByAdcode = (list) => {
        return [...list].sort((a, b) => {
            const adcodeA = Number(a.adcode);
            const adcodeB = Number(b.adcode);

            if (Number.isFinite(adcodeA) && Number.isFinite(adcodeB)) {
                return adcodeA - adcodeB;
            }

            return String(a.adcode || '').localeCompare(String(b.adcode || ''));
        });
    };

    const getDistrictChildren = (result) => {
        const root = result?.districtList?.[0];

        if (root?.districtList && root.districtList.length > 0) {
            return root.districtList;
        }

        if (result?.districtList && result.districtList.length > 1) {
            return result.districtList;
        }

        return [];
    };

    const parseBoundary = (boundary) => {
        if (!boundary) {
            return [];
        }

        if (typeof boundary === 'string') {
            return boundary
                .split(';')
                .map((item) => {
                    const [lng, lat] = item.split(',').map(Number);
                    return [lng, lat];
                })
                .filter((point) => Number.isFinite(point[0]) && Number.isFinite(point[1]));
        }

        if (Array.isArray(boundary)) {
            return boundary
                .map(boundaryPointToArray)
                .filter((point) => point && Number.isFinite(point[0]) && Number.isFinite(point[1]));
        }

        return [];
    };

    const closePolygonRing = (ring) => {
        if (!ring || ring.length === 0) {
            return ring;
        }

        const first = ring[0];
        const last = ring[ring.length - 1];

        if (first[0] !== last[0] || first[1] !== last[1]) {
            return [...ring, first];
        }

        return ring;
    };

    const buildDistrictGeometry = (boundaries) => {
        const rings = (boundaries || [])
            .map(parseBoundary)
            .map(closePolygonRing)
            .filter((ring) => ring.length >= 4);

        if (rings.length === 0) {
            return null;
        }

        if (rings.length === 1) {
            return {
                type: 'Polygon',
                coordinates: [rings[0]],
            };
        }

        return {
            type: 'MultiPolygon',
            coordinates: rings.map((ring) => [ring]),
        };
    };

    const drawDistrictBoundary = (district) => {
        if (!mapRef.current || !amapRef.current || !district?.boundaries) {
            return null;
        }

        const AMap = amapRef.current;
        const map = mapRef.current;

        if (districtOverlayRef.current.length > 0) {
            map.remove(districtOverlayRef.current);
            districtOverlayRef.current = [];
        }

        const polygons = district.boundaries
            .map((boundary) => {
                const path = parseBoundary(boundary);

                if (path.length < 3) {
                    return null;
                }

                return new AMap.Polygon({
                    path,
                    strokeColor: '#0091ea',
                    strokeWeight: 2,
                    strokeOpacity: 0.95,
                    fillColor: '#80d8ff',
                    fillOpacity: 0.28,
                    zIndex: 125,
                });
            })
            .filter(Boolean);

        if (polygons.length === 0) {
            return null;
        }

        map.add(polygons);
        districtOverlayRef.current = polygons;
        map.setFitView(polygons);

        return polygons;
    };

    const startDrawPolygon = () => {
        if (!mouseToolRef.current) {
            return;
        }

        if (onMeasureModeChange) {
            onMeasureModeChange('none');
        }

        mouseToolRef.current.close(false);
        activeToolRef.current = 'draw-polygon';

        mouseToolRef.current.polygon({
            strokeColor: '#ff4d00',
            strokeWeight: 4,
            strokeOpacity: 1,
            fillColor: '#ff9f43',
            fillOpacity: 0.35,
            zIndex: 100,
        });
    };

    const clearGeometry = () => {
        if (mouseToolRef.current) {
            mouseToolRef.current.close(false);
        }

        activeToolRef.current = null;

        if (onMeasureModeChange) {
            onMeasureModeChange('none');
        }

        if (mapRef.current && overlaysRef.current.length > 0) {
            mapRef.current.remove(overlaysRef.current);
            overlaysRef.current = [];
        }

        if (callbackRef.current) {
            callbackRef.current(null, null);
        }
    };

    // const pointToArray = (point) => {
    //     if (typeof point.getLng === 'function') {
    //         return [point.getLng(), point.getLat()];
    //     }

    //     return [point.lng, point.lat];
    // };

    const overlayToGeometry = (overlay) => {
        if (typeof overlay.getPosition === 'function') {
            const point = overlay.getPosition();

            return {
                type: 'Point',
                coordinates: pointToArray(point),
            };
        }

        if (typeof overlay.getPath === 'function') {
            const path = overlay.getPath();
            const coordinates = path.map(pointToArray);

            const className = overlay.CLASS_NAME || '';

            if (className.includes('Polyline')) {
                return {
                    type: 'LineString',
                    coordinates,
                };
            }

            if (coordinates.length > 0) {
                const first = coordinates[0];
                const last = coordinates[coordinates.length - 1];

                if (first[0] !== last[0] || first[1] !== last[1]) {
                    coordinates.push(first);
                }
            }

            return {
                type: 'Polygon',
                coordinates: [coordinates],
            };
        }

        return null;
    };

    const getPoiSearchPolygons = () => {
        return overlaysRef.current
            .filter((overlay) => overlay && typeof overlay.getPath === 'function')
            .map((polygon) => buildPoiSearchPolygon(polygon))
            .filter(Boolean);
    };

    const formatPoiCell = (value) => {
        if (value === undefined || value === null) {
            return '';
        }

        if (Array.isArray(value)) {
            return value.join('|');
        }

        return String(value);
    };

    const downloadPoiCsv = (pois) => {
        const header = [
            'id',
            'name',
            'type',
            'typecode',
            'address',
            'lon_gcj02',
            'lat_gcj02',
            'tel',
            'website',
            'pcode',
            'pname',
            'citycode',
            'cityname',
            'adcode',
            'adname',
            'entr_lon_gcj02',
            'entr_lat_gcj02',
            'business_area',
            'alias',
        ];

        const rows = pois.map((poi) => [
            poi.id,
            poi.name,
            poi.type,
            poi.typecode,
            poi.address,
            poi.location?.lng,
            poi.location?.lat,
            poi.tel,
            poi.website,
            poi.pcode,
            poi.pname,
            poi.citycode,
            poi.cityname,
            poi.adcode,
            poi.adname,
            poi.entr_location?.lng || '',
            poi.entr_location?.lat || '',
            poi.business_area,
            poi.alias,
        ]);

        const csv = [header, ...rows]
            .map((row) =>
                row
                    .map((cell) =>
                        `"${formatPoiCell(cell).replace(/"/g, '""')}"`
                    )
                    .join(',')
            )
            .join('\n');

        const blob = new Blob(['\ufeff' + csv], {
            type: 'text/csv;charset=utf-8;',
        });

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');

        const timeText = new Date()
            .toISOString()
            .replace(/[-:]/g, '')
            .slice(0, 15);

        a.href = url;
        a.download = `POI数据-${timeText}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        URL.revokeObjectURL(url);
    };

    const getPointLngLat = (point) => {
        if (!point) {
            return null;
        }

        if (Array.isArray(point)) {
            return [Number(point[0]), Number(point[1])];
        }

        if (typeof point.getLng === 'function') {
            return [Number(point.getLng()), Number(point.getLat())];
        }

        if (point.lng !== undefined && point.lat !== undefined) {
            return [Number(point.lng), Number(point.lat)];
        }

        return null;
    };

    const getDistanceToSegment = (point, start, end) => {
        const [x, y] = point;
        const [x1, y1] = start;
        const [x2, y2] = end;

        const dx = x2 - x1;
        const dy = y2 - y1;

        if (dx === 0 && dy === 0) {
            return Math.hypot(x - x1, y - y1);
        }

        const t = Math.max(
            0,
            Math.min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy))
        );

        const projX = x1 + t * dx;
        const projY = y1 + t * dy;

        return Math.hypot(x - projX, y - projY);
    };

    const simplifyDouglasPeucker = (points, tolerance) => {
        if (points.length <= 2) {
            return points;
        }

        let maxDistance = 0;
        let index = 0;

        const start = points[0];
        const end = points[points.length - 1];

        for (let i = 1; i < points.length - 1; i += 1) {
            const distance = getDistanceToSegment(points[i], start, end);

            if (distance > maxDistance) {
                index = i;
                maxDistance = distance;
            }
        }

        if (maxDistance > tolerance) {
            const left = simplifyDouglasPeucker(points.slice(0, index + 1), tolerance);
            const right = simplifyDouglasPeucker(points.slice(index), tolerance);

            return [...left.slice(0, -1), ...right];
        }

        return [start, end];
    };

    const closeRing = (points) => {
        if (points.length === 0) {
            return points;
        }

        const first = points[0];
        const last = points[points.length - 1];

        if (first[0] !== last[0] || first[1] !== last[1]) {
            return [...points, first];
        }

        return points;
    };

    const simplifyPolygonPath = (path, maxPoints = 80) => {
        let points = path
            .map(getPointLngLat)
            .filter((point) => point && Number.isFinite(point[0]) && Number.isFinite(point[1]));

        if (points.length <= maxPoints) {
            return closeRing(points);
        }

        const first = points[0];
        const last = points[points.length - 1];

        if (first[0] === last[0] && first[1] === last[1]) {
            points = points.slice(0, -1);
        }

        let tolerance = 0.0002;
        let simplified = points;

        while (simplified.length > maxPoints && tolerance <= 0.05) {
            simplified = simplifyDouglasPeucker(points, tolerance);
            tolerance *= 1.6;
        }

        if (simplified.length > maxPoints) {
            const step = Math.ceil(simplified.length / maxPoints);
            simplified = simplified.filter((_, index) => index % step === 0);
        }

        return closeRing(simplified);
    };

    const buildPoiSearchPolygon = (polygon) => {
        if (!amapRef.current) {
            return null;
        }

        const AMap = amapRef.current;
        const path = polygon.getPath();

        const simplifiedPath = simplifyPolygonPath(path, 80);

        if (simplifiedPath.length < 4) {
            return null;
        }

        return new AMap.Polygon({
            path: simplifiedPath,
        });
    };

    const pointToArray = (point) => {
        if (!point) {
            return null;
        }

        if (typeof point.getLng === 'function') {
            return [point.getLng(), point.getLat()];
        }

        return [point.lng, point.lat];
    };

    const rectangleToPolygonGeometry = (rectangle) => {
        const bounds = rectangle.getBounds();

        if (!bounds) {
            return null;
        }

        const southWest = bounds.getSouthWest();
        const northEast = bounds.getNorthEast();

        const west = southWest.getLng();
        const south = southWest.getLat();
        const east = northEast.getLng();
        const north = northEast.getLat();

        return {
            type: 'Polygon',
            coordinates: [[
                [west, south],
                [east, south],
                [east, north],
                [west, north],
                [west, south],
            ]],
        };
    };

    const overlayToStudyGeometry = (overlay) => {
        if (!overlay) {
            return null;
        }

        if (typeof overlay.getPosition === 'function') {
            const point = overlay.getPosition();

            return {
                type: 'Point',
                coordinates: pointToArray(point),
            };
        }

        if (
            typeof overlay.getBounds === 'function' &&
            String(overlay.CLASS_NAME || '').includes('Rectangle')
        ) {
            return rectangleToPolygonGeometry(overlay);
        }

        if (typeof overlay.getPath === 'function') {
            const path = overlay.getPath();
            const coordinates = path
                .map(pointToArray)
                .filter(Boolean);

            const className = String(overlay.CLASS_NAME || '');

            if (className.includes('Polyline')) {
                return {
                    type: 'LineString',
                    coordinates,
                };
            }

            if (coordinates.length > 0) {
                const first = coordinates[0];
                const last = coordinates[coordinates.length - 1];

                if (first[0] !== last[0] || first[1] !== last[1]) {
                    coordinates.push(first);
                }
            }

            return {
                type: 'Polygon',
                coordinates: [coordinates],
            };
        }

        return null;
    };

    const normalizeAmapPoint = (point) => {
        if (!point) {
            return null;
        }

        if (Array.isArray(point)) {
            return [Number(point[0]), Number(point[1])];
        }

        if (typeof point.getLng === 'function') {
            return [Number(point.getLng()), Number(point.getLat())];
        }

        if (point.lng !== undefined && point.lat !== undefined) {
            return [Number(point.lng), Number(point.lat)];
        }

        return null;
    };

    const selectPointAsStudyObject = (point, meta = {}) => {
        if (!mapRef.current || !amapRef.current) {
            return;
        }

        const position = normalizeAmapPoint(point);

        if (!position || !Number.isFinite(position[0]) || !Number.isFinite(position[1])) {
            alert('未找到有效坐标');
            return;
        }

        const AMap = amapRef.current;
        const map = mapRef.current;

        if (searchMarkerRef.current) {
            map.remove(searchMarkerRef.current);
            searchMarkerRef.current = null;
        }

        const marker = new AMap.Marker({
            position,
            title: meta.name || '研究对象',
            anchor: 'bottom-center',
        });

        map.add(marker);
        searchMarkerRef.current = marker;

        map.setZoomAndCenter(16, position);

        const geometry = {
            type: 'Point',
            coordinates: position,
        };

        const nextGeojson = {
            type: 'FeatureCollection',
            features: [
                {
                    type: 'Feature',
                    properties: {
                        source: meta.source || 'place-search',
                        ...meta.properties,
                    },
                    geometry,
                },
            ],
        };

        if (studyObjectCallbackRef.current) {
            studyObjectCallbackRef.current(geometry, nextGeojson, {
                source: meta.source || '查找地址或地点',
                name: meta.name || '地点',
                properties: meta.properties || {},
            });
        }
    };

    const clearRiskPointOverlays = () => {
        if (!mapRef.current) {
            return;
        }

        if (riskPointOverlaysRef.current.length > 0) {
            mapRef.current.remove(riskPointOverlaysRef.current);
            riskPointOverlaysRef.current = [];
        }
    };

    const clearStudyAreaGraphics = () => {
        if (!mapRef.current) {
            return;
        }

        const map = mapRef.current;

        if (mouseToolRef.current) {
            mouseToolRef.current.close(true);
        }

        activeToolRef.current = null;

        if (overlaysRef.current.length > 0) {
            map.remove(overlaysRef.current);
            overlaysRef.current = [];
        }

        if (studyOverlayRef.current.length > 0) {
            map.remove(studyOverlayRef.current);
            studyOverlayRef.current = [];
        }

        if (districtOverlayRef.current.length > 0) {
            map.remove(districtOverlayRef.current);
            districtOverlayRef.current = [];
        }

        if (studyPlaceMarkerRef.current) {
            map.remove(studyPlaceMarkerRef.current);
            studyPlaceMarkerRef.current = null;
        }

        if (studyPlaceInfoWindowRef.current) {
            studyPlaceInfoWindowRef.current.close();
            studyPlaceInfoWindowRef.current = null;
        }

        if (searchMarkerRef.current) {
            map.remove(searchMarkerRef.current);
            searchMarkerRef.current = null;
        }

        if (searchInfoWindowRef.current) {
            searchInfoWindowRef.current.close();
            searchInfoWindowRef.current = null;
        }

        if (placeSearchRef.current && typeof placeSearchRef.current.clear === 'function') {
            placeSearchRef.current.clear();
        }

        if (poiSearchRef.current && typeof poiSearchRef.current.clear === 'function') {
            poiSearchRef.current.clear();
        }

        const poiPanel = document.getElementById('poi-result-panel');

        if (poiPanel) {
            poiPanel.innerHTML = '';
        }

        if (coordMarkerRef.current) {
            map.remove(coordMarkerRef.current);
            coordMarkerRef.current = null;
        }

        if (coordInfoWindowRef.current) {
            coordInfoWindowRef.current.close();
            coordInfoWindowRef.current = null;
        }
    };

    const isRiskPointInBounds = (point, bounds, AMap) => {
        const lng = Number(point.A_LON);
        const lat = Number(point.A_LAT);

        if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
            return false;
        }

        return bounds.contains(new AMap.LngLat(lng, lat));
    };

    const renderRiskPointsInView = () => {
        if (!mapReady || !mapRef.current || !amapRef.current) {
            return;
        }

        const AMap = amapRef.current;
        const map = mapRef.current;

        clearRiskPointOverlays();

        if (!showRiskPoints) {
            return;
        }

        const bounds = map.getBounds();
        const zoom = map.getZoom();

        // 缩放太小时不显示，防止全国尺度一次性渲染太多点
        if (zoom < 6) {
            return;
        }

        const visibleRiskPoints = riskPoints
            .filter((point) => isRiskPointInBounds(point, bounds, AMap))
            .slice(0, 600);

        const overlays = visibleRiskPoints.map((point) => {
            const position = [Number(point.A_LON), Number(point.A_LAT)];

            const marker = new AMap.CircleMarker({
                center: position,
                radius: 5,
                strokeColor: '#ff6f91',
                strokeWeight: 1,
                strokeOpacity: 0.9,
                fillColor: '#ff8fab',
                fillOpacity: 0.85,
                zIndex: 140,
            });

            marker.on('click', () => {
                const geometry = {
                    type: 'Point',
                    coordinates: position,
                };

                const nextGeojson = {
                    type: 'FeatureCollection',
                    features: [
                        {
                            type: 'Feature',
                            properties: {
                                source: 'risk-point',
                                ...point,
                            },
                            geometry,
                        },
                    ],
                };

                const infoWindow = new AMap.InfoWindow({
                    content: `
                        <div class="risk-point-info">
                            <strong>${point.PROJ_NAME || '风险点'}</strong><br />
                            ${point.PROJ_TIME ? `${point.PROJ_TIME}年<br />` : ''}
                            ${point.a_address || point.gps_address || ''}
                        </div>
                    `,
                    offset: new AMap.Pixel(0, -10),
                });

                infoWindow.open(map, position);

                if (studyObjectCallbackRef.current) {
                    studyObjectCallbackRef.current(geometry, nextGeojson, {
                        source: '风险点',
                        name: point.PROJ_NAME || '风险点',
                        properties: point,
                    });
                }
            });

            return marker;
        });

        if (overlays.length > 0) {
            map.add(overlays);
            riskPointOverlaysRef.current = overlays;
        }
    };

    return (
        <div className="map-preview-wrap">
            <div className="map-layer-switch">
                <button
                    type="button"
                    className={showSatellite ? 'active' : ''}
                    onClick={() => setShowSatellite((prev) => !prev)}
                >
                    卫星
                </button>

                <button
                    type="button"
                    className={showTraffic ? 'active' : ''}
                    onClick={() => setShowTraffic((prev) => !prev)}
                >
                    路况
                </button>
            </div>

            <div className="map-container" ref={containerRef}></div>
        </div>
    );
}

function buildPolygonsFromGeoJSON(geojson, AMap) {
    const polygons = [];

    const features =
        geojson.type === 'FeatureCollection'
            ? geojson.features
            : [{ type: 'Feature', geometry: geojson, properties: {} }];

    features.forEach((feature) => {
        const geometry = feature.geometry;

        if (!geometry) {
            return;
        }

        if (geometry.type === 'Polygon') {
            const polygon = createPolygon(geometry.coordinates, AMap);
            if (polygon) {
                polygons.push(polygon);
            }
        }

        if (geometry.type === 'MultiPolygon') {
            geometry.coordinates.forEach((polygonCoords) => {
                const polygon = createPolygon(polygonCoords, AMap);
                if (polygon) {
                    polygons.push(polygon);
                }
            });
        }
    });

    return polygons;
}

function createPolygon(coordinates, AMap) {
    if (!coordinates || !coordinates[0]) {
        return null;
    }

    const outerRing = coordinates[0].map((point) => [point[0], point[1]]);

    return new AMap.Polygon({
        path: outerRing,
        strokeColor: '#ff4d00',
        strokeWeight: 4,
        strokeOpacity: 1,
        fillColor: '#ff9f43',
        fillOpacity: 0.35,
        zIndex: 100,
    });
}

export default AMapPreview;