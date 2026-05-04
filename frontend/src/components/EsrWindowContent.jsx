import { useEffect, useMemo, useState } from 'react';
import { getDownloadUrl } from '../api/esrApi';

const GROUPS = [
    {
        key: 'env',
        title: '环境因素',
        indicators: ['PM25', 'AQI', 'hwmd', 'NDVI'],
    },
    {
        key: 'dem',
        title: '人口因素',
        indicators: ['rkmd', 'xxmd', 'jmdmd'],
    },
    {
        key: 'soc',
        title: '社会因素',
        indicators: ['fmyl', 'fmts', 'xspb', 'xsqs', 'gyfb'],
    },
];

function EsrWindowContent({
    indicators,
    selectedKeys,
    weights,
    loading,
    geometry,
    error,
    weightValidation,
    result,
    onSelect,
    onWeightChange,
    onCalculate,
}) {
    const [step, setStep] = useState(1);
    const [activeGroup, setActiveGroup] = useState('env');

    const indicatorMap = useMemo(() => {
        const map = {};
        indicators.forEach((item) => {
            map[item.key] = item;
        });
        return map;
    }, [indicators]);

    useEffect(() => {
        setStep(1);
    }, [geometry]);

    const currentGroup = GROUPS.find((item) => item.key === activeGroup);

    const handleGroupToggle = () => {
        const groupKeys = currentGroup.indicators.filter((key) => indicatorMap[key]);
        const allSelected = groupKeys.every((key) => selectedKeys.includes(key));

        groupKeys.forEach((key) => {
            if (allSelected && selectedKeys.includes(key)) {
                onSelect(key);
            }

            if (!allSelected && !selectedKeys.includes(key)) {
                onSelect(key);
            }
        });
    };

    const goStep2 = () => {
        if (selectedKeys.length === 0) {
            alert('请至少选择一个指标进行分析！');
            return;
        }

        setStep(2);
    };

    const goStep3 = async () => {
        const success = await onCalculate();

        if (success) {
            setStep(3);
        }
    };

    const exportStatistics = () => {
        if (!result || !result.statistics || result.statistics.length === 0) {
            alert('暂无可导出的统计结果');
            return;
        }

        const header = [
            '环境社会风险指标',
            '权重(%)',
            '最小值',
            '最大值',
            '平均值',
        ];

        const rows = result.statistics.map((item) => [
            item.name,
            item.weight,
            formatNumber(item.min),
            formatNumber(item.max),
            formatNumber(item.mean),
        ]);

        const csvContent = [header, ...rows]
            .map((row) =>
                row
                    .map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`)
                    .join(',')
            )
            .join('\n');

        const blob = new Blob(['\ufeff' + csvContent], {
            type: 'text/csv;charset=utf-8;',
        });

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');

        a.href = url;
        a.download = `环境社会风险统计结果-${result.taskId || 'result'}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        URL.revokeObjectURL(url);
    };

    return (
        <div id="eWindow-steps">
            <div className="esr-buffer-info">
                <span>当前研究区：</span>
                <span>{geometry ? '已选择' : '未选择'}</span>
            </div>

            {step === 1 && (
                <div id="eWindow-step1">
                    <div className="step-title">
                        第&nbsp;1&nbsp;步:&nbsp;&nbsp;选择风险指标
                    </div>

                    <div className="box">
                        <div className="hd">
                            {GROUPS.map((group) => (
                                <span
                                    key={group.key}
                                    className={activeGroup === group.key ? 'current' : ''}
                                    onClick={() => setActiveGroup(group.key)}
                                >
                                    <div className="factors">
                                        <a href="#tab">{group.title}</a>
                                    </div>
                                </span>
                            ))}
                        </div>

                        <div className="bd">
                            <div className="factor-panel">
                                <div className="select-all">
                                    [
                                    <a href="#select-all" onClick={handleGroupToggle}>
                                        全选/取消全选
                                    </a>
                                    ]
                                </div>

                                <table>
                                    <tbody>
                                        {chunk(currentGroup.indicators, 3).map((row, rowIndex) => (
                                            <tr key={rowIndex}>
                                                {row.map((key) => {
                                                    const item = indicatorMap[key];

                                                    if (!item) {
                                                        return <td key={key}></td>;
                                                    }

                                                    return (
                                                        <td key={key} className="indicator-cell">
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedKeys.includes(key)}
                                                                onChange={() => onSelect(key)}
                                                            />
                                                            {item.name}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <div className="step-buttons">
                        <button onClick={goStep2}>下一步</button>
                    </div>
                </div>
            )}

            {step === 2 && (
                <div id="eWindow-step2">
                    <div className="step-title">
                        第&nbsp;2&nbsp;步:&nbsp;&nbsp;设置指标权重
                    </div>

                    <div className="weight-table-wrap">
                        <table>
                            <tbody>
                                {selectedKeys.map((key) => {
                                    const item = indicatorMap[key];

                                    return (
                                        <tr key={key}>
                                            <td className="weight-name">
                                                {item?.name || key}
                                            </td>

                                            <td className="weight-range">
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max="100"
                                                    step="1"
                                                    value={weights[key] === '' ? 0 : weights[key] ?? 0}
                                                    onChange={(e) =>
                                                        onWeightChange(key, e.target.value)
                                                    }
                                                />
                                            </td>

                                            <td className="weight-value">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="100"
                                                    step="1"
                                                    value={weights[key] ?? ''}
                                                    onChange={(e) =>
                                                        onWeightChange(key, e.target.value)
                                                    }
                                                />
                                                %
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    <div className="weight-hint">
                        提示：总比重值必须为：<b>100</b>，已分配比重：
                        <span className={weightValidation.valid ? 'ok' : 'bad'}>
                            {weightValidation.totalWeight}
                        </span>
                        {!weightValidation.valid && (
                            <span className="bad"> {weightValidation.message}</span>
                        )}
                    </div>

                    {error && <div className="error">{error}</div>}

                    <div className="step-buttons">
                        <button onClick={() => setStep(1)}>上一步</button>
                        <button
                            onClick={goStep3}
                            disabled={!geometry || !weightValidation.valid || loading}
                        >
                            {loading ? '计算中...' : '下一步'}
                        </button>
                    </div>
                </div>
            )}

            {step === 3 && (
                <div id="eWindow-step3">
                    <div className="step-title">
                        第&nbsp;3&nbsp;步:&nbsp;&nbsp;计算风险指数
                    </div>

                    {!result && <div className="empty">暂无计算结果。</div>}

                    {result && (
                        <>
                            <div id="eWindow-step3-2">
                                <table id="eWindow-step3-table">
                                    <tbody>
                                        <tr>
                                            <td className="esr-th">环境社会风险指标</td>
                                            <td className="esr-th">权重 (%)</td>
                                            <td className="esr-th">最小值</td>
                                            <td className="esr-th">最大值</td>
                                            <td className="esr-th">平均值</td>
                                        </tr>

                                        {result.statistics.map((item) => (
                                            <tr key={item.key}>
                                                <td className={item.key === 'esr' ? 'esr-tt' : 'esr-td'}>
                                                    {item.name}
                                                </td>
                                                <td className={item.key === 'esr' ? 'esr-tt' : 'esr-td'}>
                                                    {item.weight}
                                                </td>
                                                <td className={item.key === 'esr' ? 'esr-tt' : 'esr-td'}>
                                                    {formatNumber(item.min)}
                                                </td>
                                                <td className={item.key === 'esr' ? 'esr-tt' : 'esr-td'}>
                                                    {formatNumber(item.max)}
                                                </td>
                                                <td className={item.key === 'esr' ? 'esr-tt' : 'esr-td'}>
                                                    {formatNumber(item.mean)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="download-actions">
                                <a
                                    href="#export"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        exportStatistics();
                                    }}
                                >
                                    导出统计结果
                                </a>
                                <span>&nbsp;&nbsp;|&nbsp;&nbsp;</span>
                                <a
                                    href={getDownloadUrl(result.downloadUrl)}
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    下载影像数据
                                </a>
                            </div>
                        </>
                    )}

                    <div className="step-buttons">
                        <button onClick={() => setStep(2)}>上一步</button>
                    </div>
                </div>
            )}
        </div>
    );
}

function chunk(arr, size) {
    const result = [];

    for (let i = 0; i < arr.length; i += size) {
        result.push(arr.slice(i, i + size));
    }

    return result;
}

function formatNumber(value) {
    if (value === null || value === undefined) {
        return '-';
    }

    return Number(value).toFixed(2);
}

export default EsrWindowContent;