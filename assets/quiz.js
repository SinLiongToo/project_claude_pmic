/* PMIC Notes — quiz. Question bank per chapter; each has 4 options (first is correct, shuffled at run time). */
(function(){
  const t = (window.MemSite && window.MemSite.t) || (zh => zh);
  const EN = !!(window.MemSite && window.MemSite.EN);
  const CH = EN ? {arc:'Architecture', fab:'Process', des:'Design', mfg:'Production', tst:'Test', use:'Applications', rel:'Issues / complaints', sic:'SiC / data center'}
              : {arc:'架構', fab:'製程', des:'設計', mfg:'生產', tst:'測試', use:'應用', rel:'問題 / 客訴', sic:'SiC / 資料中心'};
  const Q = [
    // ---------- 架構 ----------
    {c:'arc', q:'LDO 從 3.6 V 降到 1.8 V、I_Q 可忽略時，最高效率約為？', o:['50%', '90%', '36%', '72%'], e:'LDO 效率 ≈ V_OUT / V_IN = 1.8 / 3.6 = 50%，多出來的壓差全部變成熱。', l:'architecture.html#linear-vs-switching'},
    {c:'arc', q:'5 V 降 3.3 V、500 mA 的 LDO，功耗約為？', o:['0.85 W', '1.65 W', '2.5 W', '0.33 W'], e:'P_D = (5 − 3.3) × 0.5 = 0.85 W。SOT-23 約 200 °C/W，會升溫 170 °C。', l:'architecture.html#dropout'},
    {c:'arc', q:'相對於 PMOS LDO，NMOS（源極隨耦）LDO 的主要代價是？', o:['閘極必須高於 V_OUT + V_GS，需要偏壓軌或電荷泵', '輸出阻抗太高、難以穩定', 'PSRR 較差', '無法做到大電流'], e:'NMOS 輸出阻抗約 1/g_m，穩定度與 PSRR 都好，但閘極驅動要高於輸出。', l:'architecture.html#pass-device'},
    {c:'arc', q:'理想同步 Buck 中，V_IN = 12 V、V_OUT = 3 V 時的工作週期約為？', o:['25%', '75%', '400%', '33%'], e:'理想 Buck：D = V_OUT / V_IN = 3 / 12 = 25%。', l:'architecture.html#buck'},
    {c:'arc', q:'同步 Buck 在輕載時若強制 PWM（FPWM），會出現什麼現象？', o:['電感電流反向，輕載效率很低但漣波與頻率固定', '自動進入 DCM', '輸出電壓升高', '切換頻率自動降低'], e:'強制 CCM 時低側會讓電感電流變負，循環能量造成損失，但頻率固定、漣波可預測。', l:'architecture.html#buck'},
    {c:'arc', q:'Boost 轉換器比 Buck 更難把迴路頻寬做高，主要原因是？', o:['右半平面零點（RHPZ）', '輸入電流不連續', '沒有同步整流', '需要更大的輸出電容'], e:'RHPZ 讓增益上升但相位下降，交越頻率通常要低於 RHPZ 的 1/3–1/5。', l:'architecture.html#boost-bb'},
    {c:'arc', q:'手機快充常用 2:1 電荷泵取代 Buck 做主要轉換，原因是？', o:['比例剛好時效率可達 97–98%，熱少很多', '可以輸出任意電壓', '不需要任何電容', '雜訊最低'], e:'電荷泵在固定比例時效率很高；USB 輸入設成約兩倍電池電壓，再對半轉換。', l:'architecture.html#charge-pump'},
    // ---------- 製程 ----------
    {c:'fab', q:'BCD 製程中的 B、C、D 分別代表？', o:['Bipolar、CMOS、DMOS', 'Buck、Charge pump、DC-DC', 'Bandgap、Comparator、Driver', 'Buried、Channel、Drain'], e:'BCD 整合雙極電晶體（類比精度）、CMOS（邏輯）與 DMOS（功率）。', l:'process.html#bcd'},
    {c:'fab', q:'LDMOS 的比導通電阻 R_sp 與崩潰電壓 BV 的矽極限關係約為？', o:['R_sp ∝ BV^2.5', 'R_sp ∝ BV', 'R_sp ∝ 1/BV', '兩者無關'], e:'耐壓需要更長、更淡的漂移區，電阻快速上升；RESURF、場板、超接面都在逼近這個極限。', l:'process.html#ldmos'},
    {c:'fab', q:'Buck 在死區時間內 SW 被拉到地以下約 −0.7 V，主要的副作用是？', o:['少數載子注入基板，干擾附近類比電路甚至觸發 latch-up', '輸出電壓升高', '閘極氧化層崩潰', '電感飽和'], e:'N 型汲極對 P 基板正偏，電子注入並被附近 N 井收集。對策是保護環、DTI、縮短死區。', l:'process.html#substrate-injection'},
    {c:'fab', q:'要讓兩顆 MOS 的 V_T 失配 σ 減半，面積大約要變成？', o:['4 倍', '2 倍', '√2 倍', '8 倍'], e:'Pelgrom：σ(ΔV_T) = A_VT / √(WL)，面積 4 倍 → σ 減半。', l:'process.html#matching'},
    {c:'fab', q:'為什麼精度要求高的產品常在 FT（封裝後）再做一次修調？', o:['塑封應力透過壓阻效應改變電阻與 V_BE，讓參考電壓偏移', 'CP 時無法燒熔絲', 'FT 測試機比較準', '封裝後才有輸出電容'], e:'封裝應力可造成 0.1–0.5% 的偏移；封裝後修調（OTP、齊納）或 CP 預補償可以處理。', l:'process.html#trim-fuse'},
    {c:'fab', q:'多晶矽熔絲修調在長期使用後可能出現的問題是？', o:['未完全燒斷的熔絲再生長，修調值改變', '熔絲電阻永遠不變', '熔絲會自動燒斷', '只影響數位電路'], e:'燒錄不完全的熔絲在電遷移或高溫下可能重新導通，需燒錄後電阻門檻與 HTSL 驗證。', l:'process.html#trim-fuse'},
    // ---------- 設計 ----------
    {c:'des', q:'PMOS LDO 的輸出極點在負載電流增加時會？', o:['往高頻移動', '往低頻移動', '不變', '消失'], e:'R_out = r_o ∥ R_load 隨負載變小，p_out = 1/(2πR_out·C_OUT) 往高頻移動，接近次極點。', l:'design.html#ldo-loop'},
    {c:'des', q:'舊型 LDO 規格書中的「ESR 穩定區域」（tunnel of death）表示？', o:['ESR 太低或太高都會振盪', 'ESR 越低越穩定', 'ESR 越高越穩定', '只和溫度有關'], e:'ESR 零點可補相位，但太大時高頻增益抬高，碰到寄生極點又不穩定。', l:'design.html#esr-window'},
    {c:'des', q:'LDO 的高頻（數 MHz 以上）PSRR 主要由什麼決定？', o:['輸出電容與寄生耦合的分壓、電容 ESL', '誤差放大器 DC 增益', '參考電壓的雜訊', '軟啟動時間'], e:'迴路在高頻已沒有增益，靠 C_OUT 對耦合路徑分壓；ESL 諧振後 PSRR 又變差。', l:'design.html#psrr'},
    {c:'des', q:'同一顆可調 LDO，輸出設 3.3 V 比設 1.2 V 雜訊大，主要原因是？', o:['參考與 EA 雜訊被 (1 + R1/R2) 放大', '3.3 V 時傳輸元件較熱', '1.2 V 時 PSRR 較低', '電容 DC bias'], e:'雜訊主要來自參考與輸入級，回授分壓的增益越大，輸出雜訊越大；C_FF 可在高頻把增益拉回 1。', l:'design.html#noise'},
    {c:'des', q:'帶隙參考的基本原理是？', o:['把 CTAT 的 V_BE 與 PTAT 的 ΔV_BE 按比例相加', '用齊納二極體的崩潰電壓', '用電阻分壓電源', '用 MOS 的 V_T'], e:'V_BE 約 −2 mV/°C，ΔV_BE = (kT/q)ln N 與溫度成正比，相加後約 1.2 V、溫度係數近零。', l:'design.html#bandgap'},
    {c:'des', q:'折返限流（foldback）的主要風險是？', o:['重載或大電容負載可能啟動不起來', '短路時功耗變大', '輸出精度變差', '增加 I_Q'], e:'輸出低時允許電流也變小，若負載在低電壓就吸大電流，LDO 會卡在低電壓。', l:'design.html#protection'},
    {c:'des', q:'峰值電流模式在什麼情況下需要斜率補償？', o:['工作週期大於 50% 時，避免次諧波振盪', '輕載時', '輸入電壓很低時', '使用陶瓷電容時'], e:'D > 50% 時電流擾動逐週期放大；加入斜坡 S_e ≥ (S_f − S_n)/2 可抑制。', l:'design.html#dcdc-control'},
    {c:'des', q:'2 MHz Buck、t_ON,min = 60 ns、V_IN = 12 V，大約能穩定輸出的最低電壓是？', o:['約 1.4 V', '約 0.6 V', '約 3.3 V', '任意電壓'], e:'D_min = 60 ns / 500 ns = 12%，12 V × 12% ≈ 1.44 V，更低就會跳脈衝。', l:'design.html#gate-drive'},
    // ---------- 生產 ----------
    {c:'mfg', q:'Cpk = 1.33 對應的單邊超規比例約為？', o:['約 32 ppm', '約 1350 ppm', '約 0.3 ppm', '約 3 ppm'], e:'Cpk 1.33 = 4σ，單邊尾端約 31.7 ppm；1.67（5σ）約 0.3 ppm。', l:'production.html#cpk'},
    {c:'mfg', q:'CP 修調碼分佈逐漸往範圍的一端集中，代表？', o:['製程偏移，修調範圍快不夠用', '測試機故障', '修調演算法錯誤', '良率會上升'], e:'碼分佈是製程健康度的指標，靠近邊界時要檢查 WAT 參數或調整修調設計。', l:'production.html#cp-trim'},
    {c:'mfg', q:'PAT（部件平均測試）剔除的是？', o:['在規格內但明顯偏離同批分佈的離群品', '所有超規品', '外觀不良品', '所有邊緣晶粒'], e:'離群值常帶有潛在缺陷；AEC-Q001 以同批或同晶圓分佈計算動態界限。', l:'production.html#pat'},
    {c:'mfg', q:'MSL 3 的元件拆封後超過 168 小時才上件，可能造成？', o:['回焊時吸收的水氣汽化，造成分層或爆米花破裂', '焊錫不熔', '電性完全不受影響', '靜電損傷'], e:'超過車間壽命要依 J-STD-033 烘烤後再上件。', l:'production.html#assembly'},
    {c:'mfg', q:'JEDEC 測試板上量的 θ_JA，用在客戶板子上時應注意？', o:['只適用於標準測試板，實際板子可差 2 倍', '是元件常數，可直接套用', '只和封裝尺寸有關', '只在 25 °C 有效'], e:'θ_JA 取決於銅面積、層數與過孔；實際估算應用 Ψ_JT 搭配板上量測或模擬。', l:'production.html#assembly'},
    {c:'mfg', q:'封裝廠把金線換成銅線，正確做法是？', o:['評估封裝相關可靠度並發出 PCN', '電性一樣就不必通知客戶', '只需更新規格書', '只通知車用客戶'], e:'影響形狀、適配、功能、品質或可靠度的變更都要依 JESD46 通知，並附驗證資料。', l:'production.html#pcn'},
    {c:'mfg', q:'修調後的輸出分佈常不是常態分佈，直接套 Cpk 的問題是？', o:['可能誤判超規率，應看實際超規率或用非參數方法', 'Cpk 一定偏高', 'Cpk 一定是 0', '沒有問題'], e:'修調後殘差接近均勻分佈，尾端行為與常態不同。', l:'production.html#cpk'},
    // ---------- 測試 ----------
    {c:'tst', q:'量一顆 30 mΩ 開關的 R_DS(on) 時，為什麼要用 Kelvin 四線量測？', o:['排除 socket / 探針接觸電阻與走線壓降', '降低測試時間', '避免靜電', '提高測試電流'], e:'force 線送電流、sense 線在接腳量電壓，接觸電阻不影響讀值。', l:'test.html#kelvin'},
    {c:'tst', q:'GR&R 佔公差比例多少通常被視為良好？', o:['< 10%', '< 50%', '< 30% 一定不可接受', '沒有標準'], e:'< 10% 良好、10–30% 視情況、> 30% 不可接受。', l:'test.html#correlation'},
    {c:'tst', q:'AEC-Q100 典型的可靠度驗證樣本要求是？', o:['3 個批次 × 77 顆，零失效', '1 個批次 × 10 顆', '3 個批次 × 1000 顆，允許 1 顆失效', '只需 HTOL 一項'], e:'多數項目為 3 批 × 77 顆、0 失效，並比較前後參數漂移。', l:'test.html#qual'},
    {c:'tst', q:'IC 的 HBM 等級 ±2 kV，接在 USB 端口時能否承受 IEC 61000-4-2 ±8 kV？', o:['不能直接保證，系統需要外部 TVS', '可以，HBM 2 kV 等同系統 8 kV', '可以，只要有接地', '只要 CDM 合格即可'], e:'系統級放電的能量與電流遠大於 HBM，兩者是不同的規格。', l:'test.html#esd-lu'},
    {c:'tst', q:'用示波器長接地線量 Buck 輸出漣波時，看到數百 mV 尖峰，最可能是？', o:['接地迴路拾取 SW 磁場的量測假象', '輸出電容損壞', 'Buck 不穩定', '電感飽和'], e:'改用接地彈簧或同軸量測，直接量在電容兩端。', l:'test.html#bench'},
    {c:'tst', q:'量產時 LDO 熱關機溫度通常怎麼保證？', o:['靠設計與特性化，或用測試模式量內部溫度感測器', '每顆都加熱到 160 °C', '不需要保證', '客戶端自行測試'], e:'真的把每顆加熱到熱關機太耗時，多數以設計保證或測試模式間接量測。', l:'test.html#ldo-params'},
    {c:'tst', q:'HTOL 主要針對哪一類失效機制？', o:['氧化層、熱載子、電遷移、參數漂移', '封裝分層', '焊點疲勞', '濕氣腐蝕'], e:'高溫加最大工作電壓 1000 小時，加速晶片內部的退化機制。', l:'test.html#qual'},
    // ---------- 應用 ----------
    {c:'use', q:'10 µF / 0603 / 6.3 V X5R 電容在 3.3 V 偏壓下，有效容值大約剩？', o:['約 30–45%', '約 95%', '約 80%', '約 5%'], e:'高介電常數 MLCC 的 DC bias 衰減在小尺寸、低額定電壓時很嚴重，要查廠商曲線。', l:'application.html#capacitors'},
    {c:'use', q:'Buck 佈局最重要的原則是？', o:['把輸入電容 → 高側 → 低側的熱迴路面積做到最小', 'SW 節點鋪大面積銅', 'FB 走線靠近電感', '輸出電容放越遠越好'], e:'熱迴路的寄生電感決定 SW 振鈴與 EMI，輸入電容要緊貼 V_IN 與 PGND。', l:'application.html#layout'},
    {c:'use', q:'插上 12 V 適配器時輸入出現 20 V 以上尖峰，原因是？', o:['線材電感與低 ESR 陶瓷電容形成 LC 諧振', 'Buck 的反灌', '電感飽和', 'ESD'], e:'低阻尼 LC 的過衝可接近兩倍；加電解電容阻尼或 TVS。', l:'application.html#hot-plug'},
    {c:'use', q:'車用 Buck 常選 400 kHz 或 2.1 MHz 的原因是？', o:['避開 AM 廣播頻段（約 530–1700 kHz）', '效率最高', '電感最便宜', '法規強制'], e:'切換頻率與諧波落在 AM 頻段會干擾收音機。', l:'application.html#emi'},
    {c:'use', q:'由 Ψ_JT 估計接面溫度的方法是？', o:['T_J ≈ T_top + P_D × Ψ_JT', 'T_J = T_A + P_D × θ_JC', 'T_J = T_A × θ_JA', 'T_J = T_top − P_D × θ_JA'], e:'在板上量封裝頂部溫度，加上 P_D·Ψ_JT；用 θ_JC 會嚴重低估。', l:'application.html#thermal'},
    {c:'use', q:'LDO 接在 Buck 後面當後級濾波，最需要確認的 PSRR 是？', o:['Buck 切換頻率與其諧波處的 PSRR', '1 kHz 的 PSRR', 'DC 的線性調節率', '10 Hz 的 PSRR'], e:'要濾的是切換漣波；1 kHz 的漂亮數字不代表 2 MHz 也有。', l:'application.html#power-tree'},
    {c:'use', q:'輸出上有殘留電壓時啟動，同步 Buck 若不支援 pre-bias 可能？', o:['低側導通把輸出往下拉，甚至反向吸電流', '輸出電壓加倍', '完全沒影響', '切換頻率加倍'], e:'支援 pre-bias 的控制器在輸出電壓追上前不讓低側吸電流。', l:'application.html#sequencing'},
    {c:'use', q:'電感飽和電流 I_sat 應該大於？', o:['限流門檻（含漣波峰值），而非只大於最大負載', '平均負載電流', '輸入電流', '漣波電流'], e:'短路時電流會到限流門檻，電感若飽和，電流急升可能燒毀開關。', l:'application.html#inductor'},
    // ---------- 問題 / 客訴 ----------
    {c:'rel', q:'客戶說 LDO 振盪，最常見的根因是？', o:['有效輸出電容不足（DC bias、溫度、公差）', '晶片製程缺陷', '測試程式錯誤', '封裝分層'], e:'先查電容實際料號與 DC bias 曲線；換大一號電容常立刻解決。', l:'issues.html#oscillation'},
    {c:'rel', q:'輸出每隔數十 ms 到數秒掉電再恢復、晶片很燙，最可能是？', o:['熱關機循環（或 hiccup 限流）', '迴路高頻振盪', 'ESD 損傷', 'OTP 錯誤'], e:'先算 P_D 與實際 T_J；這類緩慢的開關不是迴路振盪。', l:'issues.html#thermal-shutdown'},
    {c:'rel', q:'判斷問題跟著 IC 還是跟著板子走，最有效的方法是？', o:['ABA 交換法：好壞 IC 互換板子', '換一台示波器', '重新燒錄韌體', '提高輸入電壓'], e:'問題跟著 IC 走才是晶片問題，跟著板子走就是應用或板子問題。', l:'issues.html#debug-tips'},
    {c:'rel', q:'8D 的 D4 根因分析為什麼要同時找「發生」與「流出」根因？', o:['只修發生原因，下次不同缺陷仍會因測試不足而流出', '格式要求而已', '流出根因比較好寫', '客戶只看流出根因'], e:'例如低溫才出現的 UVLO 異常：發生是製程偏移，流出是只測常溫。', l:'complaints.html#eight-d'},
    {c:'rel', q:'失效分析的基本順序原則是？', o:['先非破壞（外觀、X-ray、C-SAM、電性），後破壞（開封、去層）', '先開封再量電性', '先做 FIB', '順序不重要'], e:'破壞性步驟不可逆，每一步前都要拍照記錄。', l:'complaints.html#fa'},
    {c:'rel', q:'退回品 ATE 與實驗室全部通過（NTF），下一步應該？', o:['取得失效板與應用條件，檢查焊接、板子與使用條件', '直接結案為客戶誤判', '報廢樣品', '提高測試極限'], e:'NTF 不等於沒問題，把 IC 拆下來時可能把證據也毀了。', l:'complaints.html#c-ntf'},
    {c:'rel', q:'FA 看到功率元件大面積熔融，結論是 EOS。接下來最重要的是？', o:['找出能量來源並在客戶板上重現', '直接告知客戶是應用問題', '更換封裝', '提高 HBM 等級'], e:'EOS 是起點不是結論：熱插拔、反接、其他元件失效都可能是來源。', l:'complaints.html#c-eos'},
    {c:'rel', q:'客訴處理中，向客戶詢問的最有價值問題之一是？', o:['最近改了什麼（設計、供應商、製程、批次）？', '你們用哪一牌示波器？', '產品售價多少？', '工程師年資多久？'], e:'把變化點與失效開始時間對齊，常常就找到方向。', l:'complaints.html#info'},
    // ---------- SiC / 資料中心 ----------
    {c:'sic', q:'SiC 在同樣耐壓下導通電阻比 Si 低很多，主要原因是？', o:['臨界電場約高 10 倍，漂移區可以更薄、摻雜更濃', '電子遷移率比 Si 高很多', '晶圓比較便宜', '閘極氧化層比較薄'], e:'寬能隙帶來高臨界電場；依 R_sp ∝ BV^2.5 的關係，同耐壓下理論 R_sp 可低兩到三個數量級。', l:'sic.html#why-wbg'},
    {c:'sic', q:'為什麼 SiC 與 GaN 讓連續導通模式的圖騰柱 PFC 得以量產？', o:['反向恢復電荷 Q_rr 很小（GaN 幾乎為零），硬切換損失可接受', '它們的耐壓比 Si 低', '它們不需要閘極驅動', '它們只能用在 DCM'], e:'Si 超接面 MOSFET 的體二極體 Q_rr 太大，硬切換的圖騰柱臂會有巨大損失。', l:'sic.html#psu'},
    {c:'sic', q:'Infineon 2025 年發表的 12 kW AI 伺服器 PSU 參考設計，前級 PFC 與後級 DC/DC 分別用什麼？', o:['CoolSiC 三階飛跨電容 PFC ＋ CoolGaN 全橋 LLC', '全部用 Si 超接面 MOSFET', 'GaN PFC ＋ IGBT LLC', '二極體整流 ＋ 線性穩壓器'], e:'報導指出 PFC 峰值效率 > 99.0%、LLC > 98.5%，整體功率密度最高約 113 W/in³。', l:'sic.html#infineon'},
    {c:'sic', q:'AI 機櫃往 800 V 直流配電發展的主要原因是？', o:['同功率下電流降到約 1/15，減少銅排重量、壓降與空間', '800 V 比較安全', 'GPU 直接用 800 V 工作', '可以完全不需要轉換器'], e:'機櫃上百 kW 時 54 V 匯流排電流達數千安培；提高電壓可大幅減少電流。', l:'sic.html#hvdc'},
    {c:'sic', q:'SiC MOSFET 的閘極驅動和 Si 最常見的差異是？', o:['需要較高的開啟電壓（常見 +15–20 V），關斷常用 0 V 或負壓', '只需要 5 V 開啟', '不需要關斷電壓', '可以直接沿用 Si 的 12 V 驅動'], e:'SiC 跨導較低，開啟電壓不夠時 R_DS(on) 達不到規格；負壓關斷可防米勒誤導通。依資料手冊設定。', l:'sic.html#design'},
    {c:'sic', q:'高壓 SiC 元件在現場隨機燒毀、又找不到過壓事件，應該考慮哪一種機制？', o:['宇宙射線中子引發的單粒子燒毀（SEB），與電壓降額有關', '電容 DC bias', 'MSL 吸濕', '熔絲再生長'], e:'SEB 的 FIT 率隨施加電壓佔額定的比例急速上升，HVDC 設計要做電壓降額。', l:'sic.html#test-rel'}
  ];
  const QEN = [
    // ---------- Architecture ----------
    {q:'An LDO drops 3.6 V to 1.8 V with negligible I_Q. Its best-case efficiency is about?', o:['50%', '90%', '36%', '72%'], e:'LDO efficiency ≈ V_OUT / V_IN = 1.8 / 3.6 = 50%; the rest of the headroom becomes heat.'},
    {q:'An LDO drops 5 V to 3.3 V at 500 mA. How much power does it dissipate?', o:['0.85 W', '1.65 W', '2.5 W', '0.33 W'], e:'P_D = (5 − 3.3) × 0.5 = 0.85 W. A SOT-23 at ~200 °C/W would rise 170 °C.'},
    {q:'Compared with a PMOS LDO, the main cost of an NMOS (source-follower) LDO is?', o:['The gate must sit above V_OUT + V_GS, needing a bias rail or charge pump', 'High output impedance that is hard to stabilise', 'Worse PSRR', 'It cannot deliver high current'], e:'NMOS output impedance is about 1/g_m, so stability and PSRR are good, but the gate drive must be above the output.'},
    {q:'An ideal synchronous buck runs from 12 V to 3 V. The duty cycle is about?', o:['25%', '75%', '400%', '33%'], e:'Ideal buck: D = V_OUT / V_IN = 3 / 12 = 25%.'},
    {q:'What happens when a synchronous buck is forced to PWM (FPWM) at light load?', o:['Inductor current goes negative; light-load efficiency is poor but ripple and frequency stay fixed', 'It enters DCM automatically', 'The output voltage rises', 'The switching frequency drops'], e:'Forced CCM lets the low side pull the inductor current negative; the circulating energy costs efficiency but the frequency is fixed and ripple predictable.'},
    {q:'Why is it harder to push loop bandwidth up in a boost than in a buck?', o:['The right-half-plane zero (RHPZ)', 'Discontinuous input current', 'No synchronous rectification', 'It needs a larger output capacitor'], e:'The RHPZ raises gain while removing phase; crossover is usually kept below 1/3–1/5 of the RHPZ.'},
    {q:'Why do phone fast chargers use a 2:1 charge pump instead of a buck for the main conversion?', o:['At the right ratio it reaches 97–98% efficiency, with far less heat', 'It can output any voltage', 'It needs no capacitors', 'It has the lowest noise'], e:'A charge pump is very efficient at its fixed ratio; the USB input is set to about twice the battery voltage and then halved.'},
    // ---------- Process ----------
    {q:'What do B, C and D stand for in BCD?', o:['Bipolar, CMOS, DMOS', 'Buck, Charge pump, DC-DC', 'Bandgap, Comparator, Driver', 'Buried, Channel, Drain'], e:'BCD integrates bipolar transistors (analogue precision), CMOS (logic) and DMOS (power).'},
    {q:'The silicon limit relating LDMOS specific on-resistance R_sp to breakdown BV is roughly?', o:['R_sp ∝ BV^2.5', 'R_sp ∝ BV', 'R_sp ∝ 1/BV', 'They are unrelated'], e:'Higher voltage needs a longer, lighter drift region, so resistance rises fast; RESURF, field plates and super-junctions push toward this limit.'},
    {q:'During buck dead time the SW node is pulled about 0.7 V below ground. The main side effect is?', o:['Minority carriers are injected into the substrate, disturbing nearby analogue circuits or even triggering latch-up', 'The output voltage rises', 'Gate-oxide breakdown', 'Inductor saturation'], e:'The N-type drain forward-biases to the P substrate; electrons are collected by nearby N-wells. Fixes: guard rings, DTI, shorter dead time.'},
    {q:'To halve the σ of V_T mismatch between two MOS devices, the area must become about?', o:['4×', '2×', '√2×', '8×'], e:'Pelgrom: σ(ΔV_T) = A_VT / √(WL); four times the area halves σ.'},
    {q:'Why do high-precision products often trim again at FT (after packaging)?', o:['Mould stress shifts resistors and V_BE via the piezoresistive effect, moving the reference', 'Fuses cannot be blown at CP', 'FT testers are more accurate', 'Only after packaging is there an output capacitor'], e:'Package stress can shift the output by 0.1–0.5%; post-package trim (OTP, zener zap) or CP pre-compensation handles it.'},
    {q:'What can go wrong with poly-fuse trim over the product lifetime?', o:['A partly blown fuse regrows and the trim value changes', 'Fuse resistance never changes', 'Fuses blow by themselves', 'It only affects digital circuits'], e:'An incompletely blown fuse can reconnect under electromigration or high temperature; post-blow resistance limits and HTSL checks catch it.'},
    // ---------- Design ----------
    {q:'As load current rises, the output pole of a PMOS LDO moves?', o:['To higher frequency', 'To lower frequency', 'Nowhere', 'It disappears'], e:'R_out = r_o ∥ R_load shrinks with load, so p_out = 1/(2πR_out·C_OUT) moves up toward the second pole.'},
    {q:'The "ESR stability region" (tunnel of death) in old LDO datasheets means?', o:['Both too-low and too-high ESR cause oscillation', 'Lower ESR is always more stable', 'Higher ESR is always more stable', 'It only depends on temperature'], e:'The ESR zero restores phase, but too much ESR lifts high-frequency gain into the parasitic poles.'},
    {q:'What mainly sets LDO PSRR above a few MHz?', o:['The divider formed by the output capacitor and parasitic coupling, plus capacitor ESL', 'Error-amplifier DC gain', 'Reference noise', 'Soft-start time'], e:'The loop has no gain at high frequency; C_OUT divides the coupled ripple until ESL resonance, after which PSRR worsens.'},
    {q:'The same adjustable LDO is noisier set to 3.3 V than to 1.2 V, mainly because?', o:['Reference and EA noise are amplified by (1 + R1/R2)', 'The pass device is hotter at 3.3 V', 'PSRR is lower at 1.2 V', 'Capacitor DC bias'], e:'Noise comes mostly from the reference and input stage; a larger feedback gain gives more output noise. C_FF pulls the high-frequency gain back to 1.'},
    {q:'The basic principle of a bandgap reference is?', o:['Add the CTAT V_BE and the PTAT ΔV_BE in the right ratio', 'Use a zener breakdown voltage', 'Divide the supply with resistors', 'Use the MOS V_T'], e:'V_BE moves about −2 mV/°C and ΔV_BE = (kT/q)ln N is proportional to temperature; the sum is about 1.2 V with near-zero tempco.'},
    {q:'The main risk of foldback current limiting is?', o:['Heavy or high-capacitance loads may fail to start up', 'Higher short-circuit dissipation', 'Worse output accuracy', 'Higher I_Q'], e:'At low output the allowed current is small; if the load draws heavily at low voltage the LDO latches at a low voltage.'},
    {q:'When does peak current mode need slope compensation?', o:['Above 50% duty cycle, to prevent subharmonic oscillation', 'At light load', 'At very low input voltage', 'With ceramic capacitors'], e:'Above D = 50% current perturbations grow cycle by cycle; a ramp S_e ≥ (S_f − S_n)/2 suppresses them.'},
    {q:'A 2 MHz buck has t_ON,min = 60 ns and V_IN = 12 V. The lowest output it can regulate at fixed frequency is about?', o:['About 1.4 V', 'About 0.6 V', 'About 3.3 V', 'Any voltage'], e:'D_min = 60 ns / 500 ns = 12%; 12 V × 12% ≈ 1.44 V. Lower than that and it skips pulses.'},
    // ---------- Production ----------
    {q:'Cpk = 1.33 corresponds to a one-sided out-of-spec rate of about?', o:['About 32 ppm', 'About 1350 ppm', 'About 0.3 ppm', 'About 3 ppm'], e:'Cpk 1.33 = 4σ, a one-sided tail of about 31.7 ppm; 1.67 (5σ) is about 0.3 ppm.'},
    {q:'The CP trim-code distribution is drifting toward one end of the range. This means?', o:['The process has shifted and the trim range is running out', 'The tester is broken', 'The trim algorithm is wrong', 'Yield will rise'], e:'The code distribution is a process-health indicator; near the limit, check WAT parameters or revisit the trim design.'},
    {q:'What does PAT (part average testing) remove?', o:['Outliers that are within spec but far from the lot distribution', 'All out-of-spec parts', 'Cosmetic rejects', 'All edge dies'], e:'Outliers often carry latent defects; AEC-Q001 computes dynamic limits from the lot or wafer distribution.'},
    {q:'An MSL 3 part is mounted more than 168 hours after the bag was opened. What can happen?', o:['Absorbed moisture vaporises in reflow, causing delamination or popcorn cracking', 'The solder will not melt', 'Nothing electrical', 'ESD damage'], e:'Past the floor life, parts must be baked per J-STD-033 before mounting.'},
    {q:'When using a θ_JA measured on a JEDEC board for a customer board, keep in mind?', o:['It applies only to the standard board; real boards can differ by 2×', 'It is a device constant', 'It only depends on package size', 'It is valid only at 25 °C'], e:'θ_JA depends on copper area, layer count and vias; estimate with Ψ_JT plus on-board measurement or simulation.'},
    {q:'The assembly house wants to switch from gold to copper wire. The right approach is?', o:['Evaluate package reliability and issue a PCN', 'No need to tell customers if electricals match', 'Just update the datasheet', 'Only tell automotive customers'], e:'Changes affecting form, fit, function, quality or reliability require notification per JESD46, with qualification data.'},
    {q:'Post-trim distributions are often not normal. What is wrong with applying Cpk directly?', o:['It can misjudge the out-of-spec rate; use the actual rate or non-parametric methods', 'Cpk is always too high', 'Cpk is always zero', 'Nothing'], e:'Post-trim residuals are close to uniform, so the tails do not behave like a normal distribution.'},
    // ---------- Test ----------
    {q:'Why measure a 30 mΩ switch R_DS(on) with four-wire Kelvin sensing?', o:['To remove socket / probe contact resistance and trace drop', 'To shorten test time', 'To avoid ESD', 'To raise the test current'], e:'Force wires carry current and sense wires measure at the pins, so contact resistance does not affect the reading.'},
    {q:'What GR&R percentage of tolerance is usually considered good?', o:['< 10%', '< 50%', '< 30% is always unacceptable', 'There is no standard'], e:'< 10% good, 10–30% conditional, > 30% unacceptable.'},
    {q:'What is the typical AEC-Q100 reliability sample requirement?', o:['3 lots × 77 units, zero failures', '1 lot × 10 units', '3 lots × 1000 units, one failure allowed', 'Only HTOL'], e:'Most tests are 3 lots × 77 units with 0 fails, plus a comparison of pre/post parameter drift.'},
    {q:'An IC is rated ±2 kV HBM. On a USB port, will it survive IEC 61000-4-2 ±8 kV?', o:['Not guaranteed; the system needs an external TVS', 'Yes, 2 kV HBM equals 8 kV system', 'Yes, if grounded', 'Yes, if CDM passes'], e:'System-level discharges carry far more energy and current than HBM; they are different specifications.'},
    {q:'Measuring buck output ripple with a long scope ground lead shows spikes of hundreds of mV. Most likely?', o:['A measurement artefact: the ground loop picks up the SW magnetic field', 'A failed output capacitor', 'An unstable buck', 'Inductor saturation'], e:'Use a ground spring or coax and measure right across the capacitor.'},
    {q:'How is LDO thermal-shutdown temperature usually guaranteed in production?', o:['By design and characterisation, or via a test mode reading the on-chip sensor', 'Heating every unit to 160 °C', 'It does not need guaranteeing', 'The customer tests it'], e:'Heating every unit to shutdown is too slow; most products rely on design or indirect test-mode measurement.'},
    {q:'HTOL mainly targets which failure mechanisms?', o:['Oxide, hot carriers, electromigration, parametric drift', 'Package delamination', 'Solder-joint fatigue', 'Moisture corrosion'], e:'1000 hours at high temperature and maximum voltage accelerates on-die degradation.'},
    // ---------- Applications ----------
    {q:'A 10 µF / 0603 / 6.3 V X5R capacitor at 3.3 V bias keeps roughly how much capacitance?', o:['About 30–45%', 'About 95%', 'About 80%', 'About 5%'], e:'DC-bias loss in high-k MLCCs is severe in small cases with low rated voltage; check the vendor curve.'},
    {q:'The most important buck layout rule is?', o:['Minimise the hot-loop area: input cap → high side → low side', 'Pour a large copper area on SW', 'Route FB next to the inductor', 'Place the output cap as far as possible'], e:'Hot-loop parasitic inductance sets SW ringing and EMI; the input capacitor must hug V_IN and PGND.'},
    {q:'Plugging in a 12 V adapter produces a spike above 20 V at the input. Why?', o:['Cable inductance resonates with the low-ESR ceramic capacitor', 'Buck reverse current', 'Inductor saturation', 'ESD'], e:'An under-damped LC can overshoot to nearly twice the supply; add an electrolytic for damping or a TVS.'},
    {q:'Why do automotive bucks often run at 400 kHz or 2.1 MHz?', o:['To stay out of the AM broadcast band (about 530–1700 kHz)', 'Highest efficiency', 'Cheapest inductors', 'Mandated by law'], e:'Switching frequency and harmonics in the AM band interfere with the radio.'},
    {q:'How is junction temperature estimated from Ψ_JT?', o:['T_J ≈ T_top + P_D × Ψ_JT', 'T_J = T_A + P_D × θ_JC', 'T_J = T_A × θ_JA', 'T_J = T_top − P_D × θ_JA'], e:'Measure the package top on the board and add P_D·Ψ_JT; using θ_JC badly underestimates.'},
    {q:'For an LDO post-regulating a buck, which PSRR matters most?', o:['PSRR at the buck switching frequency and its harmonics', 'PSRR at 1 kHz', 'DC line regulation', 'PSRR at 10 Hz'], e:'The target is switching ripple; a great 1 kHz number says nothing about 2 MHz.'},
    {q:'A synchronous buck without pre-bias support starts into a pre-charged output. It may?', o:['Turn on the low side and pull the output down, even sinking current', 'Double the output voltage', 'Behave normally', 'Double the switching frequency'], e:'Pre-bias-safe controllers keep the low side from sinking until the reference catches up.'},
    {q:'An inductor saturation current I_sat should exceed?', o:['The current-limit threshold including ripple peak, not just maximum load', 'Average load current', 'Input current', 'Ripple current'], e:'In a short the current reaches the limit; a saturating inductor lets current spike and can destroy the switch.'},
    // ---------- Issues / complaints ----------
    {q:'A customer reports LDO oscillation. The most common root cause is?', o:['Insufficient effective output capacitance (DC bias, temperature, tolerance)', 'A wafer process defect', 'A test-program error', 'Package delamination'], e:'Check the actual capacitor part and its DC-bias curve; a larger case size often fixes it immediately.'},
    {q:'The output drops out and recovers every tens of ms to seconds, and the IC is hot. Most likely?', o:['Thermal-shutdown cycling (or hiccup current limit)', 'High-frequency loop oscillation', 'ESD damage', 'Wrong OTP'], e:'Calculate P_D and the real T_J; this slow on/off is not loop oscillation.'},
    {q:'The most effective way to tell whether a problem follows the IC or the board is?', o:['ABA swap: exchange good and bad ICs between boards', 'Use a different oscilloscope', 'Reflash the firmware', 'Raise the input voltage'], e:'If the problem follows the IC it is a chip issue; if it stays with the board it is application or board.'},
    {q:'Why must 8D step D4 find both the occurrence and the escape root cause?', o:['Fixing only occurrence lets the next defect escape through the same test gap', 'It is just the format', 'Escape causes are easier to write', 'Customers only read escape causes'], e:'Example: a cold-only UVLO fault — occurrence is a process shift, escape is testing only at room temperature.'},
    {q:'The basic ordering rule for failure analysis is?', o:['Non-destructive first (visual, X-ray, C-SAM, electrical), destructive later (decap, delayering)', 'Decap before electrical test', 'FIB first', 'Order does not matter'], e:'Destructive steps cannot be undone; photograph everything before each step.'},
    {q:'Returned parts all pass ATE and bench tests (NTF). Next step?', o:['Get the failing board and conditions; check soldering, the board and usage', 'Close it as customer error', 'Scrap the samples', 'Tighten test limits'], e:'NTF is not "no problem"; removing the IC may have destroyed the evidence.'},
    {q:'FA finds a large melted area in the power device: EOS. What matters most next?', o:['Find the energy source and reproduce it on the customer board', 'Tell the customer it is their problem', 'Change the package', 'Raise the HBM rating'], e:'EOS is a starting point, not a conclusion: hot plug, reverse polarity or another failing part can be the source.'},
    {q:'One of the most valuable questions to ask a complaining customer is?', o:['What changed recently (design, supplier, process, lot)?', 'Which scope brand do you use?', 'What does the product sell for?', 'How senior are your engineers?'], e:'Lining up change points with when failures began often points straight at the cause.'},
    // ---------- SiC / data center ----------
    {q:'Why does SiC have much lower on-resistance than Si at the same voltage rating?', o:['Its critical field is about 10× higher, so the drift region can be thinner and more heavily doped', 'Its electron mobility is much higher than Si', 'Its wafers are cheaper', 'Its gate oxide is thinner'], e:'The wide bandgap gives a high critical field; with R_sp ∝ BV^2.5, theoretical R_sp at the same rating is two to three orders of magnitude lower.'},
    {q:'Why did SiC and GaN make continuous-conduction totem-pole PFC mass-producible?', o:['Their reverse-recovery charge Q_rr is small (near zero for GaN), so hard-switching loss is acceptable', 'They have lower voltage ratings than Si', 'They need no gate drive', 'They only work in DCM'], e:'Si super-junction body-diode Q_rr is too large; a hard-switched totem-pole leg would lose far too much.'},
    {q:'In Infineon\'s 2025 12 kW AI-server PSU reference design, what are the PFC and DC/DC stages built with?', o:['CoolSiC three-level flying-capacitor PFC + CoolGaN full-bridge LLC', 'All Si super-junction MOSFETs', 'GaN PFC + IGBT LLC', 'Diode rectifier + linear regulator'], e:'Coverage reports PFC peak efficiency > 99.0%, LLC > 98.5%, and power density up to about 113 W/in³.'},
    {q:'The main reason AI racks are moving to 800 V DC distribution is?', o:['Current drops to about 1/15 for the same power, cutting busbar copper, drop and space', '800 V is safer', 'GPUs run directly from 800 V', 'It removes the need for converters'], e:'At hundreds of kW per rack a 54 V busbar carries thousands of amps; raising the voltage cuts current dramatically.'},
    {q:'The most common difference between SiC and Si MOSFET gate drive is?', o:['SiC needs a higher turn-on voltage (commonly +15–20 V) and often 0 V or negative turn-off', 'SiC turns on with only 5 V', 'SiC needs no turn-off voltage', 'A Si 12 V driver can be reused as is'], e:'SiC transconductance is lower, so too little turn-on voltage misses rated R_DS(on); negative turn-off prevents Miller false turn-on. Follow the datasheet.'},
    {q:'High-voltage SiC devices burn out randomly in the field with no overvoltage event found. Which mechanism should you consider?', o:['Cosmic-ray neutron single-event burnout (SEB), linked to voltage derating', 'Capacitor DC bias', 'MSL moisture absorption', 'Fuse regrowth'], e:'SEB FIT rises steeply with applied voltage as a fraction of rating, so HVDC designs need voltage derating.'}
  ];
  if(EN) Q.forEach((q, i) => Object.assign(q, QEN[i]));

  const $ = id => document.getElementById(id);
  const store = (k, v) => { try { if(v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch(e){ return null; } };
  const shuffle = a => { for(let i = a.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const esc = s => s.replace(/[&<>]/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;'}[c]));
  const sel = new Set(Object.keys(CH));
  let run = null;

  function setup(){
    $('qz-chips').innerHTML = Object.entries(CH).map(([k, v]) => '<button class="btn" type="button" data-c="' + k + '" aria-pressed="true">' + v + ' <small style="opacity:.7">' + Q.filter(q => q.c === k).length + '</small></button>').join('');
    $('qz-chips').addEventListener('click', e => {
      const b = e.target.closest('button'); if(!b) return;
      const c = b.dataset.c;
      if(sel.has(c) && sel.size > 1) sel.delete(c); else sel.add(c);
      [...$('qz-chips').children].forEach(x => x.setAttribute('aria-pressed', sel.has(x.dataset.c) ? 'true' : 'false'));
      count();
    });
    $('qz-n').addEventListener('change', count);
    $('qz-start').addEventListener('click', start);
    count();
    const best = store('pmic-quiz-best');
    $('qz-best').textContent = best ? t('最佳紀錄：', 'Best: ') + best : '';
  }
  function count(){ $('qz-count').textContent = t('題庫 ', '') + Q.filter(q => sel.has(q.c)).length + t(' 題', ' questions'); }
  function start(){
    const pool = shuffle(Q.filter(q => sel.has(q.c)).slice());
    const n = $('qz-n').value === 'all' ? pool.length : Math.min(+$('qz-n').value, pool.length);
    run = {qs: pool.slice(0, n).map(q => Object.assign({}, q, {opts: shuffle(q.o.map((t, i) => ({t, ok: i === 0})))})), i:0, score:0, wrong:[]};
    $('qz-setup').hidden = true; $('qz-end').hidden = true; $('qz-card').hidden = false;
    show();
  }
  function show(){
    const q = run.qs[run.i];
    $('qz-prog').style.width = (run.i / run.qs.length * 100) + '%';
    $('qz-meta').innerHTML = '<span class="tag ' + q.c + '">' + CH[q.c] + '</span>' + t('第 ', 'Question ') + (run.i + 1) + ' / ' + run.qs.length + t(' 題 · 得分 ', ' · score ') + run.score;
    $('qz-q').textContent = q.q;
    $('qz-opts').innerHTML = q.opts.map((o, i) => '<button class="qopt" type="button" data-i="' + i + '"><b>' + 'ABCD'[i] + '</b><span>' + esc(o.t) + '</span></button>').join('');
    $('qz-fb').hidden = true;
    $('qz-opts').querySelector('button').focus({preventScroll:true});
  }
  function answer(i){
    const q = run.qs[run.i]; if(q.done) return; q.done = true;
    const ok = q.opts[i].ok;
    if(ok) run.score++; else run.wrong.push(q);
    [...$('qz-opts').children].forEach((b, k) => { b.disabled = true; if(q.opts[k].ok) b.classList.add('right'); else if(k === i) b.classList.add('wrong'); });
    $('qz-fb').hidden = false;
    $('qz-fb').innerHTML = '<p class="' + (ok ? 'okc' : 'badc') + '"><b>' + (ok ? t('答對了', 'Correct') : t('答錯了', 'Not quite')) + '</b></p><p>' + esc(q.e) + '</p><p><a href="' + q.l + '">' + t('複習這一節 →', 'Review this section →') + '</a></p>' +
      '<button class="btn pri" id="qz-next" type="button">' + (run.i + 1 < run.qs.length ? t('下一題 →', 'Next →') : t('看結果', 'See results')) + '</button>';
    $('qz-next').addEventListener('click', next);
    $('qz-next').focus({preventScroll:true});
  }
  function next(){ run.i++; if(run.i < run.qs.length) show(); else end(); }
  function end(){
    $('qz-card').hidden = true; $('qz-end').hidden = false;
    const pct = Math.round(run.score / run.qs.length * 100);
    const prev = store('pmic-quiz-best'), prevPct = prev ? parseInt(prev, 10) : -1;
    if(pct > prevPct) store('pmic-quiz-best', pct + '% (' + run.score + '/' + run.qs.length + ')');
    const by = {};
    run.qs.forEach(q => { by[q.c] = by[q.c] || [0, 0]; by[q.c][1]++; if(!run.wrong.includes(q)) by[q.c][0]++; });
    $('qz-score').innerHTML = '<div class="metrics">' +
      '<div class="metric ' + (pct >= 80 ? 'ok' : pct >= 60 ? 'warn' : 'bad') + '"><div class="ml">' + t('得分', 'Score') + '</div><div class="mv">' + pct + ' <small>%</small></div><div class="ms">' + run.score + ' / ' + run.qs.length + t(' 題', '') + '</div></div>' +
      Object.entries(by).map(([c, v]) => '<div class="metric"><div class="ml">' + CH[c] + '</div><div class="mv">' + v[0] + ' <small>/ ' + v[1] + '</small></div></div>').join('') + '</div>';
    $('qz-review').innerHTML = run.wrong.length ? '<h3>' + t('答錯的題目', 'Missed questions') + '</h3>' + run.wrong.map(q => '<div class="rev"><p><span class="tag ' + q.c + '">' + CH[q.c] + '</span>' + esc(q.q) + '</p><p class="note">' + t('正解：', 'Answer: ') + esc(q.o[0]) + t('。', '. ') + esc(q.e) + ' <a href="' + q.l + '">' + t('複習 →', 'Review →') + '</a></p></div>').join('') : '<p>' + t('全部答對，太強了。', 'All correct — impressive.') + '</p>';
    $('qz-best').textContent = t('最佳紀錄：', 'Best: ') + (store('pmic-quiz-best') || pct + '%');
  }
  $('qz-opts').addEventListener('click', e => { const b = e.target.closest('button[data-i]'); if(b) answer(+b.dataset.i); });
  document.addEventListener('keydown', e => {
    if(!run || $('qz-card').hidden || /input|select|textarea/i.test(document.activeElement.tagName)) return;
    const k = 'abcd'.indexOf(e.key.toLowerCase()), n = '1234'.indexOf(e.key);
    const i = k >= 0 ? k : n;
    if(i >= 0 && i < run.qs[run.i].opts.length && !run.qs[run.i].done) answer(i);
  });
  $('qz-again').addEventListener('click', start);
  $('qz-back').addEventListener('click', () => { $('qz-end').hidden = true; $('qz-setup').hidden = false; });
  setup();
})();
