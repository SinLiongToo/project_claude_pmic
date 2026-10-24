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
| `test.html` | 5. 測試：參數量測、ATE、大量 ATE 測試（測試單元、UPH 與平行效率、測試成本、縮短測試時間、重測與分 bin，附 UPH / 成本計算器 `assets/ate.js`）、DFT、Kelvin、相關性 / GR&R、特性化、AEC-Q100、ESD / latch-up、功能安全 |
| `application.html` | 6. 應用：電源樹、時序、MLCC DC bias、電感、熱、佈局、EMI、熱插拔、車用、選型檢查表 |
| `issues.html` | 常見問題：症狀索引，振盪 / 啟動 / 過衝 / 熱 / 雜訊 / 效率 / 反灌 / EMI，設計、製程、測試類問題，除錯技巧 |
| `complaints.html` | 客訴處理：流程、資訊收集、FA 流程、失效分類、8D、根因工具、10 個典型案例、溝通、指標 |
| `lab.html` | 互動實驗室：LDO 穩定度、PSRR、負載暫態、壓差與熱、Buck 漣波、MLCC DC bias、修調與良率；每個實驗都有自動掃描（參數來回跑、殘影比較）與電路圖（`assets/lab-circuit.js`，參數對應元件會亮起、點元件跳到滑桿；負載暫態與 Buck 可播放電流，電路上顯示即時電流流向，波形上有時間游標） |
| `sic.html` | 專題：SiC 與資料中心電源（Si / SiC / GaN 分工、PSU、800 V HVDC、Infineon 例、SiC 設計與可靠度）|
| `smartswitch.html` | 專題：車用智慧高邊開關，以 Infineon PROFET BTS50025-1TEA 為例（方塊圖、電流感測、鎖存保護、ReverSave、SMART CLAMPING、電容負載、PWM、熱、內部電路、各區塊測法與量測接法、客訴情境），附四個計算器（PWM 計算器有波形圖與自動掃描：選一個參數來回跑，看接面溫度、損耗、負載功率或實際 duty 怎麼跟著變）（`assets/hss.js`）|
| `roles.html` | 職務地圖：類比設計、佈局、數位、AE/FAE、PE、TE、製程、QRA、FA |
| `quiz.html` | 測驗：67 題，九個主題 |
| `glossary.html` | 術語表：全站約 260 個術語，依主題分類；各章內文的術語有虛線底線，滑鼠移上去（手機點一下）顯示解釋 |

`assets/`：`style.css`（共用樣式，深淺色）、`site.js`（導覽、搜尋、目錄、語言切換、術語提示）、`plot.js`（SVG 繪圖）、`lab.js`、`lab-circuit.js`（實驗電路圖與電流播放）、`figs.js`（佈局好／壞對照圖）、`hss.js`（智慧開關計算器）、`quiz.js`、`glossary-data.js`、`search-index.js` / `search-index-en.js`（自動產生）。

## 中英文版

中文頁面在根目錄，英文頁面在 `en/`，檔名與段落 id 一一對應；頂部的 EN / 中 按鈕會切換到對應頁面的同一段落。
JS 介面文字用 `t('中文', 'English')` 依 `<html lang>` 切換；測驗題庫的英文版在 `assets/quiz.js` 的 `QEN`（順序與 `Q` 相同）。
修改中文頁面時，記得同步修改 `en/` 的對應頁面。

## 術語表

術語來源：`tools/glossary.py`（全站術語，中英文全名與一句話解釋）＋各章頁面中所有 `<dl class="terms">` 清單（自動收錄）。修改後執行：

```
python tools/build_glossary.py
python tools/build_index.py
python tools/stamp_updated.py
```

`build_glossary.py` 會產生 `glossary.html`、`en/glossary.html` 與 `assets/glossary-data.js`（內文底線提示用的資料）。

## 修改內容後

章節頁的 `<h2 id>`、`<h3 id>`、名詞解釋與案例卡（`.case[id]`）會被收進全站搜尋（Ctrl+K）。改完頁面後重新產生中英文兩份索引：

```
python tools/build_index.py
```

## 自動測試（Playwright）

`tests/` 裡的測試用同一份腳本跑 Chromium、Firefox、WebKit（Safari 核心）三種瀏覽器，加上 Pixel 7 與 iPhone 14 兩個手機設定。測試時會自動用 `tests/server.js`（Node）開本機伺服器（http://127.0.0.1:8765），並擋掉 Google Fonts，所以不需要網路。

- 同時只開 2 個瀏覽器（開更多在一般筆電上會記憶體不足，Firefox / WebKit 會崩潰）；偶發的瀏覽器崩潰會自動重試一次，報告裡標為 flaky。
- **不要同時執行兩組測試**：第二組會直接報錯（`tests/run-lock.js`），因為兩組會共用伺服器並刪掉彼此的暫存檔。
- 測試結果與報告存在系統暫存資料夾（`%TEMP%\pmic-notes-tests`），不放在 OneDrive，避免同步時寫檔失敗。完整跑一次約 30–40 分鐘。

第一次使用：

```
npm install
npx playwright install chromium firefox webkit
```

執行：

```
npm test                 # 全部（5 個設定）
npm run test:chromium    # 只跑一種瀏覽器（也有 test:firefox、test:webkit、test:mobile）
npm run test:report      # 用瀏覽器看上一次的報告（含失敗截圖；重試時有 trace）
```

| 檔案 | 檢查內容 |
|---|---|
| `static.spec.js` | 中英文頁面齊全、所有連結／錨點／資源存在、無重複 id、中英文 id 一致、英文頁沒有中文、搜尋索引與術語表是最新的、JS 語法 |
| `pages.spec.js` | 每一頁（中英文）沒有 JS 錯誤、導覽列、目錄、語言切換、深淺色切換、章節順序 |
| `search.spec.js` | Ctrl+K 與 / 開啟搜尋，關鍵字有結果且連到存在的頁面 |
| `lab.spec.js` | 7 個實驗每個滑桿最小／中間／最大、每個按鈕與選項沒有 NaN；自動掃描；電路圖與參數對應；電流播放（捲離畫面時停止）；暫態模型 200 組隨機參數不超出物理範圍；與手算結果比對 |
| `quiz.spec.js` | 中英文測驗從頭作答到結束，複習連結存在 |
| `glossary.spec.js` | 術語底線、懸停／鍵盤提示、歧義詞沒有對錯、術語表篩選與錨點 |
| `figures.spec.js` | 應用章的佈局好／壞對照圖：四組都畫出來、文字不超出板子 |
| `ate.spec.js` | 測試章的 UPH / 成本計算器：每個滑桿沒有 NaN；與內文的計算範例比對 |
| `smartswitch.spec.js` | 智慧開關頁的四個計算器：每個滑桿最小／中間／最大沒有 NaN；與資料手冊手算比對（感測電壓、感性能量、接面溫度、PWM 上限、運放偏移）|
| `mobile.spec.js` | 手機設定：沒有橫向捲動、觸控操作、術語提示在螢幕內，點其他地方會關閉 |

## 最後更新日期

每一頁底部都有「最後更新」日期，由 `tools/stamp_updated.py` 寫入：內容和上一次 commit 不同的頁面標上今天，沒改的頁面保留原本的日期。改完頁面、commit 之前執行（放在 build_glossary 與 build_index 之後）；靜態測試會檢查日期是否最新。

## 本機預覽

直接用瀏覽器開 `index.html` 即可。

## GitHub Pages

網站部署在 GitHub Pages（`main` 分支、`/ (root)`）。推送到 `main` 後約一分鐘自動更新。
