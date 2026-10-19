/* PMIC Lab — a circuit next to every experiment, showing which part each slider changes.
   Components carry data-k="<slider ids>"; the one being changed (or swept) lights up, hovering a component
   highlights its slider, clicking it jumps there. Values are read live from the controls and metrics. */
(function(){
  const t = (window.MemSite && window.MemSite.t) || (zh => zh);
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>]/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;'}[c]));

  /* ---------- live values ---------- */
  function val(id){
    const el = $(id); if(!el) return '';
    if(el.tagName === 'SELECT') return el.options[el.selectedIndex].text.split(/[（(]/)[0].trim();
    if(el.classList.contains('btnrow')){ const b = el.querySelector('[aria-pressed="true"]'); return b ? b.textContent.split(/[（(]/)[0].trim() : ''; }
    const o = $(id + '-o'); return o && o.textContent ? o.textContent : el.value;
  }
  const metric = (box, n) => { const m = document.querySelectorAll('#' + box + ' .metric')[n]; return m ? m.querySelector('.mv').textContent.replace(/\s+/g, ' ').trim() : ''; };

  /* ---------- drawing primitives (SVG strings) ---------- */
  const W = (x1, y1, x2, y2) => '<line class="w" x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '"/>';
  const P = (d, cls) => '<path class="' + (cls || 'w') + '" d="' + d + '"/>';
  const dot = (x, y) => '<circle class="fi" cx="' + x + '" cy="' + y + '" r="3"/>';
  const T = (x, y, s, a, extra) => '<text class="ts" x="' + x + '" y="' + y + '" text-anchor="' + (a || 'middle') + '"' + (extra || '') + '>' + s + '</text>';
  const TB = (x, y, s, a) => '<text x="' + x + '" y="' + y + '" text-anchor="' + (a || 'middle') + '" style="font-size:12.5px;font-weight:600">' + s + '</text>';
  const box = (x, y, w, h, cls) => '<rect class="' + (cls || 'box') + '" x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="5"/>';
  const resV = (x, y1, y2) => { const l = y2 - y1, a = y1 + l * 0.2, b = y1 + l * 0.8; return W(x, y1, x, a) + '<rect class="box" x="' + (x - 7) + '" y="' + a + '" width="14" height="' + (b - a) + '" rx="2"/>' + W(x, b, x, y2); };
  const capV = (x, y1, y2, wide) => { const m = (y1 + y2) / 2, h = wide || 14; return W(x, y1, x, m - 4) + '<line class="wt" x1="' + (x - h) + '" y1="' + (m - 4) + '" x2="' + (x + h) + '" y2="' + (m - 4) + '"/><line class="wt" x1="' + (x - h) + '" y1="' + (m + 4) + '" x2="' + (x + h) + '" y2="' + (m + 4) + '"/>' + W(x, m + 4, x, y2); };
  const ind = (x1, x2, y) => { const n = 4, w = (x2 - x1) / n; let d = 'M' + x1 + ' ' + y; for(let i = 0; i < n; i++) d += 'c0-' + (w * 0.9).toFixed(1) + ' ' + w.toFixed(1) + '-' + (w * 0.9).toFixed(1) + ' ' + w.toFixed(1) + ' 0'; return P(d); };
  const isrc = (x, y1, y2) => { const m = (y1 + y2) / 2; return W(x, y1, x, m - 14) + '<circle class="box" cx="' + x + '" cy="' + m + '" r="14"/>' + P('M' + x + ' ' + (m - 8) + 'v16m-5-6 5 6 5-6') + W(x, m + 14, x, y2); };
  const vsrc = (x, y1, y2) => { const m = (y1 + y2) / 2; return W(x, y1, x, m - 14) + '<circle class="box" cx="' + x + '" cy="' + m + '" r="14"/>' + T(x, m - 2, '+') + T(x, m + 10, '−') + W(x, m + 14, x, y2); };
  const gnd = (x, y) => P('M' + (x - 10) + ' ' + y + 'h20M' + (x - 6) + ' ' + (y + 4) + 'h12M' + (x - 2) + ' ' + (y + 8) + 'h4');
  const tri = (x1, y1, x2, y2) => '<path class="c3" d="M' + x1 + ' ' + y1 + ' L' + x1 + ' ' + y2 + ' L' + x2 + ' ' + ((y1 + y2) / 2) + ' Z"/>';
  const G = (keys, inner) => '<g class="el" data-k="' + keys + '">' + inner + '</g>';

  /* ---------- one schematic per experiment ---------- */
  const SCH = {
    bode: () => ({vb:'0 0 700 270', svg:
      vsrc(40, 50, 240) + T(40, 38, 'V<tspan baseline-shift="sub" font-size="8">IN</tspan>') +
      W(40, 50, 250, 50) + box(250, 30, 90, 40, 'c1') + TB(295, 55, 'PMOS') +
      W(340, 50, 680, 50) + T(680, 40, 'V<tspan baseline-shift="sub" font-size="8">OUT</tspan> 1.8 V', 'end') +
      W(410, 50, 410, 80) + resV(410, 80, 125) + T(426, 106, 'R1', 'start') + resV(410, 125, 170) + T(426, 151, 'R2', 'start') + W(410, 170, 410, 240) + dot(410, 125) +
      W(410, 125, 360, 125) + W(360, 125, 360, 100) + W(360, 100, 230, 100) + W(230, 100, 230, 130) + W(230, 130, 250, 130) + T(372, 118, 'FB', 'start') +
      G('bd-mode', tri(250, 110, 320, 190) + T(258, 134, '−') + T(258, 175, '+') + T(285, 154, 'EA') + T(285, 212, esc(val('bd-mode')))) +
      W(320, 150, 345, 150) + W(345, 150, 345, 85) + W(345, 85, 295, 85) + W(295, 85, 295, 70) +
      box(140, 152, 70, 36, 'c2') + T(175, 174, 'V<tspan baseline-shift="sub" font-size="8">REF</tspan>') + W(210, 170, 250, 170) + W(175, 188, 175, 240) +
      W(510, 50, 510, 70) + G('bd-esr', resV(510, 70, 110) + T(526, 94, 'ESR ' + esc(val('bd-esr')), 'start')) +
      G('bd-c', capV(510, 110, 150) + T(526, 134, 'C<tspan baseline-shift="sub" font-size="8">OUT</tspan> ' + esc(val('bd-c')), 'start')) + W(510, 150, 510, 240) +
      G('bd-i', isrc(620, 50, 240) + T(640, 140, 'I<tspan baseline-shift="sub" font-size="8">LOAD</tspan>', 'start') + T(640, 156, esc(val('bd-i')), 'start')) +
      W(40, 240, 620, 240) + gnd(330, 240),
      note:t('輸出極點 p<sub>out</sub> = 1/(2π(R<sub>out</sub>+ESR)·C<sub>OUT</sub>)：I<sub>LOAD</sub> 越大，R<sub>out</sub> 越小，極點往高頻移動；ESR 和 C<sub>OUT</sub> 決定零點 z<sub>ESR</sub> = 1/(2π·ESR·C<sub>OUT</sub>)；「補償方式」改的是 EA 內部有沒有自己的零點。',
             'Output pole p<sub>out</sub> = 1/(2π(R<sub>out</sub>+ESR)·C<sub>OUT</sub>): more I<sub>LOAD</sub> means smaller R<sub>out</sub>, so the pole moves up; ESR and C<sub>OUT</sub> set the zero z<sub>ESR</sub> = 1/(2π·ESR·C<sub>OUT</sub>); "Compensation" changes whether the EA has its own internal zero.')}),

    psrr: () => ({vb:'0 0 660 230', svg:
      G('ps-fsw', box(20, 50, 100, 70, 'c1') + TB(70, 78, 'Buck') + T(70, 100, 'f<tspan baseline-shift="sub" font-size="8">SW</tspan> ' + esc(val('ps-fsw')))) + W(70, 120, 70, 200) +
      W(120, 85, 240, 85) +
      G('ps-rip', P('M138 66c5-10 10-10 15 0s10 10 15 0 10-10 15 0', 'wa') + T(160, 52, t('漣波 ', 'ripple ') + esc(val('ps-rip')))) +
      G('ps-hr', T(180, 106, 'V<tspan baseline-shift="sub" font-size="8">IN</tspan> = V<tspan baseline-shift="sub" font-size="8">OUT</tspan> + ' + esc(val('ps-hr')))) +
      box(240, 40, 130, 90, 'c3') + TB(305, 58, 'LDO') +
      G('ps-pass', box(258, 66, 94, 22, 'box') + T(305, 81, t('傳輸元件 ', 'pass ') + esc(val('ps-pass')))) +
      G('ps-bw', T(305, 108, t('迴路頻寬 ', 'loop BW ') + esc(val('ps-bw')))) + W(305, 130, 305, 200) +
      W(370, 85, 640, 85) + T(640, 75, 'V<tspan baseline-shift="sub" font-size="8">OUT</tspan>', 'end') +
      G('ps-c', capV(440, 85, 200) + T(426, 146, 'C<tspan baseline-shift="sub" font-size="8">OUT</tspan> ' + esc(val('ps-c')), 'end')) +
      G('ps-i', isrc(570, 85, 200) + T(588, 146, 'I ' + esc(val('ps-i')), 'start')) +
      W(70, 200, 570, 200) + gnd(305, 200),
      note:t('Buck 的切換漣波（振幅、頻率）從 V<sub>IN</sub> 進來；LDO 在低頻靠迴路增益擋掉它，高頻靠輸出電容分壓。壓差裕度不夠時傳輸元件進入線性區，迴路失去增益，漣波就直接穿過去。',
             'The buck\'s switching ripple (amplitude, frequency) enters at V<sub>IN</sub>; the LDO rejects it with loop gain at low frequency and the output-capacitor divider at high frequency. With too little headroom the pass device enters the linear region, the loop loses gain and ripple passes straight through.')}),

    transient: () => ({vb:'0 0 700 230', svg:
      T(20, 42, 'V<tspan baseline-shift="sub" font-size="8">IN</tspan>', 'start') + W(20, 51, 260, 51) +
      '<rect class="box" x="60" y="28" width="255" height="132" rx="8" style="fill:none;stroke-dasharray:5 4"/>' + T(70, 152, 'LDO', 'start') +
      G('tr-bw tr-pm', box(80, 70, 92, 52, 'c3') + TB(126, 88, 'EA') + T(126, 103, 'BW ' + esc(val('tr-bw'))) + T(126, 116, 'PM ' + esc(val('tr-pm')))) +
      W(172, 96, 186, 96) +
      G('tr-sr', box(186, 70, 76, 52, 'c2') + TB(224, 88, t('閘極驅動', 'gate drive')) + T(224, 108, esc(val('tr-sr')))) +
      W(262, 96, 280, 96) + W(280, 96, 280, 62) + box(262, 40, 40, 22, 'c1') + T(282, 55, 'M') +
      W(302, 51, 690, 51) + T(690, 42, 'V<tspan baseline-shift="sub" font-size="8">OUT</tspan>', 'end') +
      W(335, 51, 335, 140) + W(335, 140, 126, 140) + W(126, 140, 126, 122) + dot(335, 51) + T(341, 120, 'FB', 'start') +
      W(420, 51, 420, 70) + G('tr-esr', resV(420, 70, 105) + T(436, 91, 'ESR ' + esc(val('tr-esr')), 'start')) +
      G('tr-c', capV(420, 105, 145) + T(436, 129, 'C<tspan baseline-shift="sub" font-size="8">OUT</tspan> ' + esc(val('tr-c')), 'start')) + W(420, 145, 420, 200) +
      G('tr-i1 tr-i2', isrc(560, 51, 200) + T(580, 122, 'I<tspan baseline-shift="sub" font-size="8">LOAD</tspan>', 'start') + T(580, 138, esc(val('tr-i1')) + ' ↔ ' + esc(val('tr-i2')), 'start')) +
      G('tr-tr', P('M612 92h14l8-22h22', 'wa') + T(636, 106, 't<tspan baseline-shift="sub" font-size="8">r</tspan> ' + esc(val('tr-tr')))) +
      W(186, 160, 186, 200) + W(186, 200, 560, 200) + gnd(300, 200),
      note:t('負載電流跳變的瞬間，電流先由 C<sub>OUT</sub> 供應（ESR 造成瞬間跳動、容值決定掉多快）；EA 的頻寬與相位裕度決定多快、多穩地補上；閘極驅動能力限制傳輸元件電流能多快改變。',
             'At the instant the load steps, C<sub>OUT</sub> supplies the current (ESR causes the instant jump, capacitance sets how fast it sags); EA bandwidth and phase margin set how fast and how cleanly the loop catches up; gate-drive strength limits how fast the pass-device current can change.')}),

    thermal: () => ({vb:'0 0 660 250', svg:
      G('th-vin', T(20, 40, 'V<tspan baseline-shift="sub" font-size="8">IN</tspan> ' + esc(val('th-vin')), 'start')) + W(20, 50, 200, 50) +
      G('th-pkg', box(200, 25, 130, 55, 'c1') + TB(265, 46, 'LDO') + T(265, 66, esc(val('th-pkg')))) +
      W(330, 50, 560, 50) + G('th-vout', T(445, 40, 'V<tspan baseline-shift="sub" font-size="8">OUT</tspan> ' + esc(val('th-vout')))) +
      G('th-i', isrc(560, 50, 150) + T(578, 104, 'I ' + esc(val('th-i')), 'start')) + gnd(560, 150) +
      '<path d="M265 82 V122" style="fill:none;stroke:var(--s2);stroke-width:3;stroke-dasharray:4 3"/>' + P('M259 116 265 124 271 116', 'wa') +
      T(275, 104, 'P<tspan baseline-shift="sub" font-size="8">D</tspan> = (V<tspan baseline-shift="sub" font-size="8">IN</tspan>−V<tspan baseline-shift="sub" font-size="8">OUT</tspan>)·I = ' + esc(metric('th-metrics', 0)), 'start', ' style="fill:var(--s2)"') +
      '<circle cx="265" cy="134" r="6" style="fill:var(--bad)"/>' + T(279, 138, 'T<tspan baseline-shift="sub" font-size="8">J</tspan> = ' + esc(metric('th-metrics', 1)), 'start', ' style="fill:var(--bad);font-weight:600"') +
      G('th-pkg th-board', resV(265, 140, 205) + T(281, 176, 'θ<tspan baseline-shift="sub" font-size="8">JA</tspan> = ' + esc(metric('th-metrics', 2)) + t('（封裝 × 板子）', ' (package × board)'), 'start')) +
      G('th-ta', P('M235 210h60', 'wt') + T(281, 226, 'T<tspan baseline-shift="sub" font-size="8">A</tspan> ' + esc(val('th-ta')), 'start') + T(225, 214, t('環境', 'ambient'), 'end')) +
      T(40, 150, t('電路', 'electrical'), 'start', ' style="fill:var(--muted)"') + T(40, 190, t('熱路', 'thermal'), 'start', ' style="fill:var(--muted)"') +
      '<line class="wd" x1="20" y1="118" x2="200" y2="118"/>',
      note:t('電路上的功耗 P<sub>D</sub> 全部變成熱，經過熱阻 θ<sub>JA</sub> 流到環境：T<sub>J</sub> = T<sub>A</sub> + P<sub>D</sub>·θ<sub>JA</sub>，就是「熱的歐姆定律」（溫差 = 熱流 × 熱阻）。換封裝或改善板子散熱，改的是那顆熱阻。',
             'All the power P<sub>D</sub> dissipated in the circuit becomes heat flowing through thermal resistance θ<sub>JA</sub> to ambient: T<sub>J</sub> = T<sub>A</sub> + P<sub>D</sub>·θ<sub>JA</sub> — Ohm\'s law for heat (temperature difference = heat flow × thermal resistance). Changing the package or board changes that resistor.')}),

    buck: () => ({vb:'0 0 660 240', svg:
      G('bk-vin', vsrc(30, 50, 210) + T(14, 38, 'V<tspan baseline-shift="sub" font-size="8">IN</tspan> ' + esc(val('bk-vin')), 'start')) +
      W(30, 50, 150, 50) + box(150, 36, 60, 28, 'c1') + TB(180, 55, 'HS') + W(210, 50, 240, 50) + W(240, 50, 240, 110) + dot(240, 110) + T(248, 128, 'SW', 'start') +
      W(240, 110, 240, 140) + box(210, 140, 60, 28, 'c1') + TB(240, 159, 'LS') + W(240, 168, 240, 210) +
      G('bk-f bk-mode', box(56, 96, 120, 64, 'c3') + TB(116, 114, t('控制器', 'controller')) + T(116, 132, 'f<tspan baseline-shift="sub" font-size="8">SW</tspan> ' + esc(val('bk-f'))) + T(116, 148, esc(val('bk-mode'))) +
        '<line class="wd" x1="176" y1="110" x2="170" y2="64"/><line class="wd" x1="176" y1="150" x2="210" y2="154"/>') +
      W(240, 110, 280, 110) + G('bk-l bk-isat', ind(280, 360, 110) + T(320, 86, 'L ' + esc(val('bk-l'))) + T(320, 64, 'I<tspan baseline-shift="sub" font-size="8">sat</tspan> ' + esc(val('bk-isat')))) +
      W(360, 110, 640, 110) + G('bk-vout', T(640, 100, 'V<tspan baseline-shift="sub" font-size="8">OUT</tspan> ' + esc(val('bk-vout')), 'end')) +
      W(450, 110, 450, 125) + G('bk-esr', resV(450, 125, 155) + T(466, 144, 'ESR ' + esc(val('bk-esr')), 'start')) +
      G('bk-c', capV(450, 155, 195) + T(466, 179, 'C<tspan baseline-shift="sub" font-size="8">OUT</tspan> ' + esc(val('bk-c')), 'start')) + W(450, 195, 450, 210) +
      G('bk-i', isrc(580, 110, 210) + T(598, 164, esc(val('bk-i')), 'start')) +
      W(30, 210, 580, 210) + gnd(340, 210),
      note:t('HS / LS 輪流導通，讓 SW 在 V<sub>IN</sub> 和 0 之間切換；電感把方波變成三角波電流，ΔI<sub>L</sub> = V<sub>OUT</sub>(1−D)/(L·f<sub>SW</sub>)；輸出電容與 ESR 再把它濾成小漣波。峰值電流要低於電感的 I<sub>sat</sub>。',
             'HS and LS take turns, swinging SW between V<sub>IN</sub> and 0; the inductor turns the square wave into a triangular current, ΔI<sub>L</sub> = V<sub>OUT</sub>(1−D)/(L·f<sub>SW</sub>); the output capacitor and ESR filter it into a small ripple. Peak current must stay below the inductor\'s I<sub>sat</sub>.')}),

    mlcc: () => ({vb:'0 0 660 230', svg:
      G('ml-req', box(30, 50, 116, 60, 'c3') + TB(88, 72, 'LDO') + T(88, 94, t('需 C<tspan baseline-shift="sub" font-size="8">eff</tspan> ≥ ', 'needs C<tspan baseline-shift="sub" font-size="8">eff</tspan> ≥ ') + esc(val('ml-req')))) +
      W(146, 80, 640, 80) + T(640, 70, 'V<tspan baseline-shift="sub" font-size="8">OUT</tspan>', 'end') + W(88, 110, 88, 200) +
      G('ml-c ml-size ml-vr ml-diel ml-tol', capV(330, 80, 200, 20) + T(358, 128, esc(val('ml-c')) + ' · ' + esc(val('ml-size')) + ' · ' + esc(val('ml-vr')) + ' · ' + esc(val('ml-diel')), 'start') + T(358, 144, t('容差 ', 'tolerance ') + esc(val('ml-tol')), 'start')) +
      G('ml-v', P('M292 88V192M288 94l4-6 4 6M288 186l4 6 4-6') + T(284, 144, 'DC ' + esc(val('ml-v')), 'end')) +
      T(358, 166, t('最差有效 ≈ ', 'worst-case effective ≈ ') + esc(metric('ml-metrics', 2)), 'start', ' style="fill:var(--accent);font-weight:600"') +
      G('ml-t', '<rect class="box" x="476" y="22" width="8" height="26" rx="4"/><circle cx="480" cy="50" r="6" style="fill:var(--bad)"/>' + T(492, 44, 'T ' + esc(val('ml-t')), 'start')) +
      G('ml-age', '<circle class="box" cx="560" cy="36" r="10"/>' + P('M560 30v6l4 3') + T(576, 40, esc(val('ml-age')), 'start')) +
      isrc(610, 80, 200) + W(88, 200, 610, 200) + gnd(330, 200),
      note:t('LDO 規格書要的是「有效」電容：標稱值先扣掉容差，再被直流偏壓（工作電壓）、溫度和老化各吃掉一部分。最後剩下的要大於 LDO 的最小需求。',
             'The LDO datasheet means effective capacitance: start from nominal, subtract tolerance, then lose a share to DC bias (the working voltage), temperature and ageing. What remains must exceed the LDO minimum.')}),

    trim: () => ({vb:'0 0 660 240', svg:
      G('tm-pk tm-pks', '<rect x="20" y="20" width="430" height="205" rx="10" style="fill:none;stroke:var(--muted);stroke-width:1.4;stroke-dasharray:6 4"/>' +
        T(235, 216, t('封裝應力：偏移 ', 'package stress: shift ') + esc(val('tm-pk')) + ' ± ' + esc(val('tm-pks')))) +
      T(30, 36, t('晶片', 'die'), 'start', ' style="fill:var(--muted)"') +
      G('tm-sig tm-mu', box(40, 50, 116, 52, 'c2') + TB(98, 70, t('帶隙參考', 'bandgap')) + T(98, 90, 'σ ' + esc(val('tm-sig')) + '  μ ' + esc(val('tm-mu')))) +
      W(156, 76, 172, 76) + tri(172, 58, 210, 94) + W(210, 76, 470, 76) + dot(330, 76) + T(400, 68, 'V<tspan baseline-shift="sub" font-size="8">OUT</tspan>') +
      resV(330, 76, 112) + T(345, 98, 'R1', 'start') +
      G('tm-bits tm-lsb', '<rect class="box" x="323" y="116" width="14" height="14" rx="2"/><rect class="box" x="323" y="134" width="14" height="14" rx="2"/><rect class="box" x="323" y="152" width="14" height="14" rx="2"/>' +
        P('M337 118h8v10h-8M337 136h8v10h-8M337 154h8v10h-8', 'wd') + T(352, 136, t('修調 ', 'trim ') + esc(val('tm-bits')), 'start') + T(352, 152, 'LSB ' + esc(val('tm-lsb')), 'start')) +
      W(330, 112, 330, 116) + W(330, 166, 330, 172) + resV(330, 172, 200) + gnd(330, 200) +
      G('tm-bits', box(212, 132, 84, 38, 'c4') + T(254, 155, 'OTP / ' + t('熔絲', 'fuses')) + '<line class="wd" x1="296" y1="150" x2="322" y2="142"/>') +
      G('tm-nz tm-spec tm-pc', box(470, 40, 172, 120, 'c5') + TB(556, 62, 'ATE (CP / FT)') + T(556, 84, t('量測雜訊 ', 'noise ') + esc(val('tm-nz'))) + T(556, 102, t('規格 ', 'spec ') + esc(val('tm-spec'))) + T(556, 120, t('CP 目標：', 'CP target: ') + esc(val('tm-pc')))) +
      P('M556 160V196H254V172', 'wd') + P('M249 178 254 170 259 178', 'w') + T(552, 190, t('量測後寫入修調碼', 'measure, then program the code'), 'end'),
      note:t('製程讓帶隙電壓偏移（σ、μ）；ATE 量到 V<sub>OUT</sub> 後算出修調碼，寫進 OTP / 熔絲，切換電阻階梯（範圍 = 2<sup>N</sup> × LSB）把輸出拉回。封裝應力在修調<b>之後</b>才發生，所以 CP 要不要預先補償封裝偏移很重要。',
             'Process variation shifts the bandgap (σ, μ); the ATE measures V<sub>OUT</sub>, computes a trim code and programs OTP / fuses, switching a resistor ladder (range = 2<sup>N</sup> × LSB) to pull the output back. Package stress happens <b>after</b> trimming, which is why pre-compensating it at CP matters.')})
  };

  /* ---------- playback: a time cursor on the plots and currents flowing in the circuit ---------- */
  const LAB = () => window.PMICLab || {};
  const fmtA = a => { const x = Math.abs(a); return (a < 0 ? '−' : '') + (x >= 1 ? x.toFixed(2) + ' A' : x >= 1e-3 ? (x * 1e3).toPrecision(3) + ' mA' : (x * 1e6).toPrecision(3) + ' µA'); };
  const fmtT = s => s >= 1e-3 ? (s * 1e3).toFixed(2) + ' ms' : s >= 1e-6 ? (s * 1e6).toFixed(2) + ' µs' : (s * 1e9).toFixed(0) + ' ns';
  const offs = {};                                         // dash offset per flow path, so the dashes keep moving
  function flow(key, d, I, imax, dt){
    // log scale, so a 1 mA branch next to a 300 mA branch is still visible
    const a = Math.abs(I), lin = a / (imax || 1);
    if(lin < 1e-4) return '';
    const r = Math.min(Math.log10(1 + 99 * lin) / 2, 1);
    offs[key] = ((offs[key] || 0) - Math.sign(I) * (20 + 140 * r) * dt) % 1000;
    return '<path class="flow" d="' + d + '" style="stroke-width:' + (1.6 + 5 * r).toFixed(1) + 'px;stroke-dashoffset:' + offs[key].toFixed(1) + '"/>';
  }
  function cursor(svgId, x){
    const svg = $(svgId); if(!svg || !svg.__plot) return;
    const {X, m, ph} = svg.__plot;
    let ln = svg.querySelector('line.cursor');
    if(!ln){ ln = document.createElementNS('http://www.w3.org/2000/svg', 'line'); ln.setAttribute('class', 'cursor'); svg.appendChild(ln); }
    const px = X(x).toFixed(1);
    ln.setAttribute('x1', px); ln.setAttribute('x2', px); ln.setAttribute('y1', m.t); ln.setAttribute('y2', m.t + ph);
  }
  const lab = (x, y, s, a, color) => T(x, y, s, a || 'start', ' style="fill:' + (color || 'var(--s2)') + ';font-weight:600"');
  const ANIM = {
    transient: {dur:7, frame(p, dt){
      const d = LAB().tr; if(!d) return '';
      const rec = d.rec, i = Math.min(rec.length - 1, Math.round(p * (rec.length - 1)));
      const [tt, v, il, ip, pin] = rec[i], ic = pin ? 0 : ip - il;   // pinned at a rail: the capacitor voltage cannot move
      if(d.__max === undefined) d.__max = Math.max(...rec.map(r => Math.max(r[2], r[3]))) || 1;
      cursor('tr-v', tt * 1e6); cursor('tr-i', tt * 1e6);
      const im = d.__max;
      return flow('tp', 'M302 51H420', ip, im, dt) + flow('tl', 'M420 51H560V111', il, im, dt) + flow('tc', 'M420 51V98', ic, im, dt) +
        lab(20, 20, 't = ' + fmtT(tt), 'start', 'var(--ink)') +
        lab(361, 40, 'I<tspan baseline-shift="sub" font-size="8">pass</tspan> ' + fmtA(ip), 'middle') +
        lab(580, 156, t('現在 ', 'now ') + fmtA(il)) +
        lab(408, 160, 'I<tspan baseline-shift="sub" font-size="8">C</tspan> ' + fmtA(ic) + (Math.abs(ic) < im * 0.01 ? '' : ic > 0 ? t('（充電）', ' (charging)') : t('（放電）', ' (discharging)')), 'end', ic < 0 ? 'var(--bad)' : 'var(--ok)') +
        lab(690, 24, 'ΔV<tspan baseline-shift="sub" font-size="8">OUT</tspan> ' + (v * 1e3).toFixed(1) + ' mV' + (pin < 0 ? t('（輸出掉到 0 V）', ' (output at 0 V)') : pin > 0 ? t('（頂到 V_IN）', ' (pinned at V_IN)') : ''), 'end', Math.abs(v) > 0.03 ? 'var(--bad)' : 'var(--ink)');
    }},
    buck: {dur:6, frame(p, dt){
      const d = LAB().bk; if(!d) return '';
      const pts = d.pts, i = Math.min(pts.length - 1, Math.round(p * (pts.length - 1)));
      const [tt, il] = pts[i], u = tt % d.per;
      const hs = d.pfm ? u < d.t1 : u < d.D * d.per, ls = d.pfm ? (u >= d.t1 && u < d.t1 + d.t2) : !hs;
      cursor('bk-il', tt * 1e6); cursor('bk-v', tt * 1e6);
      const im = Math.max(d.ipk, d.I, 1e-6), ic = il - d.I;
      const st = (x, y, on, below) => '<rect x="' + x + '" y="' + y + '" width="60" height="28" rx="5" style="fill:' + (on ? 'color-mix(in srgb,var(--ok) 30%,transparent)' : 'color-mix(in srgb,var(--bg) 55%,transparent)') + ';stroke:' + (on ? 'var(--ok)' : 'none') + ';stroke-width:2.4"/>' +
        T(x + 30, below ? y + 42 : y - 5, on ? 'ON' : 'OFF', 'middle', ' style="fill:' + (on ? 'var(--ok)' : 'var(--muted)') + ';font-weight:700"');
      return st(150, 36, hs) + st(210, 140, ls, true) +
        (hs ? flow('bh', 'M30 50H150M210 50H240V110', il, im, dt) : '') + (ls ? flow('bl', 'M240 210V168M240 140V110', il, im, dt) : '') +
        flow('bL', 'M240 110H280M360 110H450', il, im, dt) + flow('bo', 'M450 110H580V146', d.I, im, dt) + flow('bc', 'M450 110V125', ic, im, dt) +
        lab(20, 20, 't = ' + fmtT(tt) + t('（第 ', ' (cycle ') + (Math.floor(tt / d.per) + 1) + t(' 個週期）', ')'), 'start', 'var(--ink)') +
        lab(330, 150, 'i<tspan baseline-shift="sub" font-size="8">L</tspan> ' + fmtA(il), 'middle') +
        lab(272, 128, '= ' + (hs ? d.vin.toFixed(1) + ' V' : ls ? '0 V' : t('浮接', 'floating')), 'start', 'var(--ink)') +
        lab(438, 144, 'i<tspan baseline-shift="sub" font-size="8">C</tspan> ' + fmtA(ic), 'end', ic < 0 ? 'var(--bad)' : 'var(--ok)');
    }}
  };
  const play = {};                                          // per tab: {on, p, last}
  function drawAnim(sec, dt){
    const name = sec.id.slice(4), a = ANIM[name], st = play[name], svg = sec.querySelector('svg.schem');
    if(!a || !st || !svg) return;
    let g = svg.querySelector('g.live');
    if(!g){ g = document.createElementNS('http://www.w3.org/2000/svg', 'g'); g.setAttribute('class', 'live'); svg.appendChild(g); }
    g.innerHTML = a.frame(st.p, dt || 0);
    const sl = sec.querySelector('.an-pos'); if(sl && document.activeElement !== sl) sl.value = Math.round(st.p * 1000);
  }
  function loop(ts){
    const sec = document.querySelector('section.tabp:not([hidden])');
    if(sec){
      const name = sec.id.slice(4), st = play[name];
      if(st){
        const dt = st.last ? Math.min((ts - st.last) / 1000, 0.1) : 0;
        st.last = ts;
        if(st.on) st.p = (st.p + dt / ANIM[name].dur) % 1;
        drawAnim(sec, st.on ? dt : 0);
      }
    }
    requestAnimationFrame(loop);
  }

  /* ---------- panel, highlighting and linking ---------- */
  let last = {id:null, at:0};
  const sweepingIds = sec => [...sec.querySelectorAll('.ctl.sw-on input[type=range]')].map(e => e.id);
  const ctlOf = id => { const el = $(id); return el ? el.closest('.ctl') : null; };

  function render(sec){
    const name = sec.id.slice(4), f = SCH[name], pan = sec.querySelector('.schem-panel');
    if(!f || !pan) return;
    const r = f();
    const svg = pan.querySelector('svg');
    svg.setAttribute('viewBox', r.vb);
    svg.innerHTML = r.svg;
    pan.querySelector('.schem-note').innerHTML = r.note;
    const hot = new Set(sweepingIds(sec));
    if(last.id && performance.now() - last.at < 1600) hot.add(last.id);
    svg.querySelectorAll('g.el').forEach(g => { if(g.dataset.k.split(' ').some(k => hot.has(k))) g.classList.add('hot'); });
    drawAnim(sec, 0);
  }
  function ensure(sec){
    if(!sec || !SCH[sec.id.slice(4)]) return;
    if(!sec.querySelector('.schem-panel')){
      const pan = document.createElement('div');
      pan.className = 'panel schem-panel';
      pan.innerHTML = '<h3>' + t('電路與參數的關係', 'Circuit and parameters') + ' <small>' + t('移到元件上看對應參數，點一下跳過去', 'hover a part to see its control, click to jump') + '</small></h3>' +
        (ANIM[sec.id.slice(4)] ? '<div class="an-row"><button class="btn pri an-play" type="button" aria-pressed="true">' + t('❚❚ 暫停播放', '❚❚ Pause') + '</button>' +
          '<label class="an-lbl">' + t('時間', 'Time') + ' <input class="an-pos" type="range" min="0" max="1000" value="0"></label><span class="note">' + t('電流方向＝虛線流動方向，線越粗電流越大；波形上的直線是目前時間', 'flow direction = current direction, thicker = more current; the vertical line on the plots is the current time') + '</span></div>' : '') +
        '<svg class="schem" role="img" aria-label="' + t('電路示意圖', 'Circuit schematic') + '"></svg><p class="note schem-note"></p>';
      const stack = sec.querySelector('.stack'), m = stack.querySelector('.metrics');
      m.after(pan);
      const svg = pan.querySelector('svg');
      const nm = sec.id.slice(4);
      if(ANIM[nm]){
        play[nm] = {on:true, p:0, last:0};
        const btn = pan.querySelector('.an-play'), pos = pan.querySelector('.an-pos');
        const setBtn = () => { btn.textContent = play[nm].on ? t('❚❚ 暫停播放', '❚❚ Pause') : t('▶ 播放電流', '▶ Play currents'); btn.setAttribute('aria-pressed', play[nm].on ? 'true' : 'false'); };
        btn.addEventListener('click', e => { e.stopPropagation(); play[nm].on = !play[nm].on; setBtn(); });
        pos.addEventListener('input', e => { e.stopPropagation(); play[nm].on = false; setBtn(); play[nm].p = +pos.value / 1000; drawAnim(sec, 0); });
      }
      svg.addEventListener('mouseover', e => { const g = e.target.closest('g.el'); if(!g) return; g.classList.add('hover'); g.dataset.k.split(' ').forEach(k => { const c = ctlOf(k); if(c) c.classList.add('link'); }); });
      svg.addEventListener('mouseout', e => { const g = e.target.closest('g.el'); if(!g || g.contains(e.relatedTarget)) return; g.classList.remove('hover'); sec.querySelectorAll('.ctl.link').forEach(c => c.classList.remove('link')); });
      svg.addEventListener('click', e => {
        const g = e.target.closest('g.el'); if(!g) return;
        const el = $(g.dataset.k.split(' ')[0]); if(!el) return;
        const c = el.closest('.ctl') || el;
        c.scrollIntoView({behavior:'smooth', block:'center'});
        const focusable = el.matches('input,select') ? el : el.querySelector('button');
        if(focusable) focusable.focus({preventScroll:true});
        c.classList.add('flash'); setTimeout(() => c.classList.remove('flash'), 1200);
      });
      // hovering a control lights its parts
      const params = sec.querySelector('.bench > .panel');
      params.addEventListener('mouseover', e => { const c = e.target.closest('.ctl'); if(!c) return; const ids = [...c.querySelectorAll('[id]')].map(x => x.id); svg.querySelectorAll('g.el').forEach(g => g.classList.toggle('hover', g.dataset.k.split(' ').some(k => ids.includes(k)))); });
      params.addEventListener('mouseleave', () => svg.querySelectorAll('g.el.hover').forEach(g => g.classList.remove('hover')));
      let raf = 0;
      const upd = e => {
        if(e && e.target && !e.target.closest('.sweep')){ const hit = e.target.closest('[id]'); if(hit && hit.closest('.bench > .panel')) last = {id:hit.id, at:performance.now()}; }
        cancelAnimationFrame(raf); raf = requestAnimationFrame(() => render(sec));
      };
      sec.addEventListener('input', upd); sec.addEventListener('change', upd); sec.addEventListener('click', e => { if(e.target.closest('button')) upd({target:e.target.closest('.btnrow') || e.target}); });
      setInterval(() => { if(!sec.hidden && last.id && performance.now() - last.at > 1600 && performance.now() - last.at < 2400) render(sec); }, 400);
      document.addEventListener('themechange', () => render(sec));
    }
    render(sec);
  }
  const current = () => document.querySelector('section.tabp:not([hidden])');
  document.querySelectorAll('[role=tab]').forEach(tb => tb.addEventListener('click', () => ensure(current())));
  window.addEventListener('hashchange', () => setTimeout(() => ensure(current()), 0));
  ensure(current());
  requestAnimationFrame(loop);
})();
