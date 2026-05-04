import { useEffect, useState } from 'react';

import HeaderBar from './components/HeaderBar';
import Toolbar from './components/Toolbar';
import FloatingWindow from './components/FloatingWindow';
import AMapPreview from './components/AMapPreview';
import UploadPanel from './components/UploadPanel';
import EsrWindowContent from './components/EsrWindowContent';
import AnalysisObjectWindow from './components/AnalysisObjectWindow';
import PoiWindowContent from './components/PoiWindowContent';

import {
    createReport,
    getIndicators,
    uploadShapefile,
} from './api/esrApi';

import {
    convertGeometry,
    convertGeojson,
    gcj02ToWgs84Point,
    wgs84ToGcj02Point,
} from './utils/coordTransform';

import './App.css';

function App() {
    const [indicators, setIndicators] = useState([]);
    const [weights, setWeights] = useState({
        PM25: 30,
        AQI: 40,
        NDVI: 30,
    });
    const [selectedKeys, setSelectedKeys] = useState(['PM25', 'AQI', 'NDVI']);

    const [geometry, setGeometry] = useState(null);
    const [geojson, setGeojson] = useState(null);
    const [vectorInfo, setVectorInfo] = useState(null);
    const [currentBuffer, setCurrentBuffer] = useState(null);

    const [studyObject, setStudyObject] = useState(null);
    const [showObjectWindow, setShowObjectWindow] = useState(false);
    const [studyDrawMode, setStudyDrawMode] = useState('none');
    const [studyClearSignal, setStudyClearSignal] = useState(0);

    const [studyAreaMode, setStudyAreaMode] = useState('draw');

    const [coordLng, setCoordLng] = useState('');
    const [coordLat, setCoordLat] = useState('');
    const [coordLocatePoint, setCoordLocatePoint] = useState(null);
    const [coordLocateSignal, setCoordLocateSignal] = useState(0);

    const [studyPlaceKeyword, setStudyPlaceKeyword] = useState('');
    const [studyPlaceSearchSignal, setStudyPlaceSearchSignal] = useState(0);
    const [studyPlaceResults, setStudyPlaceResults] = useState([]);
    const [studyPlaceStatus, setStudyPlaceStatus] = useState('');
    const [studySelectedPlace, setStudySelectedPlace] = useState(null);
    const [studySelectedPlaceSignal, setStudySelectedPlaceSignal] = useState(0);

    const [provinceOptions, setProvinceOptions] = useState([]);
    const [cityOptions, setCityOptions] = useState([]);
    const [countyOptions, setCountyOptions] = useState([]);

    const [selectedProvinceAdcode, setSelectedProvinceAdcode] = useState('');
    const [selectedCityAdcode, setSelectedCityAdcode] = useState('');
    const [selectedCountyAdcode, setSelectedCountyAdcode] = useState('');

    const [districtStatus, setDistrictStatus] = useState('');
    const [selectedAdministrativeDistrict, setSelectedAdministrativeDistrict] = useState(null);
    const [selectedAdministrativeDistrictSignal, setSelectedAdministrativeDistrictSignal] = useState(0);

    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');

    const [currentTime, setCurrentTime] = useState('');
    const [showSelectWindow, setShowSelectWindow] = useState(true);
    const [showAnalysisWindow, setShowAnalysisWindow] = useState(false);
    const [showMeasureWindow, setShowMeasureWindow] = useState(false);
    const [showStyleWindow, setShowStyleWindow] = useState(false);

    const [showPoiWindow, setShowPoiWindow] = useState(false);
    const [poiKeyword, setPoiKeyword] = useState('');
    const [poiStatus, setPoiStatus] = useState('');
    const [poiSearchSignal, setPoiSearchSignal] = useState(0);
    const [poiClearSignal, setPoiClearSignal] = useState(0);
    const [poiDownloadSignal, setPoiDownloadSignal] = useState(0);

    const [searchKeyword, setSearchKeyword] = useState('');
    const [searchSignal, setSearchSignal] = useState(0);
    const [searchClearSignal, setSearchClearSignal] = useState(0);

    const [measureMode, setMeasureMode] = useState('none');
    const [measureClearSignal, setMeasureClearSignal] = useState(0);

    const [mapStyle, setMapStyle] = useState('macaron');

    const [showRiskPoints, setShowRiskPoints] = useState(false);

    const [measureWindowPosition, setMeasureWindowPosition] = useState(null);
    const [styleWindowPosition, setStyleWindowPosition] = useState(null);

    useEffect(() => {
        getIndicators()
            .then((data) => setIndicators(data))
            .catch((err) => setError(err.message));
    }, []);

    useEffect(() => {
        const updateTime = () => {
            const now = new Date();
            const weeks = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];

            const text =
                `${now.getFullYear()}年` +
                `${String(now.getMonth() + 1).padStart(2, '0')}月` +
                `${String(now.getDate()).padStart(2, '0')}日 ` +
                `${weeks[now.getDay()]} ` +
                `${String(now.getHours()).padStart(2, '0')}:` +
                `${String(now.getMinutes()).padStart(2, '0')}`;

            setCurrentTime(text);
        };

        updateTime();
        const timer = setInterval(updateTime, 60000);

        return () => clearInterval(timer);
    }, []);

    const resetStudyArea = () => {
        setStudyAreaMode('draw');
        setStudyDrawMode('none');
        setStudyClearSignal((prev) => prev + 1);
        setStudyObject(null);
        setGeometry(null);
        setGeojson(null);
        setVectorInfo(null);
        setResult(null);
        setShowObjectWindow(false);
        setShowAnalysisWindow(false);
        setError('');

        setStudyPlaceKeyword('');
        setStudyPlaceResults([]);
        setStudyPlaceStatus('');
        setStudySelectedPlace(null);

        setCityOptions([]);
        setCountyOptions([]);
        setSelectedProvinceAdcode('');
        setSelectedCityAdcode('');
        setSelectedCountyAdcode('');
        setDistrictStatus('');
        setSelectedAdministrativeDistrict(null);
        setCurrentBuffer(null);
    };

    const startStudyDraw = (mode) => {
        setError('');
        setStudyAreaMode('draw');
        setMeasureMode('none');

        setStudyDrawMode('none');

        setTimeout(() => {
            setStudyDrawMode(mode);
        }, 0);
    };

    const handleSelect = (key) => {
        setSelectedKeys((prev) => {
            if (prev.includes(key)) {
                return prev.filter((item) => item !== key);
            }

            setWeights((oldWeights) => ({
                ...oldWeights,
                [key]: oldWeights[key] ?? 0,
            }));

            return [...prev, key];
        });
    };

    const handleWeightChange = (key, value) => {
        const nextValue = String(value).trim();

        if (nextValue === '') {
            setWeights((prev) => ({
                ...prev,
                [key]: '',
            }));
            return;
        }

        if (!/^\d+(\.\d*)?$/.test(nextValue)) {
            return;
        }

        setWeights((prev) => ({
            ...prev,
            [key]: nextValue,
        }));
    };

    const getWeightValidation = () => {
        if (selectedKeys.length === 0) {
            return {
                valid: false,
                message: '请至少选择一个指标',
                totalWeight: 0,
            };
        }

        let totalWeight = 0;

        for (const key of selectedKeys) {
            const rawValue = weights[key];

            const value =
                rawValue === '' || rawValue === undefined || rawValue === null
                    ? 0
                    : Number(rawValue);

            if (!Number.isFinite(value)) {
                return {
                    valid: false,
                    message: `指标 ${key} 的权重不是合法数字`,
                    totalWeight,
                };
            }

            if (value < 0) {
                return {
                    valid: false,
                    message: `指标 ${key} 的权重不能小于 0`,
                    totalWeight,
                };
            }

            totalWeight += value;
        }

        if (Math.abs(totalWeight - 100) > 0.000001) {
            return {
                valid: false,
                message: `当前权重总和为 ${totalWeight}，必须等于 100`,
                totalWeight,
            };
        }

        return {
            valid: true,
            message: '',
            totalWeight,
        };
    };

    const handleUploadShp = async (event) => {
        setStudyAreaMode('vector');
        const file = event.target.files[0];

        if (!file) {
            return;
        }

        if (!file.name.toLowerCase().endsWith('.zip')) {
            setError('请上传 Shapefile 的 zip 压缩包');
            event.target.value = '';
            return;
        }

        setUploading(true);
        setError('');
        setGeometry(null);
        setGeojson(null);
        setVectorInfo(null);
        setStudyObject(null);
        setResult(null);
        setShowAnalysisWindow(false);

        try {
            const data = await uploadShapefile(file);
            const uploadedGeojson = data.geojson;

            if (!uploadedGeojson?.features || uploadedGeojson.features.length === 0) {
                throw new Error('GeoJSON 中没有有效要素');
            }

            const firstFeature = uploadedGeojson.features[0];
            const firstGeometry = firstFeature.geometry;

            if (!firstGeometry) {
                throw new Error('未读取到有效 geometry');
            }

            const amapGeojson = convertGeojson(
                uploadedGeojson,
                wgs84ToGcj02Point
            );

            setGeometry(null);
            setGeojson(amapGeojson);

            setStudyObject({
                source: '矢量文件',
                fileName: file.name,
                name: file.name,
                geometry: firstGeometry,
                properties: firstFeature.properties || {},
            });

            setVectorInfo({
                fileName: file.name,
                featureCount: data.featureCount,
                crs: data.crs,
                taskId: data.taskId,
            });

            setShowObjectWindow(true);
            setShowSelectWindow(true);
            setCurrentBuffer(null);
        } catch (err) {
            setError(err.message);
        } finally {
            setUploading(false);
            event.target.value = '';
        }
    };

    const handleMapGeometryChange = (nextGeometry, nextGeojson) => {
        setResult(null);
        setGeometry(null);

        if (!nextGeometry || !nextGeojson) {
            setStudyObject(null);
            setGeojson(null);
            setVectorInfo(null);
            setShowObjectWindow(false);
            return;
        }

        const wgs84Geometry = convertGeometry(
            nextGeometry,
            gcj02ToWgs84Point
        );

        setStudyObject({
            source: '在线绘制',
            name: '地图手动绘制',
            geometry: wgs84Geometry,
            properties: {},
        });

        setGeojson(nextGeojson);

        setVectorInfo({
            fileName: '在线绘制',
            featureCount: 1,
            crs: 'GCJ-02 → WGS84',
            taskId: 'manual-draw',
        });

        setShowObjectWindow(true);
        setShowSelectWindow(true);
    };

    const handleStudyObjectChange = (nextGeometry, nextGeojson, meta = {}) => {
        setResult(null);
        setGeometry(null);
        setCurrentBuffer(null);

        if (!nextGeometry || !nextGeojson) {
            setStudyObject(null);
            setGeojson(null);
            setVectorInfo(null);
            setShowObjectWindow(false);
            return;
        }

        const wgs84Geometry = convertGeometry(
            nextGeometry,
            gcj02ToWgs84Point
        );

        setStudyObject({
            source: meta.source || '在线绘制',
            name: meta.name || '地图选择对象',
            geometry: wgs84Geometry,
            properties: meta.properties || {},
        });

        setGeojson(nextGeojson);

        setVectorInfo({
            fileName: meta.source || '在线绘制',
            featureCount: 1,
            crs: 'GCJ-02 → WGS84',
            taskId: 'study-object',
        });

        setShowObjectWindow(true);
        setShowSelectWindow(true);
    };

    const handleUseCoordinate = () => {
        const lng = Number(coordLng);
        const lat = Number(coordLat);

        if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
            setError('请输入合法的经纬度');
            return;
        }

        if (lng < -180 || lng > 180 || lat < -90 || lat > 90) {
            setError('经纬度超出合法范围');
            return;
        }

        setError('');
        setStudyAreaMode('coord');

        const geometry = {
            type: 'Point',
            coordinates: [lng, lat],
        };

        const nextGeojson = {
            type: 'FeatureCollection',
            features: [
                {
                    type: 'Feature',
                    properties: {
                        source: 'coordinate-input',
                    },
                    geometry,
                },
            ],
        };

        handleStudyObjectChange(geometry, nextGeojson, {
            source: '输入坐标',
            name: `${lng}, ${lat}`,
        });

        setCoordLocatePoint({
            position: [lng, lat],
            name: `${lng}, ${lat}`,
        });

        setCoordLocateSignal((prev) => prev + 1);
    };

    const handleSearchStudyPlace = () => {
        if (!studyPlaceKeyword.trim()) {
            setError('请输入要查找的地址或地点');
            return;
        }

        setError('');
        setStudyPlaceStatus('正在搜索地点...');
        setStudyPlaceResults([]);
        setStudyPlaceSearchSignal((prev) => prev + 1);
    };

    const getDistrictByAdcode = (list, adcode) => {
        return list.find((item) => String(item.adcode) === String(adcode)) || null;
    };

    const handleProvinceChange = (adcode) => {
        setSelectedProvinceAdcode(adcode);
        setSelectedCityAdcode('');
        setSelectedCountyAdcode('');
        setCityOptions([]);
        setCountyOptions([]);
        setSelectedAdministrativeDistrict(null);
        setDistrictStatus(adcode ? '正在加载市级行政区...' : '');
    };

    const handleCityChange = (adcode) => {
        setSelectedCityAdcode(adcode);
        setSelectedCountyAdcode('');
        setCountyOptions([]);
        setSelectedAdministrativeDistrict(null);
        setDistrictStatus(adcode ? '正在加载区县级行政区...' : '');
    };

    const handleCountyChange = (adcode) => {
        setSelectedCountyAdcode(adcode);
        setSelectedAdministrativeDistrict(null);

        const county = getDistrictByAdcode(countyOptions, adcode);

        if (county) {
            setDistrictStatus(`已选择：${county.name}`);
        }
    };

    const handleConfirmAdministrativeDistrict = () => {
        const province = getDistrictByAdcode(provinceOptions, selectedProvinceAdcode);
        const city = getDistrictByAdcode(cityOptions, selectedCityAdcode);
        const county = getDistrictByAdcode(countyOptions, selectedCountyAdcode);

        const target = county || city || province;

        if (!target) {
            setError('请选择行政区');
            return;
        }

        setError('');
        setDistrictStatus(`正在加载边界：${target.name}`);
        setSelectedAdministrativeDistrict(target);
        setSelectedAdministrativeDistrictSignal((prev) => prev + 1);
    };

    const handleSelectStudyPlace = (place) => {
        setError('');
        setStudyPlaceStatus(`已选择：${place.name}`);
        setStudySelectedPlace(place);
        setStudySelectedPlaceSignal((prev) => prev + 1);
    };

    const handleBufferReady = (bufferResult) => {
        setCurrentBuffer(bufferResult);
        setGeometry(bufferResult.geometry);
        setGeojson(bufferResult.geojson);
        setResult(null);

        setVectorInfo((prev) => ({
            ...(prev || {}),
            fileName: `${studyObject?.source || '研究对象'}缓冲区`,
            featureCount: prev?.featureCount || 1,
            crs: prev?.crs || 'WGS84',
            taskId: prev?.taskId || 'buffer',
            bufferRadius: bufferResult.radius,
            bufferUnit: bufferResult.unit,
        }));
    };

    const handleCalculate = async () => {
        if (!geometry) {
            setError('请先选择研究对象，并在分析窗口中生成缓冲区');
            return false;
        }

        const validation = getWeightValidation();

        if (!validation.valid) {
            setError(validation.message);
            return false;
        }

        setLoading(true);
        setError('');
        setResult(null);

        const payload = {
            geometry,
            weights: selectedKeys.map((key) => ({
                key,
                weight: Number(weights[key] ?? 0),
            })),
        };

        try {
            const data = await createReport(payload);
            setResult(data);
            return true;
        } catch (err) {
            setError(err.message);
            return false;
        } finally {
            setLoading(false);
        }
    };

    const handleSearchPlace = () => {
        if (!searchKeyword.trim()) {
            setError('请输入要查找的地址或地点');
            return;
        }

        setError('');
        setSearchSignal((prev) => prev + 1);
    };

    const handleClearSearch = () => {
        setSearchKeyword('');
        setSearchClearSignal((prev) => prev + 1);
    };

    const handlePrintMap = () => {
        window.dispatchEvent(new Event('resize'));

        setTimeout(() => {
            window.print();
        }, 100);
    };

    const getWindowPosition = (type) => {
        const toolbarHeight = document.getElementById('toolbar_div')?.offsetHeight || 40;
        const headerHeight = document.getElementById('head_div')?.offsetHeight || 48;
        const top = headerHeight + toolbarHeight + 14;

        const widthMap = {
            select: 470,
            object: 380,
            analysis: 520,
            poi: 460,
            measure: 430,
            style: 280,
        };

        const width = widthMap[type] || 420;

        if (type === 'select') {
            return {
                left: 14,
                top,
                width,
            };
        }

        if (type === 'object') {
            return {
                left: Math.max(500, window.innerWidth - width - 18),
                top,
                width,
            };
        }

        if (type === 'analysis') {
            return {
                left: Math.max(520, window.innerWidth - width - 18),
                top,
                width,
            };
        }

        if (type === 'poi') {
            return {
                left: Math.max(520, window.innerWidth - width - 18),
                top: top + 40,
                width,
            };
        }

        return {
            left: Math.max(8, window.innerWidth - width - 18),
            top,
            width,
        };
    };

    const handleOpenPoiWindow = () => {
        if (!geometry) {
            setError('请先在分析窗口中生成缓冲区');
            return;
        }

        setError('');
        setPoiStatus('');
        setShowPoiWindow(true);
    };

    const handleSearchPoi = () => {
        if (!poiKeyword.trim()) {
            setPoiStatus('请输入兴趣点关键词');
            return;
        }

        setPoiStatus('正在搜索兴趣点...');
        setPoiSearchSignal((prev) => prev + 1);
    };

    const handleDownloadPoi = () => {
        if (!poiKeyword.trim()) {
            setPoiStatus('请输入兴趣点关键词');
            return;
        }

        setPoiStatus('正在下载兴趣点数据...');
        setPoiDownloadSignal((prev) => prev + 1);
    };

    const handleClearPoi = () => {
        setPoiStatus('');
        setPoiClearSignal((prev) => prev + 1);
    };

    const getToolbarAnchoredPosition = (selector, width) => {
        const el = document.querySelector(selector);
        const rect = el?.getBoundingClientRect();

        if (!rect) {
            return {
                left: Math.max(8, window.innerWidth - width - 16),
                top: 100,
                width,
            };
        }

        return {
            left: Math.max(8, rect.right - width),
            top: rect.bottom + 8,
            width,
        };
    };

    const toggleMeasureWindow = () => {
        setShowMeasureWindow((prev) => {
            const next = !prev;

            if (next) {
                setMeasureWindowPosition(
                    getToolbarAnchoredPosition('[data-toolbar-action="measure"]', 260)
                );
            }

            return next;
        });
    };

    const toggleStyleWindow = () => {
        setShowStyleWindow((prev) => {
            const next = !prev;

            if (next) {
                setStyleWindowPosition(
                    getToolbarAnchoredPosition('[data-toolbar-action="style"]', 230)
                );
            }

            return next;
        });
    };

    const selectedProvince = getDistrictByAdcode(
        provinceOptions,
        selectedProvinceAdcode
    );

    const selectedCity = getDistrictByAdcode(
        cityOptions,
        selectedCityAdcode
    );

    const selectedCounty = getDistrictByAdcode(
        countyOptions,
        selectedCountyAdcode
    );

    const selectedDistrictText =
        selectedCounty?.name ||
        selectedCity?.name ||
        selectedProvince?.name ||
        '';

    const weightValidation = getWeightValidation();

    return (
        <div className="legacy-page">
            <HeaderBar />

            <Toolbar
                currentTime={currentTime}
                searchKeyword={searchKeyword}
                onSearchKeywordChange={setSearchKeyword}
                onSearchPlace={handleSearchPlace}
                onClearSearch={handleClearSearch}
                onToggleSelectWindow={() => setShowSelectWindow((prev) => !prev)}
                onToggleMeasureWindow={toggleMeasureWindow}
                onToggleStyleWindow={toggleStyleWindow}
                onPrintMap={handlePrintMap}
            />

            <div id="main_div">
                <div id="map_div">
                    <AMapPreview
                        geojson={geojson}
                        mapStyle={mapStyle}
                        measureMode={measureMode}
                        measureClearSignal={measureClearSignal}
                        searchKeyword={searchKeyword}
                        searchSignal={searchSignal}
                        searchClearSignal={searchClearSignal}
                        studyDrawMode={studyDrawMode}
                        studyClearSignal={studyClearSignal}
                        onSearchKeywordChange={setSearchKeyword}
                        onMeasureModeChange={setMeasureMode}
                        onStudyObjectChange={handleStudyObjectChange}
                        onGeometryChange={handleMapGeometryChange}
                        poiKeyword={poiKeyword}
                        poiSearchSignal={poiSearchSignal}
                        poiClearSignal={poiClearSignal}
                        poiDownloadSignal={poiDownloadSignal}
                        onPoiStatusChange={setPoiStatus}

                        studyPlaceKeyword={studyPlaceKeyword}
                        studyPlaceSearchSignal={studyPlaceSearchSignal}
                        studySelectedPlace={studySelectedPlace}
                        studySelectedPlaceSignal={studySelectedPlaceSignal}
                        onStudyPlaceResultsChange={setStudyPlaceResults}
                        onStudyPlaceStatusChange={setStudyPlaceStatus}

                        selectedProvinceForDistrict={selectedProvince}
                        selectedCityForDistrict={selectedCity}
                        selectedAdministrativeDistrict={selectedAdministrativeDistrict}
                        selectedAdministrativeDistrictSignal={selectedAdministrativeDistrictSignal}
                        onProvinceOptionsChange={setProvinceOptions}
                        onCityOptionsChange={setCityOptions}
                        onCountyOptionsChange={setCountyOptions}
                        onDistrictStatusChange={setDistrictStatus}

                        showRiskPoints={showRiskPoints}

                        coordLocatePoint={coordLocatePoint}
                        coordLocateSignal={coordLocateSignal}
                    />
                </div>

                {showSelectWindow && (
                    <FloatingWindow
                        title="选择研究区域"
                        className="select-window"
                        initialPosition={getWindowPosition('select')}
                        onClose={() => setShowSelectWindow(false)}
                    >
                        <div className="legacy-section">
                            <div className="legacy-row">
                                <input
                                    type="checkbox"
                                    id="show-risk-point"
                                    checked={showRiskPoints}
                                    onChange={(e) => setShowRiskPoints(e.target.checked)}
                                />
                                <label htmlFor="show-risk-point">风险点</label>
                                <span className="hint-text">（仅显示当前地图视图范围内风险点）</span>
                            </div>

                            <div className="legacy-row">
                                <input
                                    type="radio"
                                    name="selectStudyArea"
                                    checked={studyAreaMode === 'draw'}
                                    onChange={() => setStudyAreaMode('draw')}
                                />
                                <span onClick={() => setStudyAreaMode('draw')}>在线绘制</span>
                            </div>

                            <div className="study-draw-tools">
                                <button
                                    type="button"
                                    className="legacy-button"
                                    onClick={() => startStudyDraw('point')}
                                >
                                    点
                                </button>

                                <button
                                    type="button"
                                    className="legacy-button"
                                    onClick={() => startStudyDraw('polyline')}
                                >
                                    线
                                </button>

                                <button
                                    type="button"
                                    className="legacy-button"
                                    onClick={() => startStudyDraw('rectangle')}
                                >
                                    矩形
                                </button>

                                <button
                                    type="button"
                                    className="legacy-button"
                                    onClick={() => startStudyDraw('polygon')}
                                >
                                    多边形
                                </button>

                                <button
                                    type="button"
                                    className="legacy-button"
                                    onClick={resetStudyArea}
                                >
                                    清除
                                </button>
                            </div>
                        </div>

                        <div className="legacy-section">
                            <div className="legacy-row">
                                <input
                                    type="radio"
                                    name="selectStudyArea"
                                    checked={studyAreaMode === 'coord'}
                                    onChange={() => setStudyAreaMode('coord')}
                                />
                                <span onClick={() => setStudyAreaMode('coord')}>
                                    输入坐标&nbsp;(Lng/Lat)
                                </span>
                            </div>

                            <div className="coord-input-row">
                                <input
                                    className="coord-input"
                                    type="number"
                                    placeholder="Lng"
                                    value={coordLng}
                                    onFocus={() => setStudyAreaMode('coord')}
                                    onChange={(e) => setCoordLng(e.target.value)}
                                />

                                <input
                                    className="coord-input"
                                    type="number"
                                    placeholder="Lat"
                                    value={coordLat}
                                    onFocus={() => setStudyAreaMode('coord')}
                                    onChange={(e) => setCoordLat(e.target.value)}
                                />

                                <button
                                    type="button"
                                    className="legacy-button"
                                    onClick={() => {
                                        setStudyAreaMode('coord');
                                        handleUseCoordinate();
                                    }}
                                >
                                    定位
                                </button>
                            </div>
                        </div>

                        <div className="legacy-section">
                            <div className="legacy-row">
                                <input
                                    type="radio"
                                    name="selectStudyArea"
                                    checked={studyAreaMode === 'place'}
                                    onChange={() => setStudyAreaMode('place')}
                                />
                                <span onClick={() => setStudyAreaMode('place')}>
                                    查找地址或地点
                                </span>
                            </div>

                            <div className="study-place-search-row">
                                <input
                                    className="study-place-input"
                                    type="text"
                                    placeholder="如：南京大学、中关村"
                                    value={studyPlaceKeyword}
                                    onFocus={() => setStudyAreaMode('place')}
                                    onChange={(e) => setStudyPlaceKeyword(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            setStudyAreaMode('place');
                                            handleSearchStudyPlace();
                                        }
                                    }}
                                />

                                <button
                                    type="button"
                                    className="legacy-button"
                                    onClick={() => {
                                        setStudyAreaMode('place');
                                        handleSearchStudyPlace();
                                    }}
                                >
                                    查找
                                </button>
                            </div>

                            {studyPlaceStatus && (
                                <div className="study-place-status">
                                    {studyPlaceStatus}
                                </div>
                            )}

                            {studyPlaceResults.length > 0 && (
                                <div className="study-place-result-list">
                                    {studyPlaceResults.map((place) => (
                                        <button
                                            key={place.id || `${place.name}-${place.location?.[0]}-${place.location?.[1]}`}
                                            type="button"
                                            className="study-place-result-item"
                                            onClick={() => {
                                                setStudyAreaMode('place');
                                                handleSelectStudyPlace(place);
                                            }}
                                        >
                                            <div className="study-place-result-name">
                                                {place.name}
                                            </div>

                                            <div className="study-place-result-address">
                                                {place.district || place.adname || ''}
                                                {place.address ? ` ${place.address}` : ''}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}

                            <div className="hint-text">
                                请从搜索结果中选择一个点作为研究对象。
                            </div>
                        </div>

                        <div className="legacy-section">
                            <div className="legacy-row">
                                <input
                                    type="radio"
                                    name="selectStudyArea"
                                    checked={studyAreaMode === 'district'}
                                    onChange={() => setStudyAreaMode('district')}
                                />
                                <span onClick={() => setStudyAreaMode('district')}>
                                    选择行政区
                                </span>
                            </div>

                            <div className="district-cascade-row">
                                <select
                                    className="district-cascade-select"
                                    value={selectedProvinceAdcode}
                                    onFocus={() => setStudyAreaMode('district')}
                                    onChange={(e) => {
                                        setStudyAreaMode('district');
                                        handleProvinceChange(e.target.value);
                                    }}
                                >
                                    <option value="">省市区</option>
                                    {provinceOptions.map((item) => (
                                        <option key={item.adcode} value={item.adcode}>
                                            {item.name}
                                        </option>
                                    ))}
                                </select>

                                <select
                                    className="district-cascade-select"
                                    value={selectedCityAdcode}
                                    disabled={!selectedProvinceAdcode}
                                    onFocus={() => setStudyAreaMode('district')}
                                    onChange={(e) => {
                                        setStudyAreaMode('district');
                                        handleCityChange(e.target.value);
                                    }}
                                >
                                    <option value="">市级</option>
                                    {cityOptions.map((item) => (
                                        <option key={item.adcode} value={item.adcode}>
                                            {item.name}
                                        </option>
                                    ))}
                                </select>

                                <select
                                    className="district-cascade-select"
                                    value={selectedCountyAdcode}
                                    disabled={!selectedCityAdcode}
                                    onFocus={() => setStudyAreaMode('district')}
                                    onChange={(e) => {
                                        setStudyAreaMode('district');
                                        handleCountyChange(e.target.value);
                                    }}
                                >
                                    <option value="">区县级</option>
                                    {countyOptions.map((item) => (
                                        <option key={item.adcode} value={item.adcode}>
                                            {item.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="district-confirm-row">
                                <button
                                    type="button"
                                    className="legacy-button"
                                    onClick={() => {
                                        setStudyAreaMode('district');
                                        handleConfirmAdministrativeDistrict();
                                    }}
                                >
                                    确定选择
                                </button>

                                {selectedDistrictText && (
                                    <span className="district-selected-text">
                                        已选择：{selectedDistrictText}
                                    </span>
                                )}
                            </div>

                            {districtStatus && (
                                <div className="district-status">
                                    {districtStatus}
                                </div>
                            )}

                            <div className="hint-text">
                                按“省级 → 市级 → 区县级”逐级选择行政区，点击确定后作为研究对象。
                            </div>
                        </div>

                        <div className="legacy-section">
                            <div 
                                className="legacy-row"
                                onClick={() => setStudyAreaMode('vector')}
                                onFocus={() => setStudyAreaMode('vector')}
                            >
                                <input
                                    type="radio"
                                    name="selectStudyArea"
                                    checked={studyAreaMode === 'vector'}
                                    onChange={() => setStudyAreaMode('vector')}
                                />
                                <span onClick={() => setStudyAreaMode('vector')}>
                                    矢量文件
                                </span>
                            </div>

                            <UploadPanel
                                uploading={uploading}
                                vectorInfo={vectorInfo}
                                onUploadShp={handleUploadShp}
                            />
                        </div>

                        {studyObject && (
                            <div className="legacy-section">
                                <button
                                    type="button"
                                    className="legacy-button"
                                    onClick={() => setShowObjectWindow(true)}
                                >
                                    打开分析窗口
                                </button>
                            </div>
                        )}

                        {error && <div className="error">{error}</div>}
                    </FloatingWindow>
                )}

                {showObjectWindow && studyObject && (
                    <FloatingWindow
                        title="分析窗口"
                        className="object-analysis-window"
                        initialPosition={getWindowPosition('object')}
                        onClose={() => setShowObjectWindow(false)}
                    >
                        <AnalysisObjectWindow
                            studyObject={studyObject}
                            currentBuffer={currentBuffer}
                            onBufferReady={handleBufferReady}
                            onOpenPoi={() => {
                                handleOpenPoiWindow();
                                setShowObjectWindow(false);
                            }}
                            onOpenEsr={() => {
                                setShowAnalysisWindow(true);
                                setShowObjectWindow(false);
                            }}
                            onError={setError}
                        />

                        {error && <div className="error">{error}</div>}
                    </FloatingWindow>
                )}

                {showAnalysisWindow && (
                    <FloatingWindow
                        title="环境社会风险分析"
                        className="analysis-window"
                        initialPosition={getWindowPosition('analysis')}
                        onClose={() => setShowAnalysisWindow(false)}
                    >
                        <div className="buffer-info">
                            <span>研究区来源：</span>
                            <strong>{vectorInfo?.fileName || '未选择'}</strong>
                            {vectorInfo?.bufferRadius !== undefined && (
                                <>
                                    <span>；缓冲区半径：</span>
                                    <strong>
                                        {vectorInfo.bufferRadius}
                                        {vectorInfo.bufferUnit}
                                    </strong>
                                </>
                            )}
                        </div>

                        <EsrWindowContent
                            indicators={indicators}
                            selectedKeys={selectedKeys}
                            weights={weights}
                            loading={loading}
                            geometry={geometry}
                            error={error}
                            weightValidation={weightValidation}
                            result={result}
                            onSelect={handleSelect}
                            onWeightChange={handleWeightChange}
                            onCalculate={handleCalculate}
                        />
                    </FloatingWindow>
                )}

                {showPoiWindow && (
                    <FloatingWindow
                        title="兴趣点分析"
                        className="poi-window"
                        initialPosition={getWindowPosition('poi')}
                        onClose={() => setShowPoiWindow(false)}
                    >
                        <PoiWindowContent
                            poiKeyword={poiKeyword}
                            poiStatus={poiStatus}
                            onKeywordChange={setPoiKeyword}
                            onSearch={handleSearchPoi}
                            onDownload={handleDownloadPoi}
                            onClear={handleClearPoi}
                        />
                    </FloatingWindow>
                )}

                {showMeasureWindow && (
                    <FloatingWindow
                        title="测量工具"
                        className="measure-window"
                        initialPosition={measureWindowPosition}
                        onClose={() => {
                            setMeasureMode('none');
                            setShowMeasureWindow(false);
                        }}
                    >
                        <div className="measure-tool-body">
                            <label className="measure-option">
                                <input
                                    type="radio"
                                    name="measureMode"
                                    checked={measureMode === 'distance'}
                                    onChange={() => setMeasureMode('distance')}
                                />
                                <span>距离测量</span>
                            </label>

                            <label className="measure-option">
                                <input
                                    type="radio"
                                    name="measureMode"
                                    checked={measureMode === 'area'}
                                    onChange={() => setMeasureMode('area')}
                                />
                                <span>面积测量</span>
                            </label>

                            <label className="measure-option">
                                <input
                                    type="radio"
                                    name="measureMode"
                                    checked={measureMode === 'none'}
                                    onChange={() => setMeasureMode('none')}
                                />
                                <span>停止测量</span>
                            </label>

                            <button
                                type="button"
                                className="legacy-button measure-clear-btn"
                                onClick={() => {
                                    setMeasureMode('none');
                                    setMeasureClearSignal((prev) => prev + 1);
                                }}
                            >
                                清除测量结果
                            </button>

                            <div className="hint-text measure-hint">
                                距离测量：单击地图添加节点，双击结束。
                                <br />
                                面积测量：单击地图绘制范围，双击结束。
                            </div>
                        </div>
                    </FloatingWindow>
                )}

                {showStyleWindow && (
                    <FloatingWindow
                        title="切换风格"
                        className="style-window"
                        initialPosition={styleWindowPosition}
                        onClose={() => setShowStyleWindow(false)}
                    >
                        <div className="style-list">
                            {[
                                { key: 'normal', name: '标准' },
                                { key: 'dark', name: '深色' },
                                { key: 'light', name: '浅色' },
                                { key: 'whitesmoke', name: '远山黛' },
                                { key: 'fresh', name: '草色青' },
                                { key: 'grey', name: '雅士灰' },
                                { key: 'macaron', name: '马卡龙' },
                                { key: 'blue', name: '靛青蓝' },
                            ].map((item) => (
                                <label key={item.key}>
                                    <input
                                        type="radio"
                                        name="mapStyle"
                                        checked={mapStyle === item.key}
                                        onChange={() => setMapStyle(item.key)}
                                    />
                                    <span>{item.name}</span>
                                </label>
                            ))}
                        </div>
                    </FloatingWindow>
                )}
            </div>
        </div>
    );
}

export default App;