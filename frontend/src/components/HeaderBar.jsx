/*
 * @Author: liandongjie
 * @Date: 2026-05-03 15:12:52
 * @LastEditors: liandongjie
 * @LastEditTime: 2026-05-03 15:13:04
 * @Description: 
 */
function HeaderBar() {
    return (
        <div id="head_div">
            <table width="100%">
                <tbody>
                    <tr>
                        <td valign="bottom">
                            <span id="title_div_part1">环境社会风险平台</span>
                            <span id="title_div_part2">
                                Environmental and Social Risk Platform (Version 2022)
                            </span>
                        </td>

                        <td valign="middle" align="right">
                            <span id="homelinks">
                                <a
                                    href="http://www.china-epc.cn/"
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    EPC 官网
                                </a>
                                <span> | </span>
                                <a
                                    href="/static/doc/帮助文档.pdf"
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    帮助
                                </a>
                                <span> | </span>
                                <a href="/download" target="_blank" rel="noreferrer">
                                    数据下载
                                </a>
                            </span>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
}

export default HeaderBar;