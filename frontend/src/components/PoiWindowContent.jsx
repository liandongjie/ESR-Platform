function PoiWindowContent({
    poiKeyword,
    poiStatus,
    onKeywordChange,
    onSearch,
    onDownload,
    onClear,
}) {
    return (
        <div className="poi-window-content">
            <div className="poi-control-row">
                <a
                    href="#poi-keyword"
                    title="请输入关键词，多个关键词用 | 分割"
                    onClick={(e) => e.preventDefault()}
                >
                    关键词:
                </a>

                <input
                    id="poi-keyword-input"
                    className="poi-keyword-input"
                    type="text"
                    value={poiKeyword}
                    placeholder="如：学校|医院|工厂"
                    onChange={(e) => onKeywordChange(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            onSearch();
                        }
                    }}
                />

                <button
                    type="button"
                    className="legacy-button"
                    onClick={onSearch}
                >
                    搜索
                </button>

                <button
                    type="button"
                    className="legacy-button"
                    onClick={onDownload}
                >
                    下载
                </button>

                <button
                    type="button"
                    className="legacy-button"
                    onClick={onClear}
                >
                    清除
                </button>
            </div>

            {poiStatus && (
                <div className="poi-status">
                    {poiStatus}
                </div>
            )}

            <div
                id="poi-result-panel"
                className="poi-result-panel"
            />
        </div>
    );
}

export default PoiWindowContent;