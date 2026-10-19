# PMIC Notes · 電源管理 IC 知識地圖

LDO、DC-DC 與 PMIC 的教學網站：從架構、BCD 製程、電路設計、生產、測試驗證到系統應用，加上常見問題排查、客訴處理、互動實驗室、職務地圖與測驗。純靜態 HTML/CSS/JS，不需要建置工具。架構沿用 Memory Notes（`../project_claude_memory_manufature_test`）。

## 頁面

| 檔案 | 內容 |
|---|---|
| `index.html` | 首頁：知識流程、章節卡片、四種穩壓方式比較、閱讀路線 |
| `architecture.html` | 1. 架構：線性 vs 切換、LDO 方塊圖、傳輸元件、壓差與熱、Buck / Boost / 電荷泵、PMIC |
| `process.html` | 2. 製程：BCD、LDMOS、隔離與基板注入、電阻電容、厚金屬、熔絲 / OTP、匹配與應力 |
| `design.html` | 3. 設計：LDO 迴路、ESR 窗口、無電容 LDO、PSRR、雜訊、暫態、帶隙、保護、DC-DC 控制與補償、PMIC 數位、驗證 |
| `production.html` | 4. 生產：流程、WAT、CP 修調、封裝、FT、良率、Cpk / SPC、PAT、追溯、PCN、產能 |
| `test.html` | 5. 測試：參數量測、ATE、DFT、Kelvin、相關性 / GR&R、特性化、AEC-Q100、ESD / latch-up、功能安全 |
| `application.html` | 6. 應用：電源樹、時序、MLCC DC bias、電感、熱、佈局、EMI、熱插拔、車用、選型檢查表 |
| `issues.html` | 常見問題：症狀索引，振盪 / 啟動 / 過衝 / 熱 / 雜訊 / 效率 / 反灌 / EMI，設計、製程、測試類問題，除錯技巧 |
| `complaints.html` | 客訴處理：流程、資訊收集、FA 流程、失效分類、8D、根因工具、10 個典型案例、溝通、指標 |
| `lab.html` | 互動實驗室：LDO 穩定度、PSRR、負載暫態、壓差與熱、Buck 漣波、MLCC DC bias、修調與良率；每個實驗都有自動掃描（參數來回跑、殘影比較）與電路圖（`assets/lab-circuit.js`，參數對應元件會亮起、點元件跳到滑桿；負載暫態與 Buck 可播放電流，電路上顯示即時電流流向，波形上有時間游標） |
| `sic.html` | 專題：SiC 與資料中心電源（Si / SiC / GaN 分工、PSU、800 V HVDC、Infineon 例、SiC 設計與可靠度）|
| `roles.html` | 職務地圖：類比設計、佈局、數位、AE/FAE、PE、TE、製程、QRA、FA |
| `quiz.html` | 測驗：57 題，八個主題 |

`assets/`：`style.css`（共用樣式，深淺色）、`site.js`（導覽、搜尋、目錄、語言切換）、`plot.js`（SVG 繪圖）、`lab.js`、`quiz.js`、`search-index.js` / `search-index-en.js`（自動產生）。

## 中英文版

中文頁面在根目錄，英文頁面在 `en/`，檔名與段落 id 一一對應；頂部的 EN / 中 按鈕會切換到對應頁面的同一段落。
JS 介面文字用 `t('中文', 'English')` 依 `<html lang>` 切換；測驗題庫的英文版在 `assets/quiz.js` 的 `QEN`（順序與 `Q` 相同）。
修改中文頁面時，記得同步修改 `en/` 的對應頁面。

## 修改內容後

章節頁的 `<h2 id>`、`<h3 id>`、名詞解釋與案例卡（`.case[id]`）會被收進全站搜尋（Ctrl+K）。改完頁面後重新產生中英文兩份索引：

```
python tools/build_index.py
```

## 本機預覽

直接用瀏覽器開 `index.html` 即可。

## GitHub Pages

網站部署在 GitHub Pages（`main` 分支、`/ (root)`）。推送到 `main` 後約一分鐘自動更新。
