function UploadPanel({ uploading, vectorInfo, onUploadShp }) {
    return (
        <section className="card">
            <h2>研究区上传</h2>

            <input
                className="file-input"
                type="file"
                accept=".zip"
                onChange={onUploadShp}
            />

            {uploading && <p className="hint">矢量文件解析中...</p>}

            {vectorInfo && (
                <div className="info-box">
                    <p><strong>来源：</strong>{vectorInfo.fileName}</p>
                    <p><strong>要素数量：</strong>{vectorInfo.featureCount}</p>
                    <p><strong>坐标系：</strong>{vectorInfo.crs}</p>
                </div>
            )}
        </section>
    );
}

export default UploadPanel;