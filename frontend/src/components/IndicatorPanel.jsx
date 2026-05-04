/*
 * @Author: liandongjie
 * @Date: 2026-05-03 13:47:59
 * @LastEditors: liandongjie
 * @LastEditTime: 2026-05-03 14:50:51
 * @Description: 
 */
function IndicatorPanel({
    indicators,
    selectedKeys,
    weights,
    loading,
    geometry,
    error,
    weightValidation,
    onSelect,
    onWeightChange,
    onCalculate,
}) {
    return (
        <section className="card">
            <h2>指标权重配置</h2>

            <div className="indicator-list">
                {indicators.map((item) => (
                    <div className="indicator-row" key={item.key}>
                        <label>
                            <input
                                type="checkbox"
                                checked={selectedKeys.includes(item.key)}
                                onChange={() => onSelect(item.key)}
                            />
                            <span>{item.name}</span>
                            <small>{item.key}</small>
                        </label>

                        <input
                            className="weight-input"
                            type="number"
                            value={weights[item.key] ?? 0}
                            disabled={!selectedKeys.includes(item.key)}
                            onChange={(e) =>
                                onWeightChange(item.key, e.target.value)
                            }
                        />
                    </div>
                ))}
            </div>
            <div className={weightValidation.valid ? 'weight-summary success' : 'weight-summary warning'}>
                当前权重总和：{weightValidation.totalWeight}
                {!weightValidation.valid && (
                    <span>，{weightValidation.message}</span>
                )}
            </div>
            <button
                className="primary-button"
                onClick={onCalculate}
                disabled={loading || selectedKeys.length === 0 || !geometry || !weightValidation.valid}            >
                {loading ? '计算中...' : '开始计算'}
            </button>

            {error && <div className="error">{error}</div>}
        </section>
    );
}

export default IndicatorPanel;