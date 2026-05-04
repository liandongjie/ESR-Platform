import { getDownloadUrl } from '../api/esrApi';

function ResultPanel({ result }) {
    return (
        <section className="card result-card">
            <h2>计算结果</h2>

            {!result && (
                <p className="empty">
                    暂无结果，请上传或绘制研究区后点击“开始计算”。
                </p>
            )}

            {result && (
                <>
                    <table className="result-table">
                        <thead>
                            <tr>
                                <th>指标</th>
                                <th>权重</th>
                                <th>最小值</th>
                                <th>最大值</th>
                                <th>平均值</th>
                            </tr>
                        </thead>
                        <tbody>
                            {result.statistics.map((item) => (
                                <tr key={item.key}>
                                    <td>
                                        {item.name}
                                        <br />
                                        <small>{item.key}</small>
                                    </td>
                                    <td>{item.weight}</td>
                                    <td>{formatNumber(item.min)}</td>
                                    <td>{formatNumber(item.max)}</td>
                                    <td>{formatNumber(item.mean)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <a
                        className="download-link"
                        href={getDownloadUrl(result.downloadUrl)}
                        target="_blank"
                        rel="noreferrer"
                    >
                        下载分析结果 ZIP
                    </a>
                </>
            )}
        </section>
    );
}

function formatNumber(value) {
    if (value === null || value === undefined) {
        return '-';
    }

    return Number(value).toFixed(4);
}

export default ResultPanel;