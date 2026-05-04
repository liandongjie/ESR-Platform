/*
 * @Author: liandongjie
 * @Date: 2026-05-03 15:13:27
 * @LastEditors: liandongjie
 * @LastEditTime: 2026-05-04 16:20:51
 * @Description: 
 */
function Toolbar({
    currentTime,
    searchKeyword,
    onSearchKeywordChange,
    onSearchPlace,
    onClearSearch,
    onToggleSelectWindow,
    onToggleStyleWindow,
    onToggleMeasureWindow,
    onPrintMap,
}) {
    return (
        <div id="toolbar_div">
            <table width="100%" height="100%" border="0">
                <tbody>
                    <tr>
                        <td align="left">
                            <div id="time_div">{currentTime}</div>
                        </td>

                        <td valign="bottom" align="right">
                            <div id="locate_div">
                                <img src="/icons/select_study_area_icon.svg" alt="选择研究区域" />
                                <a href="#select" onClick={onToggleSelectWindow}>
                                    选择研究区域
                                </a>
                            </div>

                            <div id="print_div">
                                <img src="/icons/print_view_icon.svg" alt="打印视图" />
                                <a
                                    href="#print"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        onPrintMap();
                                    }}
                                >
                                    打印视图
                                </a>
                            </div>

                            <div id="measure_div">
                                <img src="/icons/measure_tool_icon.svg" alt="测量工具" />
                                <a
                                    href="#measure"
                                    data-toolbar-action="measure"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        onToggleMeasureWindow();
                                    }}
                                >
                                    测量工具
                                </a>
                            </div>

                            <div id="toggle_div">
                                <img src="/icons/switch_style_icon.svg" alt="切换风格" />
                                <a
                                    href="#style"
                                    data-toolbar-action="style"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        onToggleStyleWindow();
                                    }}
                                >
                                    切换风格
                                </a>
                            </div>

                            <div className="search_div">
                                <input
                                    id="amap-search-input"
                                    className="search_text"
                                    type="text"
                                    value={searchKeyword}
                                    placeholder="查找地址或地点"
                                    autoComplete="off"
                                    onChange={(e) => onSearchKeywordChange(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            onSearchPlace();
                                        }
                                    }}
                                />

                                <a
                                    className="search_btn"
                                    href="#clear"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        onClearSearch();
                                    }}
                                >
                                    Clear
                                </a>
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
}

export default Toolbar;