import { useEffect, useState } from 'react';

import { createBuffer } from '../api/esrApi';
import {
    convertGeojson,
    wgs84ToGcj02Point,
} from '../utils/coordTransform';

function AnalysisObjectWindow({
    studyObject,
    currentBuffer,
    onBufferReady,
    onOpenPoi,
    onOpenEsr,
    onError,
}) {
    const [radius, setRadius] = useState(() => String(currentBuffer?.radius ?? '0'));
    const [unit, setUnit] = useState(() => currentBuffer?.unit || 'm');

    useEffect(() => {
        if (!currentBuffer) {
            return;
        }

        setRadius(String(currentBuffer.radius ?? '0'));
        setUnit(currentBuffer.unit || 'm');
    }, [currentBuffer?.radius, currentBuffer?.unit]);

    const [buffering, setBuffering] = useState(false);

    if (!studyObject) {
        return <div className="empty">尚未选择研究对象。</div>;
    }

    const getRadiusMeters = () => {
        const value = Number(radius);

        if (!Number.isFinite(value)) {
            throw new Error('缓冲区半径不是合法数字');
        }

        return unit === 'km' ? value * 1000 : value;
    };

    const buildBuffer = async () => {
        const radiusMeters = getRadiusMeters();

        if (!studyObject.geometry) {
            throw new Error('研究对象 geometry 为空');
        }

        const canReuseCurrentBuffer =
            currentBuffer &&
            currentBuffer.geometry &&
            currentBuffer.geojson &&
            Number(currentBuffer.radius) === Number(radius) &&
            currentBuffer.unit === unit;

        if (canReuseCurrentBuffer) {
            return currentBuffer;
        }

        const data = await createBuffer({
            geometry: studyObject.geometry,
            buffer: radiusMeters,
            type: 1,
        });

        const bufferGeojsonAmap = convertGeojson(
            data.geojson,
            wgs84ToGcj02Point
        );

        return {
            geometry: data.geometry,
            geojson: bufferGeojsonAmap,
            radius,
            unit,
        };
    };

    const handleAddToMap = async () => {
        try {
            setBuffering(true);
            onError('');

            const bufferResult = await buildBuffer();
            onBufferReady(bufferResult);
        } catch (err) {
            onError(err.message);
        } finally {
            setBuffering(false);
        }
    };

    const handleOpenEsr = async () => {
        try {
            setBuffering(true);
            onError('');

            const bufferResult = await buildBuffer();
            onBufferReady(bufferResult);
            onOpenEsr();
        } catch (err) {
            onError(err.message);
        } finally {
            setBuffering(false);
        }
    };

    const handleOpenPoi = async () => {
        try {
            setBuffering(true);
            onError('');

            const bufferResult = await buildBuffer();
            onBufferReady(bufferResult);
            onOpenPoi();
        } catch (err) {
            onError(err.message);
        } finally {
            setBuffering(false);
        }
    };

    return (
        <div className="analysis-object-window">
            <div className="title_div">&nbsp;&nbsp;研究区基本信息</div>

            <table className="study-info-table">
                <tbody>
                    <tr>
                        <td>来源:</td>
                        <td>{studyObject.source || '-'}</td>
                    </tr>
                    <tr>
                        <td>类型:</td>
                        <td>{studyObject.geometry?.type || '-'}</td>
                    </tr>
                    <tr>
                        <td>名称:</td>
                        <td>{studyObject.name || studyObject.fileName || '-'}</td>
                    </tr>
                </tbody>
            </table>

            <div className="title_div">&nbsp;&nbsp;缓冲区设置</div>

            <div className="buffer-control-row">
                <span>缓冲区半径:</span>

                <input
                    className="buffer-radius-input"
                    type="number"
                    value={radius}
                    onChange={(e) => setRadius(e.target.value)}
                />

                <select
                    className="buffer-unit-select"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                >
                    <option value="km">km</option>
                    <option value="m">m</option>
                    
                </select>

                <button
                    type="button"
                    className="legacy-button"
                    disabled={buffering}
                    onClick={handleAddToMap}
                >
                    {buffering ? '生成中...' : 'Add to Map'}
                </button>
            </div>

            <div className="analysis-link-row">
                <a
                    href="#poi"
                    onClick={(e) => {
                        e.preventDefault();
                        handleOpenPoi();
                    }}
                >
                    兴趣点(Point-of-Interest)分析
                </a>

                <span>&nbsp;&nbsp;|&nbsp;&nbsp;</span>

                <a
                    href="#esr"
                    onClick={(e) => {
                        e.preventDefault();
                        handleOpenEsr();
                    }}
                >
                    环境社会风险分析
                </a>
            </div>
        </div>
    );
}

export default AnalysisObjectWindow;