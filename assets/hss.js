/* PMIC Notes — smart high-side switch page: three small calculators built on BTS50025-1TEA datasheet values (Rev.1.1).
   1. current sense (I_IS = I_L / dkILIS + I_IS0, fault current, ADC range)
   2. inductive switch-off energy with SMART CLAMPING
   3. PWM power and junction temperature */
(function(){
  const {plot, fmtSI} = window.MemPlot;
  const t = (window.MemSite && window.MemSite.t) || (zh => zh);
  const $ = id => document.getElementById(id);
  if(!$('hs-il')) return;
  const HSS = window.PMICHss = {};   // last results, read by the tests

  // datasheet values (BTS50025-1TEA, Rev.1.1, 2019-09-30)
  const DS = {
    kMin:15500, kTyp:18000, kMax:20500,           // dkILIS, P_6.1.41
    is0Min:-5.95e-6, is0Max:8.25e-6,              // I_IS0 at 25 °C, P_6.1.58
    isFault:[5e-3, 12e-3, 18e-3],                 // I_IS(FAULT) min / typ / max, P_6.1.39
    isLim:4.4e-3,                                 // sense saturation current, min, P_6.1.40
    icl:[65, 82, 100],                            // I_CL(0) min / typ / max, P_6.1.30
    vcl:35, vclMax:45,                            // V_DS(CL) typ / max at 25 °C, P_6.1.8
    ear:[[19, 0.130], [40, 0.080]], eas:0.600,    // E_AR (T_J(0) ≤ 105 °C) and E_AS (single pulse) at 13.5 V
    r25:2.7e-3, r150:4.4e-3, r150max:5e-3,        // R_DS(ON) at 20 A, P_6.1.3 / 6.1.4
    eon:5.5e-3, eoff:4e-3, eI:13.5 / 0.68,        // switching energies at R_L = 0.68 Ω, 13.5 V (≈ 19.9 A)
    fin:200, tjTrip:150,                          // max input frequency; T_J(TRIP) min
    tdOn:[10e-6, 50e-6, 250e-6], tr:[10e-6, 50e-6, 150e-6],      // turn-on delay and rise time, min / typ / max
    tdOff:[50e-6, 150e-6, 450e-6], tf:[10e-6, 50e-6, 150e-6],    // turn-off delay and fall time, min / typ / max
    rth:{'2s2p':22, '1s0p':35}                    // R_thJA, K/W
  };
  const VS = 13.5;
  const RIS = [470, 1000, 1500, 2200, 3300, 4700];

  function metrics(el, arr){
    el.innerHTML = arr.map(m => '<div class="metric ' + (m.cls || '') + '"><div class="ml">' + m.l + '</div><div class="mv">' + m.v +
      (m.u ? ' <small>' + m.u + '</small>' : '') + '</div>' + (m.s ? '<div class="ms">' + m.s + '</div>' : '') + '</div>').join('');
  }
  function range(id, fmt, onChange){
    const el = $(id), out = $(id + '-o');
    const upd = () => { if(out) out.textContent = fmt(+el.value); };
    el.addEventListener('input', () => { upd(); onChange(); });
    upd();
    return () => +el.value;
  }
  function toggle(id, onChange){
    const box = $(id);
    box.addEventListener('click', e => {
      const b = e.target.closest('button[data-v]'); if(!b) return;
      box.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
      onChange();
    });
    return () => box.querySelector('[aria-pressed="true"]').dataset.v;
  }
  const dot = (X, Y, x, y, c) => '<circle cx="' + X(x).toFixed(1) + '" cy="' + Y(y).toFixed(1) + '" r="5" style="fill:' + c + ';stroke:var(--surface);stroke-width:2"/>';

  /* ---------- 1. current sense ---------- */
  const iisMin = il => Math.max(0, il / DS.kMax + DS.is0Min);
  const iisTyp = il => Math.max(0, il / DS.kTyp);
  const iisMax = il => il / DS.kMin + DS.is0Max;
  {
    const il = range('hs-il', v => v.toFixed(1) + ' A', draw);
    const ris = range('hs-ris', v => fmtSI(RIS[v], 'Ω'), draw);
    const adc = toggle('hs-adc', draw);
    function draw(){
      const I = il(), R = RIS[ris()], FS = +adc();
      const vTyp = iisTyp(I) * R, vMin = iisMin(I) * R, vMax = iisMax(I) * R;
      // load current a controller would infer from the typical reading, using the worst-case ratio and offset
      const iTyp = iisTyp(I);
      const loA = Math.max(0, DS.kMin * (iTyp - DS.is0Max)), hiA = DS.kMax * (iTyp - DS.is0Min);
      const vNomMax = iisMax(24) * R;                 // highest normal reading at I_L(NOM) = 24 A
      const vFaultMin = DS.isFault[0] * R;
      const trip = I >= DS.icl[2] ? 2 : I >= DS.icl[0] ? 1 : 0;
      const sat = iisMax(I) > DS.isLim;
      HSS.sense = {I, R, FS, vTyp, vMin, vMax, loA, hiA, vFaultMin, vNomMax};
      const sep = vFaultMin > Math.min(FS, vNomMax) * 1.1;
      metrics($('hs-sense-m'), [
        {l:t('感測電流 I<sub>IS</sub>（典型）', 'Sense current I<sub>IS</sub> (typ.)'), v:fmtSI(iTyp, 'A'), s:'I<sub>L</sub> / ' + DS.kTyp},
        {l:t('V<sub>IS</sub> 範圍', 'V<sub>IS</sub> range'), v:fmtSI(vTyp, 'V'), s:fmtSI(vMin, 'V') + ' … ' + fmtSI(vMax, 'V'), cls:vMax > FS ? 'bad' : ''},
        {l:t('由典型讀值推回 I<sub>L</sub>', 'I<sub>L</sub> inferred from a typ. reading'), v:loA.toFixed(1) + '–' + hiA.toFixed(1), u:'A',
          s:I > 0.05 ? '±' + Math.round(Math.max(I - loA, hiA - I) / I * 100) + '%' : t('輕載：只剩偏移量', 'light load: offset only'), cls:I > 0.05 && (hiA - loA) / I > 0.4 ? 'warn' : ''},
        {l:t('故障時 V<sub>IS</sub>（最小）', 'Fault V<sub>IS</sub> (min.)'), v:fmtSI(vFaultMin, 'V'), s:'5 mA × R<sub>IS</sub>', cls:sep ? 'ok' : 'bad'},
        {l:t('過流跳脫', 'Overcurrent trip'), v:trip === 2 ? t('一定跳', 'certain') : trip === 1 ? t('可能跳', 'possible') : t('不會', 'no'),
          s:'I<sub>CL(0)</sub> 65–100 A', cls:trip === 2 ? 'bad' : trip === 1 ? 'warn' : 'ok'}
      ]);
      const notes = [];
      if(vNomMax > FS) notes.push(t('24 A 時的最大讀值 ' + fmtSI(vNomMax, 'V') + ' 超過 ADC 滿刻度：R<sub>IS</sub> 太大。', 'The highest reading at 24 A, ' + fmtSI(vNomMax, 'V') + ', is above ADC full scale: R<sub>IS</sub> is too large.'));
      if(!sep) notes.push(t('故障電流的最小值換成電壓後，和正常讀值分不開：故障可能被誤讀成大電流。', 'The minimum fault current, as a voltage, overlaps normal readings: a fault could be read as a large load current.'));
      if(sat) notes.push(t('這個電流下感測電流可能接近飽和（I<sub>IS(LIM)</sub> 最小 4.4 mA），讀值不再線性。', 'At this current the sense output may approach saturation (I<sub>IS(LIM)</sub> min. 4.4 mA); the reading is no longer linear.'));
      if(vFaultMin > FS) notes.push(t('故障時 V<sub>IS</sub> 會超過 ADC 電源：要加 R<sub>IS_PROT</sub> 限流，並靠 ADC 腳的保護二極體或箝位。', 'In a fault V<sub>IS</sub> exceeds the ADC supply: add R<sub>IS_PROT</sub> to limit the current into the ADC pin and its clamp.'));
      $('hs-sense-n').innerHTML = notes.length ? notes.join('<br>') : t('R<sub>IS</sub> 選得剛好：正常讀值在 ADC 範圍內，故障時明顯更高。', 'R<sub>IS</sub> fits: normal readings stay inside the ADC range and a fault reads clearly higher.');
      const xs = Array.from({length:101}, (_, i) => i);
      const yMax = Math.max(FS * 1.25, 1);
      plot($('hs-sense-p'), {
        x:[0, 100], y:[0, yMax], xlabel:t('負載電流 I_L (A)', 'Load current I_L (A)'), ylabel:'V_IS (V)',
        series:[
          {pts:xs.map(x => [x, iisMax(x) * R]), color:'var(--s3)', w:1.2, dash:'4 3'},
          {pts:xs.map(x => [x, iisMin(x) * R]), color:'var(--s3)', w:1.2, dash:'4 3'},
          {pts:xs.map(x => [x, iisTyp(x) * R]), color:'var(--s1)'}
        ],
        hlines:[{y:FS, label:'ADC ' + FS + ' V', color:'var(--warn)'}, {y:vFaultMin, label:t('故障 最小 5 mA', 'fault min. 5 mA'), color:'var(--bad)'}],
        vlines:[{x:DS.icl[0], label:'I_CL(0) min', color:'var(--bad)', anchor:'end'}],
        extra:(X, Y) => '<rect x="' + X(DS.icl[0]).toFixed(1) + '" y="' + Y(yMax).toFixed(1) + '" width="' + (X(100) - X(DS.icl[0])).toFixed(1) + '" height="' + (Y(0) - Y(yMax)).toFixed(1) + '" style="fill:var(--bad);opacity:.07"/>' + dot(X, Y, I, Math.min(vTyp, yMax), 'var(--ink)')
      });
    }
    draw();
  }

  /* ---------- 2. inductive switch-off ---------- */
  const LMIN = 10e-6, LMAX = 10e-3;
  const Lmap = v => Math.pow(10, Math.log10(LMIN) + (Math.log10(LMAX) - Math.log10(LMIN)) * v / 100);
  const eClamp = (L, I, vcl) => 0.5 * L * I * I * vcl / (vcl - VS);   // datasheet eq. 5.2 (R_L = 0)
  function earLimit(I){
    const [[i1, e1], [i2, e2]] = DS.ear;
    if(I <= i1) return e1;
    return e1 * Math.pow(I / i1, Math.log(e2 / e1) / Math.log(i2 / i1));   // log-log line through the two datasheet points
  }
  {
    const lS = range('hs-l', v => fmtSI(Lmap(v), 'H'), draw);
    const iS = range('hs-ii', v => v + ' A', draw);
    function draw(){
      const L = Lmap(lS()), I = iS();
      const E = eClamp(L, I, DS.vcl), lim = earLimit(I);
      const tDemag = L * I / (DS.vcl - VS);
      HSS.ind = {L, I, E, lim};
      const r = E / lim;
      metrics($('hs-ind-m'), [
        {l:t('關斷時 V<sub>OUT</sub>', 'V<sub>OUT</sub> while clamping'), v:'−' + (DS.vcl - VS).toFixed(1), u:'V', s:'V<sub>S</sub> − V<sub>DS(CL)</sub>'},
        {l:t('去磁時間', 'Demagnetization time'), v:fmtSI(tDemag, 's'), s:'L·I / (V<sub>DS(CL)</sub> − V<sub>S</sub>)'},
        {l:t('元件吸收的能量', 'Energy absorbed by the switch'), v:fmtSI(E, 'J'), s:'½LI² × ' + (DS.vcl / (DS.vcl - VS)).toFixed(2), cls:r > 1 ? 'bad' : r > 0.7 ? 'warn' : 'ok'},
        {l:t('重複脈衝上限（近似）', 'Repetitive limit (approx.)'), v:fmtSI(lim, 'J'), s:Math.round(r * 100) + '% ' + t('已使用', 'used'), cls:r > 1 ? 'bad' : r > 0.7 ? 'warn' : 'ok'}
      ]);
      $('hs-ind-n').innerHTML = r > 1
        ? (E > DS.eas ? t('連單次脈衝上限 E<sub>AS</sub> 600 mJ 都超過：外加續流二極體或 TVS，或改用較小的電感。', 'Even the single-pulse limit E<sub>AS</sub> 600 mJ is exceeded: add a freewheeling diode or TVS, or use a smaller inductance.')
                      : t('超過重複脈衝上限：每次關斷都會累積損傷。若只是偶發（例如一生一次）可對照 E<sub>AS</sub>；否則外加續流路徑。', 'Above the repetitive limit: every switch-off adds damage. For a rare event compare with E<sub>AS</sub>; otherwise add a freewheeling path.'))
        : t('在重複脈衝上限內。注意：這裡只用資料手冊的兩個點近似，實際以 Figure 1 曲線為準。', 'Inside the repetitive limit. Only two datasheet points are used here; Figure 1 of the datasheet is authoritative.');
      const xs = Array.from({length:81}, (_, i) => 0.5 + i * 0.5);
      plot($('hs-ind-p'), {
        x:[1, 40], y:[1e-3, 10], logy:true, xlabel:t('關斷電流 I_L (A)', 'Switch-off current I_L (A)'), ylabel:t('能量 (J)', 'Energy (J)'),
        yfmt:v => fmtSI(v, 'J', 3), m:{l:70},
        series:[
          {pts:xs.map(x => [x, eClamp(L, x, DS.vcl)]), color:'var(--s1)'},
          {pts:xs.map(x => [x, earLimit(x)]), color:'var(--bad)', dash:'5 4'}
        ],
        hlines:[{y:DS.eas, label:'E_AS 600 mJ', color:'var(--warn)'}],
        extra:(X, Y) => dot(X, Y, I, E, 'var(--ink)') + '<text class="ts" x="' + (X(40) - 4) + '" y="' + (Y(earLimit(40)) + 14).toFixed(1) + '" text-anchor="end" style="fill:var(--bad)">E_AR</text>'
      });
    }
    draw();
  }

  /* ---------- 3. PWM power and T_J ---------- */
  const rds = tj => DS.r25 + (DS.r150 - DS.r25) * (tj - 25) / 125;
  function solveTj(I, D, f, rth, ta){
    let tj = ta;
    for(let k = 0; k < 30; k++){
      const pc = I * I * rds(Math.min(tj, 200)) * D;
      const ps = D > 0 && D < 1 ? f * (DS.eon + DS.eoff) * I / DS.eI : 0;
      tj = ta + (pc + ps) * rth;
      if(tj > 400) break;
    }
    const pc = I * I * rds(Math.min(tj, 200)) * D, ps = D > 0 && D < 1 ? f * (DS.eon + DS.eoff) * I / DS.eI : 0;
    return {tj, pc, ps};
  }
  {
    const iS = range('hs-pi', v => v + ' A', draw);
    const dS = range('hs-pd', v => v + '%', draw);
    const fS = range('hs-pf', v => v + ' Hz', draw);
    const taS = range('hs-pta', v => v + ' °C', draw);
    const pcb = toggle('hs-pcb', draw);
    function draw(){
      const I = iS(), D = dS() / 100, f = fS(), ta = taS(), rth = DS.rth[pcb()];
      const r = solveTj(I, D, f, rth, ta);
      HSS.pwm = {I, D, f, ta, rth, ...r};
      const over = f > DS.fin;
      // edge timing (P_6.1.16–6.1.19): the load's on-time is the command shifted by the delays, and the shortest
      // useful pulse is turn-on delay + rise time
      const T = 1 / f, pct = s => s / T * 100;
      const minTyp = pct(DS.tdOn[1] + DS.tr[1]), minMax = pct(DS.tdOn[2] + DS.tr[2]);
      const dTyp = pct(DS.tdOff[1] - DS.tdOn[1]), dMax = pct(DS.tdOff[2] - DS.tdOn[0]);
      HSS.pwm.edge = {minTyp, minMax, dTyp, dMax};
      const short = D > 0 && D * 100 < minMax;
      metrics($('hs-pwm-m'), [
        {l:t('導通損耗', 'Conduction loss'), v:fmtSI(r.pc, 'W'), s:'I² R<sub>DS(ON)</sub>(T<sub>J</sub>) × D'},
        {l:t('切換損耗', 'Switching loss'), v:fmtSI(r.ps, 'W'), s:'f × (E<sub>ON</sub> + E<sub>OFF</sub>)'},
        {l:t('接面溫度 T<sub>J</sub>', 'Junction temperature T<sub>J</sub>'), v:r.tj > 300 ? '> 300' : r.tj.toFixed(0), u:'°C', s:'R<sub>thJA</sub> ' + rth + ' K/W',
          cls:r.tj >= DS.tjTrip ? 'bad' : r.tj > 125 ? 'warn' : 'ok'},
        {l:t('PWM 頻率', 'PWM frequency'), v:f, u:'Hz', s:t('上限 200 Hz', 'max. 200 Hz'), cls:over ? 'bad' : 'ok'},
        {l:t('最短可控導通', 'Shortest usable pulse'), v:minTyp.toFixed(1), u:'%', s:t('最壞 ', 'worst ') + minMax.toFixed(1) + '%', cls:short ? 'warn' : ''},
        {l:t('負載 duty 比指令多', 'Load duty above command'), v:'+' + dTyp.toFixed(1), u:'%', s:t('最壞 +', 'worst +') + dMax.toFixed(1) + '%'}
      ]);
      const notes = [];
      if(short) notes.push(t('指令 duty 小於最壞情況的最短導通：有些元件的輸出根本來不及升起來，低 duty 區不線性。', 'The commanded duty is below the worst-case shortest pulse: on some parts the output never fully rises, so low duty is non-linear.'));
      if(over) notes.push(t('超過 F<sub>in</sub> 200 Hz：過功率保護會把元件鎖住，輸出出現漏脈衝。', 'Above F<sub>in</sub> 200 Hz: the over-power protection latches the device and output pulses go missing.'));
      if(r.tj >= DS.tjTrip) notes.push(t('T<sub>J</sub> 到達熱關機的最小門檻 150 °C：元件會關斷並鎖住，要等 IN 拉高重置。', 'T<sub>J</sub> reaches the minimum thermal-shutdown threshold of 150 °C: the device turns off and latches until IN is released.'));
      if(!notes.length) notes.push(t('切換損耗與頻率成正比；斜率刻意做慢（約 0.25 V/µs）來壓低 EMI，所以這顆不適合高頻 PWM。', 'Switching loss scales with frequency; the slopes are deliberately slow (about 0.25 V/µs) for low EMI, so this part is not for fast PWM.'));
      $('hs-pwm-n').innerHTML = notes.join('<br>');
      const xs = Array.from({length:81}, (_, i) => i * 0.5);
      plot($('hs-pwm-p'), {
        x:[0, 40], y:[ta - 5 < 0 ? Math.floor((ta - 5) / 20) * 20 : 0, 220], xlabel:t('負載電流 I_L (A)', 'Load current I_L (A)'), ylabel:'T_J (°C)',
        series:[
          {pts:xs.map(x => [x, Math.min(solveTj(x, D, f, DS.rth['1s0p'], ta).tj, 260)]), color:'var(--s3)', w:pcb() === '1s0p' ? 2 : 1.3, dash:pcb() === '1s0p' ? '' : '4 3'},
          {pts:xs.map(x => [x, Math.min(solveTj(x, D, f, DS.rth['2s2p'], ta).tj, 260)]), color:'var(--s1)', w:pcb() === '2s2p' ? 2 : 1.3, dash:pcb() === '2s2p' ? '' : '4 3'}
        ],
        hlines:[{y:DS.tjTrip, label:'T_J(TRIP) min 150 °C', color:'var(--bad)'}],
        vlines:[{x:24, label:'I_L(NOM) 24 A', anchor:'end'}],
        extra:(X, Y) => dot(X, Y, I, Math.min(r.tj, 219), 'var(--ink)')
      });
      drawWave(I, D, f);
      drawSweepPlot({I, D, f, ta, rth});
    }

    /* PWM waveform: typical delays and linear edges, resistive load. The output follows the delayed command:
       it starts rising t_ON(DELAY) after IN turns on (taking t_r) and starts falling t_OFF(DELAY) after IN turns off. */
    function wave(D, f, n){
      const T = 1 / f, tdOn = DS.tdOn[1], tdOff = DS.tdOff[1], up = 1 / DS.tr[1], down = 1 / DS.tf[1];
      const always = D >= 1 || (D > 0 && D * T + tdOff >= T + tdOn);
      const ev = [];                                   // [time, target]
      if(D > 0 && !always) for(let k = -2; k <= 2; k++) ev.push([k * T + tdOn, 1], [k * T + D * T + tdOff, 0]);
      ev.sort((a, b) => a[0] - b[0]);
      const steps = 3000, dt = 3 * T / steps;          // simulate from −T so the first shown period is settled
      let x = always ? 1 : 0, e = 0, s1 = 0, s2 = 0, cnt = 0;
      const pts = [], cmd = [], every = Math.max(1, Math.round(steps / 3 / (n || 200)));
      for(let i = 0; i <= steps; i++){
        const tt = -T + i * dt;
        while(e < ev.length && ev[e][0] <= tt) e++;
        const target = always ? 1 : e ? ev[e - 1][1] : 0;
        x = target > x ? Math.min(target, x + up * dt) : Math.max(target, x - down * dt);
        if(tt >= 0){
          if(tt < T){ s1 += x; s2 += x * x; cnt++; }
          if(i % every === 0){
            pts.push([tt * 1e3, x * VS]);
            const ph = ((tt % T) + T) % T;
            cmd.push([tt * 1e3, ph < D * T ? VS : 0]);
          }
        }
      }
      return {pts, cmd, deff:s1 / cnt, pf:s2 / cnt, T};
    }
    function drawWave(I, D, f){
      const w = wave(D, f, 300);
      HSS.pwm.wave = {deff:w.deff, pf:w.pf, pload:VS * I * w.pf};
      plot($('hs-pwm-w'), {
        x:[0, 2 * w.T * 1e3], y:[0, 16], xlabel:t('時間 (ms)', 'Time (ms)'), ylabel:'V (V)', yticks:[0, 5, 10, 13.5],
        series:[
          {pts:w.cmd, color:'var(--s2)', w:1.4, dash:'5 4'},
          {pts:w.pts, color:'var(--s1)', fill:true, op:.12}
        ],
        extra:(X, Y) => '<text class="ts" x="' + (X(2 * w.T * 1e3) - 6).toFixed(1) + '" y="' + (Y(16) + 14).toFixed(1) + '" text-anchor="end" style="fill:var(--ink)">' +
          t('負載實際 duty ', 'load duty ') + (w.deff * 100).toFixed(1) + '%' + t('（指令 ', ' (command ') + (D * 100).toFixed(0) + '%' + t('）', ')') + '</text>'
      });
    }

    /* outputs across the whole range of one parameter, holding the others; a dot marks the current setting */
    const SWP = {
      'hs-pd':{l:t('工作週期 (%)', 'Duty cycle (%)'), k:'D', s:0.01},
      'hs-pf':{l:t('PWM 頻率 (Hz)', 'PWM frequency (Hz)'), k:'f', s:1},
      'hs-pi':{l:t('負載電流 (A)', 'Load current (A)'), k:'I', s:1},
      'hs-pta':{l:t('環境溫度 (°C)', 'Ambient (°C)'), k:'ta', s:1}
    };
    const OUTS = {
      tj:{l:t('接面溫度 T_J (°C)', 'Junction temperature T_J (°C)'), f:p => Math.min(solveTj(p.I, p.D, p.f, p.rth, p.ta).tj, 260)},
      loss:{l:t('開關總損耗 (W)', 'Total switch loss (W)'), f:p => { const r = solveTj(p.I, p.D, p.f, p.rth, p.ta); return r.pc + r.ps; }},
      pload:{l:t('負載功率 (W)', 'Load power (W)'), f:p => VS * p.I * wave(p.D, p.f, 10).pf},
      deff:{l:t('負載實際 duty (%)', 'Duty seen by the load (%)'), f:p => wave(p.D, p.f, 10).deff * 100}
    };
    function drawSweepPlot(p){
      const pid = $('hs-sw-param').value, out = OUTS[$('hs-sw-out').value], sp = SWP[pid], el = $(pid);
      const lo = +el.min, hi = +el.max, n = 41;
      const pts = Array.from({length:n}, (_, i) => {
        const v = lo + (hi - lo) * i / (n - 1);
        return [v, out.f({...p, [sp.k]:v * sp.s})];
      });
      const cur = [+el.value, out.f(p)];
      HSS.pwm.sweep = {param:pid, out:$('hs-sw-out').value, cur};
      const ys = pts.map(q => q[1]).concat(cur[1]);
      const yLo = Math.min(0, ...ys), yHi = Math.max(...ys) * 1.1 || 1;
      const isTj = out === OUTS.tj, isDeff = out === OUTS.deff;
      plot($('hs-pwm-s'), {
        x:[lo, hi], y:[yLo, Math.max(yHi, isTj ? 160 : 0)], xlabel:sp.l, ylabel:out.l, m:{l:60},
        series:[{pts, color:'var(--s1)'}].concat(isDeff && pid === 'hs-pd' ? [{pts:[[lo, lo], [hi, hi]], color:'var(--muted)', w:1.2, dash:'4 3'}] : []),
        hlines:isTj ? [{y:DS.tjTrip, label:'T_J(TRIP) min 150 °C', color:'var(--bad)'}] : [],
        vlines:pid === 'hs-pf' ? [{x:DS.fin, label:'F_in max 200 Hz', color:'var(--bad)', anchor:'end'}] : [],
        extra:(X, Y) => dot(X, Y, cur[0], cur[1], 'var(--ink)')
      });
    }

    /* auto sweep: run one slider back and forth; touching any control stops it */
    const panel = $('hs-pi').closest('.panel');
    const box = document.createElement('div');
    box.className = 'sweep';
    box.innerHTML = '<div class="sw-head">' + t('自動掃描', 'Auto sweep') + '<small>' + t('讓一個參數自己來回跑，看各個輸出怎麼跟著變', 'let one parameter run back and forth and watch how the outputs follow') + '</small></div>' +
      '<div class="ctl"><label for="hs-sw-param">' + t('掃描參數', 'Parameter') + '</label><select id="hs-sw-param">' +
      Object.entries(SWP).map(([id, s]) => '<option value="' + id + '"' + (id === 'hs-pd' ? ' selected' : '') + '>' + s.l + '</option>').join('') + '</select></div>' +
      '<div class="ctl"><label for="hs-sw-out">' + t('觀察的輸出', 'Output to plot') + '</label><select id="hs-sw-out">' +
      Object.entries(OUTS).map(([id, o]) => '<option value="' + id + '"' + (id === 'tj' ? ' selected' : '') + '>' + o.l + '</option>').join('') + '</select></div>' +
      '<div class="sw-row"><button class="btn pri sw-play" id="hs-sw-play" type="button" aria-pressed="false">' + t('▶ 開始掃描', '▶ Start sweep') + '</button>' +
      '<select id="hs-sw-speed" aria-label="' + t('速度', 'Speed') + '"><option value="260">' + t('慢', 'Slow') + '</option><option value="140" selected>' + t('中', 'Medium') + '</option><option value="70">' + t('快', 'Fast') + '</option></select></div>';
    panel.querySelector('.ctl').before(box);
    let sw = null;
    function stopSweep(){
      if(!sw) return;
      clearTimeout(sw.timer);
      sw.el.closest('.ctl').classList.remove('sw-on');
      $('hs-sw-play').textContent = t('▶ 開始掃描', '▶ Start sweep');
      $('hs-sw-play').setAttribute('aria-pressed', 'false');
      sw = null;
    }
    function tick(){
      const el = sw.el, lo = +el.min, hi = +el.max, st = +el.step || 1;
      const step = Math.max(st, Math.round((hi - lo) / 50 / st) * st);
      let v = +el.value + sw.dir * step;
      if(v >= hi){ v = hi; sw.dir = -1; } else if(v <= lo){ v = lo; sw.dir = 1; }
      sw.internal = true; el.value = v; el.dispatchEvent(new Event('input', {bubbles:true})); sw.internal = false;
      sw.timer = setTimeout(tick, +$('hs-sw-speed').value);
    }
    function startSweep(){
      stopSweep();
      const el = $($('hs-sw-param').value);
      sw = {el, dir:+el.value >= +el.max ? -1 : 1, timer:0, internal:false};
      el.closest('.ctl').classList.add('sw-on');
      $('hs-sw-play').textContent = t('■ 停止', '■ Stop');
      $('hs-sw-play').setAttribute('aria-pressed', 'true');
      tick();
    }
    $('hs-sw-play').addEventListener('click', () => sw ? stopSweep() : startSweep());
    $('hs-sw-param').addEventListener('change', () => { if(sw) startSweep(); else draw(); });
    $('hs-sw-out').addEventListener('change', draw);
    panel.addEventListener('input', e => { if(sw && !sw.internal && !e.target.closest('.sweep')) stopSweep(); });
    panel.addEventListener('click', e => { if(sw && e.target.closest('button[data-v]')) stopSweep(); });
    // stop when the calculator scrolls out of view, so nothing keeps redrawing in the background
    if('IntersectionObserver' in window)
      new IntersectionObserver(es => es.forEach(x => { if(!x.isIntersecting) stopSweep(); })).observe(panel.closest('.bench'));
    draw();
  }

  /* ---------- 4. sense amplifier offset → load-current offset ---------- */
  // the op-amp forces the sense FET's source to OUT + V_os, so I_IS = (I_L·R_DS(ON) − V_os) / (k·R_DS(ON)):
  // an offset voltage V_os looks like a load-current error of I_L0 = V_os / R_DS(ON)
  {
    const vS = range('hs-vos', v => v + ' µV', draw);
    const tj = toggle('hs-ostj', draw);
    const IL0_DS = {'25':0.13, '150':0.105};          // datasheet I_L0 limits, P_6.1.60 / 6.1.61
    function draw(){
      const vos = vS() * 1e-6, T = tj(), R = T === '150' ? DS.r150 : DS.r25;
      const il0 = vos / R;
      const err = I => il0 / I * 100;
      HSS.os = {vos, R, il0};
      const lim = IL0_DS[T];
      metrics($('hs-os-m'), [
        {l:t('等效負載電流偏移 I<sub>L0</sub>', 'Equivalent load-current offset I<sub>L0</sub>'), v:fmtSI(il0, 'A'), s:'V<sub>os</sub> / R<sub>DS(ON)</sub> (' + fmtSI(R, 'Ω', 2) + ')', cls:il0 > lim ? 'bad' : 'ok'},
        {l:t('感測電流偏移', 'Sense-current offset'), v:fmtSI(il0 / DS.kTyp, 'A'), s:'I<sub>L0</sub> / ' + DS.kTyp},
        {l:t('1 A 時的誤差', 'Error at 1 A'), v:'±' + err(1).toFixed(1), u:'%', cls:err(1) > 10 ? 'bad' : err(1) > 3 ? 'warn' : 'ok'},
        {l:t('20 A 時的誤差', 'Error at 20 A'), v:'±' + err(20).toFixed(2), u:'%'}
      ]);
      $('hs-os-n').innerHTML = il0 > lim
        ? t('超過資料手冊的 I<sub>L0</sub> 上限 ±' + lim + ' A：這個偏移量要靠修調或截波（chopper）放大器壓下來。', 'Above the datasheet I<sub>L0</sub> limit of ±' + lim + ' A: an offset this large has to be trimmed or removed with a chopper amplifier.')
        : t('在資料手冊的 I<sub>L0</sub> 上限 ±' + lim + ' A 以內。注意：主元件只有幾 mΩ，所以不到 1 mV 的偏移就等於上百 mA 的負載電流。', 'Within the datasheet I<sub>L0</sub> limit of ±' + lim + ' A. With a main device of only a few mΩ, less than 1 mV of offset already equals hundreds of mA of load current.');
      const xs = Array.from({length:61}, (_, i) => Math.pow(10, -1 + i * 2.8 / 60));
      plot($('hs-os-p'), {
        x:[0.1, 60], y:[0.01, 1000], logx:true, logy:true, m:{l:56},
        xlabel:t('負載電流 I_L (A)', 'Load current I_L (A)'), ylabel:t('誤差 (%)', 'Error (%)'),
        xticks:[0.1, 1, 10, 60], xfmt:v => String(v), yfmt:v => String(v),
        series:[
          {pts:xs.map(x => [x, lim / x * 100]), color:'var(--bad)', dash:'5 4', w:1.4},
          {pts:xs.map(x => [x, err(x)]), color:'var(--s1)'}
        ],
        hlines:[{y:14, label:t('比值公差約 ±14%', 'ratio tolerance about ±14%'), color:'var(--warn)'}],
        extra:(X, Y) => dot(X, Y, 1, Math.max(err(1), 0.011), 'var(--ink)')
      });
    }
    draw();
  }
})();
