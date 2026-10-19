/* PMIC Lab — seven behavioural simulations: LDO loop stability, PSRR, load transient, dropout & thermal, buck ripple & efficiency, MLCC DC bias, CP trim yield. */
(function(){
  const {plot, fmtSI} = window.MemPlot;
  const t = (window.MemSite && window.MemSite.t) || (zh => zh);
  const $ = id => document.getElementById(id);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lg = Math.log10;
  const DEG = 180 / Math.PI;
  const CAPS = [0.1, 0.22, 0.47, 1, 2.2, 4.7, 10, 22, 47].map(v => v * 1e-6);
  const logspace = (a, b, n) => Array.from({length:n}, (_, i) => Math.pow(10, lg(a) + (lg(b) - lg(a)) * i / (n - 1)));

  /* ---------- small UI helpers ---------- */
  function metrics(el, arr){
    el.innerHTML = arr.map(m => '<div class="metric ' + (m.cls || '') + '"><div class="ml">' + m.l + '</div><div class="mv">' + m.v +
      (m.u ? ' <small>' + m.u + '</small>' : '') + '</div>' + (m.s ? '<div class="ms">' + m.s + '</div>' : '') + '</div>').join('');
  }
  function toggle(id, onChange){
    const box = $(id);
    box.addEventListener('click', e => {
      const b = e.target.closest('button[data-v]'); if(!b) return;
      box.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
      onChange(b.dataset.v);
    });
    return () => box.querySelector('[aria-pressed="true"]').dataset.v;
  }
  function range(id, fmt, onChange){
    const el = $(id), out = $(id + '-o');
    const upd = () => { if(out) out.textContent = fmt(+el.value); };
    el.addEventListener('input', () => { upd(); onChange(); });
    upd();
    return {get: () => +el.value, set: v => { el.value = v; upd(); }, el};
  }
  const logMap = (lo, hi) => v => Math.pow(10, lg(lo) + (lg(hi) - lg(lo)) * v / 100);
  const dB = v => (v >= 0 ? '' : '−') + Math.abs(v).toFixed(1);
  const f1 = v => (v < 0 ? '−' : '') + Math.abs(v).toFixed(1);

  /* complex arithmetic: [re, im] */
  const C = {
    add:(a, b) => [a[0] + b[0], a[1] + b[1]],
    mul:(a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]],
    div:(a, b) => { const d = b[0] * b[0] + b[1] * b[1]; return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d]; },
    abs:a => Math.hypot(a[0], a[1]),
    arg:a => Math.atan2(a[1], a[0]),
    sc:(a, k) => [a[0] * k, a[1] * k]
  };
  const pole = (f, fp) => [1, f / fp];        // (1 + j f/fp)

  /* ---------- tabs ---------- */
  const tabs = [...document.querySelectorAll('[role=tab]')];
  const inited = {};
  function show(name){
    if(!document.getElementById('tab-' + name)) name = 'bode';
    tabs.forEach(t => t.setAttribute('aria-selected', t.dataset.tab === name ? 'true' : 'false'));
    document.querySelectorAll('.tabp').forEach(p => p.hidden = p.id !== 'tab-' + name);
    if(!inited[name]){ inited[name] = true; INIT[name](); }
    if(location.hash.slice(1) !== name) history.replaceState(null, '', '#' + name);
  }
  tabs.forEach(t => t.addEventListener('click', () => show(t.dataset.tab)));
  window.addEventListener('hashchange', () => show(location.hash.slice(1)));
  const INIT = {};
  const redraws = [];
  document.addEventListener('themechange', () => redraws.forEach(f => f()));

  /* =====================================================================
     1. LDO loop: load-dependent output pole, gate pole, ESR zero
     ===================================================================== */
  const LDO = {VOUT:1.8, VA:10, K:2, AEA:30, BETA:0.667, PG:5e5, P3:5e6, P4:2e7, ZI:3e5};
  function ldoLoop(f, p){
    const I = p.I, gm = Math.min(Math.sqrt(2 * LDO.K * I), I / 0.039);
    const ro = LDO.VA / I, rl = LDO.VOUT / I, rout = ro * rl / (ro + rl);
    const w = 2 * Math.PI * f;
    const zc = [p.esr, -1 / (w * p.c)];
    const zout = C.div(C.sc(zc, rout), C.add([rout, 0], zc));
    let L = C.sc(zout, LDO.AEA * LDO.BETA * gm);
    let ph = C.arg(zout) - Math.atan(f / LDO.PG) - Math.atan(f / LDO.P3) - Math.atan(f / LDO.P4);
    let mag = C.abs(L) / (C.abs(pole(f, LDO.PG)) * C.abs(pole(f, LDO.P3)) * C.abs(pole(f, LDO.P4)));
    if(p.mode === 'int'){ mag *= C.abs(pole(f, LDO.ZI)); ph += Math.atan(f / LDO.ZI); }
    return {mag, ph: ph * DEG};
  }
  function margins(p, n){
    const fs = logspace(0.1, 1e9, n || 360);
    let fc = null, pm = 180, prev = ldoLoop(fs[0], p);
    if(prev.mag < 1) return {fc:null, pm:90, gm:Infinity};
    let gmv = Infinity;
    for(let i = 1; i < fs.length; i++){
      const cur = ldoLoop(fs[i], p);
      if(prev.mag >= 1 && cur.mag < 1){
        const a = lg(prev.mag), b = lg(cur.mag), u = a / (a - b);
        fc = Math.pow(10, lg(fs[i - 1]) + u * (lg(fs[i]) - lg(fs[i - 1])));
        pm = 180 + ldoLoop(fc, p).ph;
      }
      if(prev.ph > -180 && cur.ph <= -180 && gmv === Infinity) gmv = -20 * lg(cur.mag);
      prev = cur;
    }
    return {fc, pm, gm:gmv};
  }

  INIT.bode = function(){
    const Imap = logMap(1e-5, 1), Emap = logMap(1e-3, 10);
    const getMode = toggle('bd-mode', render);
    const iS = range('bd-i', v => fmtSI(Imap(v), 'A'), render);
    const cS = range('bd-c', v => fmtSI(CAPS[v], 'F'), render);
    const eS = range('bd-esr', v => fmtSI(Emap(v), 'Ω'), render);
    document.querySelectorAll('#tab-bode [data-preset]').forEach(b => b.addEventListener('click', () => {
      eS.set({cer:18, tan:67, el:87}[b.dataset.preset]); render();
    }));
    function params(){ return {mode:getMode(), I:Imap(iS.get()), c:CAPS[cS.get()], esr:Emap(eS.get())}; }
    const pmCls = pm => pm >= 45 ? 'ok' : pm >= 20 ? 'warn' : 'bad';
    function render(){
      const p = params(), m = margins(p);
      const fs = logspace(10, 1e8, 300), pts = fs.map(f => ldoLoop(f, p));
      metrics($('bd-metrics'), [
        {l:t('相位裕度', 'Phase margin'), v:m.fc ? m.pm.toFixed(0) : '—', u:'°', cls:pmCls(m.pm), s:m.pm >= 45 ? t('穩定', 'stable') : m.pm >= 20 ? t('會振鈴', 'rings') : t('不穩定 / 振盪', 'unstable / oscillates')},
        {l:t('交越頻率', 'Crossover frequency'), v:m.fc ? fmtSI(m.fc, 'Hz') : '—', s:t('迴路增益 = 0 dB', 'loop gain = 0 dB')},
        {l:t('增益裕度', 'Gain margin'), v:isFinite(m.gm) ? m.gm.toFixed(0) : '∞', u:'dB', cls:m.gm >= 10 ? 'ok' : m.gm >= 0 ? 'warn' : 'bad'},
        {l:t('DC 迴路增益', 'DC loop gain'), v:(20 * lg(pts[0].mag)).toFixed(0), u:'dB', s:t('決定負載 / 線性調節率', 'sets load / line regulation')},
        {l:t('ESR 零點', 'ESR zero'), v:fmtSI(1 / (2 * Math.PI * p.esr * p.c), 'Hz')}
      ]);
      const vl = m.fc ? [{x:m.fc, color:'var(--accent)', label:'f_c'}] : [];
      plot($('bd-gain'), {x:[10, 1e8], y:[-60, 100], logx:true, W:380, H:290, xlabel:t('頻率 (Hz)', 'Frequency (Hz)'), ylabel:'dB', yticks:[-60, -30, 0, 30, 60, 90],
        series:[{pts:fs.map((f, i) => [f, 20 * lg(pts[i].mag)]), color:'var(--accent)', w:2.2}],
        hlines:[{y:0, label:'0 dB'}], vlines:vl});
      plot($('bd-phase'), {x:[10, 1e8], y:[-270, 0], logx:true, W:380, H:290, xlabel:t('頻率 (Hz)', 'Frequency (Hz)'), ylabel:t('度', 'deg'), yticks:[-270, -180, -90, 0],
        series:[{pts:fs.map((f, i) => [f, pts[i].ph]), color:'var(--s2)', w:2.2}],
        hlines:[{y:-180, color:'var(--bad)', label:'−180°'}], vlines:m.fc ? [{x:m.fc, color:'var(--accent)', label:'PM ' + m.pm.toFixed(0) + '°'}] : []});
      // stability map
      const NX = 40, NY = 26, ex = [1e-3, 10], iy = [1e-5, 1];
      plot($('bd-map'), {x:ex, y:iy, logx:true, logy:true, H:290, xlabel:'ESR (Ω)', ylabel:t('負載電流 (A)', 'Load current (A)'),
        extra:(X, Y) => {
          let s = '';
          for(let a = 0; a < NX; a++) for(let b = 0; b < NY; b++){
            const e0 = Math.pow(10, -3 + 4 * a / NX), e1 = Math.pow(10, -3 + 4 * (a + 1) / NX);
            const i0 = Math.pow(10, -5 + 5 * b / NY), i1 = Math.pow(10, -5 + 5 * (b + 1) / NY);
            const pm = margins({mode:p.mode, c:p.c, esr:Math.sqrt(e0 * e1), I:Math.sqrt(i0 * i1)}, 160).pm;
            const col = pm >= 45 ? 'var(--ok)' : pm >= 20 ? 'var(--warn)' : 'var(--bad)';
            s += '<rect x="' + X(e0).toFixed(1) + '" y="' + Y(i1).toFixed(1) + '" width="' + (X(e1) - X(e0) + .6).toFixed(1) + '" height="' + (Y(i0) - Y(i1) + .6).toFixed(1) + '" style="fill:' + col + ';fill-opacity:.42"/>';
          }
          s += '<circle cx="' + X(p.esr).toFixed(1) + '" cy="' + Y(p.I).toFixed(1) + '" r="6" style="fill:none;stroke:var(--ink);stroke-width:2.2"/>';
          return s;
        }});
    }
    render(); redraws.push(render);
  };

  /* =====================================================================
     2. PSRR: loop gain at low frequency, coupling + output cap at high frequency
     ===================================================================== */
  function psrrH(f, p){
    const w = 2 * Math.PI * f, rds = 0.3;
    const vdo = p.I * rds, x = clamp((p.hr - vdo) / 0.25, 0, 1);
    const a0dB = (70 - 2 * (lg(p.I) + 5)) * Math.pow(x, 0.7);
    const A0 = Math.pow(10, a0dB / 20), fp1 = p.ugb / Math.max(A0, 1.0001), fp2 = 2.5 * p.ugb;
    const L = C.div([A0, 0], C.mul(pole(f, fp1), pole(f, fp2)));
    const zc = [0.005, w * 0.6e-9 - 1 / (w * p.c)];
    const rl = 1.8 / p.I, zl = C.div(C.sc(zc, rl), C.add([rl, 0], zc));
    const rff = (p.pass === 'n' ? 10 : 1) * (rds + (10 / p.I) * x * x);
    const g0 = C.div(zl, C.add(zl, [rff, 0]));
    const zp = [0, -1 / (w * (p.pass === 'n' ? 1e-9 : 1e-8))];
    const hhf = C.div(zc, C.add(zc, zp));
    const H = C.div(C.add(g0, hhf), C.add([1, 0], L));   // both feed-through paths are suppressed by the loop
    return C.abs(H);
  }
  INIT.psrr = function(){
    const Imap = logMap(1e-5, 1), Bmap = logMap(3e4, 3e6);
    const getPass = toggle('ps-pass', render);
    const hr = range('ps-hr', v => v.toFixed(2) + ' V', render);
    const iS = range('ps-i', v => fmtSI(Imap(v), 'A'), render);
    const bw = range('ps-bw', v => fmtSI(Bmap(v), 'Hz'), render);
    const cS = range('ps-c', v => fmtSI(CAPS[v], 'F'), render);
    const fsw = range('ps-fsw', v => v.toFixed(1) + ' MHz', render);
    const rip = range('ps-rip', v => v + ' mVpp', render);
    function render(){
      const p = {pass:getPass(), hr:hr.get(), I:Imap(iS.get()), ugb:Bmap(bw.get()), c:CAPS[cS.get()]};
      const F = fsw.get() * 1e6, ps = f => -20 * lg(psrrH(f, p));
      const ref = Object.assign({}, p, {hr:1.0});
      const fs = logspace(10, 1e8, 300);
      const atF = ps(F), outRip = rip.get() * 1e-3 * Math.pow(10, -atF / 20);
      const vdo = p.I * 0.3, inDO = p.hr < vdo + 0.05;
      metrics($('ps-metrics'), [
        {l:'PSRR @ 1 kHz', v:dB(ps(1e3)), u:'dB'},
        {l:'PSRR @ 100 kHz', v:dB(ps(1e5)), u:'dB'},
        {l:'PSRR @ ' + fsw.get().toFixed(1) + ' MHz', v:dB(atF), u:'dB', cls:atF >= 40 ? 'ok' : atF >= 25 ? 'warn' : 'bad'},
        {l:t('輸出端漣波', 'Output ripple'), v:fmtSI(outRip, 'V'), s:t('pp，輸入 ', 'pp, input ') + rip.get() + ' mVpp', cls:outRip < 1e-3 ? 'ok' : outRip < 5e-3 ? 'warn' : 'bad'},
        {l:t('壓差 V<sub>DO</sub>', 'Dropout V<sub>DO</sub>'), v:fmtSI(vdo, 'V'), s:inDO ? t('已進入壓差區', 'in dropout') : t('裕度 ', 'headroom ') + fmtSI(p.hr - vdo, 'V'), cls:inDO ? 'bad' : p.hr - vdo < 0.25 ? 'warn' : 'ok'}
      ]);
      plot($('ps-plot'), {x:[10, 1e8], y:[0, 100], logx:true, H:280, xlabel:t('頻率 (Hz)', 'Frequency (Hz)'), ylabel:'PSRR (dB)',
        series:[{pts:fs.map(f => [f, -20 * lg(psrrH(f, ref))]), color:'var(--muted)', w:1.4, dash:'5 4'},
                {pts:fs.map(f => [f, ps(f)]), color:'var(--accent)', w:2.4}],
        vlines:[{x:F, color:'var(--s2)', label:'f_SW', dash:'4 3'}]});
      const hrs = Array.from({length:150}, (_, i) => 0.02 + 1.48 * i / 149);
      plot($('ps-hr-plot'), {x:[0, 1.5], y:[0, 90], H:220, xlabel:'V_IN − V_OUT (V)', ylabel:'PSRR (dB)',
        series:[{pts:hrs.map(h => [h, -20 * lg(psrrH(F, Object.assign({}, p, {hr:h})))]), color:'var(--accent)', w:2.2}],
        vlines:[{x:vdo, color:'var(--bad)', label:'V_DO'}, {x:p.hr, color:'var(--ink)', label:t('目前', 'now'), dash:'2 3', anchor:p.hr > 1.1 ? 'end' : 'start'}]});
    }
    render(); redraws.push(render);
  };

  /* =====================================================================
     3. Load transient: two-pole loop, slew-limited pass current, cap + ESR
     ===================================================================== */
  INIT.transient = function(){
    const Imap = logMap(1e-5, 1), Tmap = logMap(1e-8, 1e-5), Emap = logMap(1e-3, 1), Bmap = logMap(2e4, 2e6), Smap = logMap(1e-3, 10);
    const i1 = range('tr-i1', v => fmtSI(Imap(v), 'A'), render);
    const i2 = range('tr-i2', v => fmtSI(Imap(v), 'A'), render);
    const trS = range('tr-tr', v => fmtSI(Tmap(v), 's'), render);
    const cS = range('tr-c', v => fmtSI(CAPS[v], 'F'), render);
    const eS = range('tr-esr', v => fmtSI(Emap(v), 'Ω'), render);
    const bw = range('tr-bw', v => fmtSI(Bmap(v), 'Hz'), render);
    const pmS = range('tr-pm', v => v + '°', render);
    const sr = range('tr-sr', v => fmtSI(Smap(v), 'A/µs'), render);
    function render(){
      const lo = Math.min(Imap(i1.get()), Imap(i2.get())), hi = Math.max(Imap(i1.get()), Imap(i2.get())), dI = hi - lo;
      const tr = Tmap(trS.get()), c = CAPS[cS.get()], esr = Emap(eS.get()), ugb = Bmap(bw.get()), pm = pmS.get(), SR = Smap(sr.get()) * 1e6;
      const gm = 2 * Math.PI * ugb * c, fp = ugb / Math.tan((90 - pm) / DEG), wp = 2 * Math.PI * fp;
      const zeta = Math.max(pm / 100, 0.15), ADC = 200, wi = 2 * Math.PI * ugb / 4, tau = ADC / wi;   // lag-lead: DC gain ×200, zero two octaves below f_c
      const half = Math.max(6 / (zeta * 2 * Math.PI * ugb), 4 / wi, 4 * tr, 3 * dI / SR, 1e-7);
      const T = 2 * half, t1 = 0.1 * half, t2 = 1.1 * half;
      const NREC = 3000, dtMax = 0.03 / Math.max(wp, 2 * Math.PI * ugb, 1 / tr);
      const sub = Math.max(1, Math.ceil(T / NREC / dtMax)), dt = T / NREC / sub;
      const iload = t => t < t1 ? lo : t < t1 + tr ? lo + dI * (t - t1) / tr : t < t2 ? hi : t < t2 + tr ? hi - dI * (t - t2) / tr : lo;
      let vc = 0, ip = lo, tt = 0, v = 0, y = 0;
      const rec = [];
      for(let k = 0; k <= NREC; k++){
        rec.push([tt, v, iload(tt), ip]);
        for(let s = 0; s < sub; s++){
          const il = iload(tt);
          v = vc + esr * (ip - il);
          y += (-y - gm * (ADC - 1) * v) / tau * dt;
          const ref = lo - gm * v + y;
          let dip = wp * (ref - ip) * dt;
          dip = clamp(dip, -SR * dt, SR * dt);
          ip += dip;
          vc += (ip - il) / c * dt;
          tt += dt;
        }
      }
      const up = rec.filter(r => r[0] >= t1 && r[0] < t2), dn = rec.filter(r => r[0] >= t2);
      const vmin = Math.min(...up.map(r => r[1])), vmax = Math.max(...dn.map(r => r[1]));
      const vfin = -dI / (gm * ADC), band = Math.max(1e-3, 0.02 * Math.abs(vmin));
      let ts = 0; up.forEach(r => { if(Math.abs(r[1] - vfin) > band) ts = r[0] - t1; });
      const simple = dI * esr + dI / gm;
      metrics($('tr-metrics'), [
        {l:t('下衝（輕載→重載）', 'Undershoot (light→heavy)'), v:fmtSI(-vmin, 'V'), cls:-vmin < 0.03 ? 'ok' : -vmin < 0.08 ? 'warn' : 'bad'},
        {l:t('過衝（重載→輕載）', 'Overshoot (heavy→light)'), v:fmtSI(vmax - 0, 'V'), cls:vmax < 0.03 ? 'ok' : vmax < 0.08 ? 'warn' : 'bad'},
        {l:t('恢復時間', 'Recovery time'), v:fmtSI(ts, 's'), s:t('進入 ±', 'into ±') + fmtSI(band, 'V') + t(' 帶', ' band')},
        {l:t('ΔI·ESR 跳動', 'ΔI·ESR step'), v:fmtSI(dI * esr, 'V')},
        {l:t('估算 ΔI·ESR + ΔI/(2π·f_c·C)', 'Estimate ΔI·ESR + ΔI/(2π·f_c·C)'), v:fmtSI(simple, 'V'), s:t('一階手算', 'first-order hand calc')},
        {l:t('負載調節誤差', 'Load-regulation error'), v:fmtSI(-vfin, 'V'), s:t('有限迴路增益', 'finite loop gain')}
      ]);
      const us = 1e6, ymin = Math.min(vmin * 1e3 * 1.15, -5), ymax = Math.max(vmax * 1e3 * 1.15, 5);
      plot($('tr-v'), {x:[0, T * us], y:[ymin, ymax], H:250, xlabel:t('時間 (µs)', 'Time (µs)'), ylabel:'ΔV (mV)',
        series:[{pts:rec.map(r => [r[0] * us, r[1] * 1e3]), color:'var(--accent)', w:2}], hlines:[{y:0}]});
      plot($('tr-i'), {x:[0, T * us], y:[0, Math.max(hi * 1.15, ...rec.map(r => r[3])) * 1.1e3], H:200, xlabel:t('時間 (µs)', 'Time (µs)'), ylabel:'mA',
        series:[{pts:rec.map(r => [r[0] * us, r[2] * 1e3]), color:'var(--muted)', w:1.6, dash:'5 4'},
                {pts:rec.map(r => [r[0] * us, r[3] * 1e3]), color:'var(--accent)', w:2}]});
    }
    render(); redraws.push(render);
  };

  /* =====================================================================
     4. Dropout & thermal: self-heating loop, TSD hiccup
     ===================================================================== */
  const PKG = [{n:'SC-70', th:260}, {n:'SOT-23-5', th:210}, {n:'WLCSP', th:85}, {n:'DFN 2×2', th:65}, {n:'SOIC-8 EP', th:45}, {n:'QFN 3×3', th:40}];
  const TSD = 160, THYS = 20, IQ = 50e-6;
  function ldoOp(vin, vset, I, th, ta, heat){
    let tj = ta, vout = vset, pd = 0, vdo = 0;
    for(let k = 0; k < 40; k++){
      const r = 0.25 * (1 + 0.004 * ((heat ? tj : 25) - 25));
      vdo = I * r;
      vout = Math.max(0, Math.min(vset, vin - vdo));
      pd = (vin - vout) * I + vin * IQ;
      const nt = ta + pd * th;
      if(!heat){ tj = nt; break; }
      if(Math.abs(nt - tj) < 0.01){ tj = nt; break; }
      tj = Math.min(nt, 400);
    }
    return {tj, vout, pd, vdo};
  }
  INIT.thermal = function(){
    const vin = range('th-vin', v => v.toFixed(1) + ' V', render);
    const vset = range('th-vout', v => v.toFixed(1) + ' V', render);
    const iS = range('th-i', v => v + ' mA', render);
    const bd = range('th-board', v => '× ' + v.toFixed(2), render);
    const ta = range('th-ta', v => v + ' °C', render);
    $('th-pkg').addEventListener('change', render);
    function render(){
      const Vin = vin.get(), Vs = vset.get(), I = iS.get() / 1000, Ta = ta.get(), k = +$('th-pkg').value;
      const th = PKG[k].th * bd.get();
      const op = ldoOp(Vin, Vs, I, th, Ta, true);
      const tsd = op.tj >= TSD;
      // highest current that keeps T_J below TSD
      let imax = 1;
      for(let ii = 1; ii <= 1000; ii += 5){ if(ldoOp(Vin, Vs, ii / 1000, th, Ta, true).tj >= TSD){ imax = (ii - 5) / 1000; break; } }
      const dropping = Vin - Vs < op.vdo;
      metrics($('th-metrics'), [
        {l:t('功耗 P<sub>D</sub>', 'Dissipation P<sub>D</sub>'), v:fmtSI(op.pd, 'W')},
        {l:t('接面溫度 T<sub>J</sub>', 'Junction temp T<sub>J</sub>'), v:op.tj > 399 ? '> 400' : op.tj.toFixed(0), u:'°C', cls:op.tj < 125 ? 'ok' : op.tj < TSD ? 'warn' : 'bad', s:tsd ? t('熱關機！', 'thermal shutdown!') : t('距熱關機 ', 'to TSD: ') + (TSD - op.tj).toFixed(0) + ' °C'},
        {l:t('等效 θ<sub>JA</sub>', 'Effective θ<sub>JA</sub>'), v:th.toFixed(0), u:'°C/W'},
        {l:t('V<sub>OUT</sub> 實際', 'Actual V<sub>OUT</sub>'), v:op.vout.toFixed(2), u:'V', cls:dropping ? 'warn' : '', s:dropping ? t('壓差區：輸出跟著 V_IN 走', 'dropout: output tracks V_IN') : t('穩壓中', 'regulating')},
        {l:t('壓差（當下 T<sub>J</sub>）', 'Dropout (at present T<sub>J</sub>)'), v:fmtSI(op.vdo, 'V')},
        {l:t('不熱關機的最大電流', 'Max current without TSD'), v:imax >= 1 ? '≥ 1 A' : fmtSI(Math.max(imax, 0), 'A'), s:t('此 V_IN、封裝與 T_A', 'at this V_IN, package and T_A')},
        {l:t('效率', 'Efficiency'), v:(100 * op.vout * I / Math.max(Vin * (I + IQ), 1e-12)).toFixed(0), u:'%'}
      ]);
      const Is = Array.from({length:101}, (_, i) => i / 100);
      // above ~400 °C the self-heating model is meaningless (the part is long in thermal shutdown): end the curve there
      const curves = PKG.map(pk => Is.map(ii => { const tj = ldoOp(Vin, Vs, ii, pk.th * bd.get(), Ta, true).tj; return [ii, tj >= 399 ? NaN : tj]; }));
      const ylo = Math.min(Ta, 0) - 5;
      const yhi = Math.min(420, Math.ceil(Math.max(TSD + 40, Math.min(op.tj, 400), ...curves[k].map(p => p[1]).filter(isFinite)) * 1.05 / 50) * 50);
      plot($('th-tj'), {x:[0, 1], y:[ylo, yhi], W:380, H:300, xlabel:t('負載電流 (A)', 'Load current (A)'), ylabel:'T_J (°C)',
        series:curves.map((pts, j) => ({pts, color:j === k ? 'var(--accent)' : 'var(--muted)', w:j === k ? 2.6 : 1, dash:j === k ? null : '3 3'})),
        hlines:[{y:TSD, color:'var(--bad)'}, {y:125}],
        extra:(X, Y) => '<circle cx="' + X(I).toFixed(1) + '" cy="' + Y(Math.min(op.tj, yhi)).toFixed(1) + '" r="5" style="fill:var(--accent);stroke:var(--surface);stroke-width:2"/>' +
          '<text class="ts" x="' + (X(0) + 4) + '" y="' + (Y(TSD) - 4).toFixed(1) + '" style="fill:var(--bad)">' + t('熱關機 160 °C', 'TSD 160 °C') + '</text>' +
          '<text class="ts t-mut" x="' + (X(0) + 4) + '" y="' + (Y(125) + 12).toFixed(1) + '">125 °C</text>' +
          (() => {
            // label each package at the right edge, or where its curve leaves the plot; push labels apart vertically
            const labs = curves.map((pts, j) => {
              const fin = pts.filter(p => isFinite(p[1]));
              const last = fin[fin.length - 1], exits = last[1] >= yhi * 0.97 || last[0] < 1;
              const ax = exits ? Math.min(last[0], 1) : 1, ay = Math.min(last[1], yhi);
              if(ay - ylo < 0.12 * (yhi - ylo)) return null;
              return {j, x:X(ax) - 4, y:Y(ay) + (exits ? 13 : -4)};
            }).filter(Boolean).sort((a, b) => a.y - b.y);
            for(let n = 1; n < labs.length; n++) if(Math.abs(labs[n].x - labs[n - 1].x) < 60 && labs[n].y - labs[n - 1].y < 12) labs[n].y = labs[n - 1].y + 12;
            return labs.map(l => '<text class="ts" x="' + l.x.toFixed(1) + '" y="' + l.y.toFixed(1) + '" text-anchor="end" style="paint-order:stroke;stroke:var(--surface);stroke-width:3px;stroke-linejoin:round;fill:' + (l.j === k ? 'var(--accent)' : 'var(--muted)') + (l.j === k ? ';font-weight:600' : '') + '">' + PKG[l.j].n + '</text>').join('');
          })()});
      const vmax = Math.max(Vs + 2, 4), vins = Array.from({length:121}, (_, i) => vmax * i / 120);
      plot($('th-do'), {x:[0, vmax], y:[0, Vs * 1.2], W:380, H:300, xlabel:'V_IN (V)', ylabel:'V_OUT (V)',
        series:[{pts:vins.map(v => [v, ldoOp(v, Vs, I, th, Ta, false).vout]), color:'var(--muted)', w:1.4, dash:'5 4'},
                {pts:vins.map(v => { const o = ldoOp(v, Vs, I, th, Ta, true); return [v, o.tj >= TSD ? NaN : o.vout]; }), color:'var(--accent)', w:2.4}],
        vlines:[{x:Vin, color:'var(--ink)', label:t('目前 V_IN', 'present V_IN'), dash:'2 3', anchor:Vin > vmax * 0.6 ? 'end' : 'start'}]});
      // hiccup waveform (thermal RC, tau ~ 0.4 s)
      const tau = 0.4, Tend = 6, N = 1200, rec = [];
      let tj = Ta, on = true;
      const tjOn = Ta + op.pd * th;
      for(let n = 0; n <= N; n++){
        const t = Tend * n / N;
        rec.push([t, tj, on]);
        const target = on ? tjOn : Ta;
        tj += (target - tj) * (Tend / N) / tau;
        if(on && tj >= TSD) on = false; else if(!on && tj <= TSD - THYS) on = true;
      }
      plot($('th-hic'), {x:[0, Tend], y:[Math.min(Ta, 0) - 5, Math.max(TSD + 20, Math.min(tjOn, 300) + 10)], H:200, xlabel:t('時間 (s)', 'Time (s)'), ylabel:'T_J (°C)',
        series:[{pts:rec.map(r => [r[0], r[1]]), color:'var(--s2)', w:2}],
        hlines:[{y:TSD, color:'var(--bad)', label:t('關斷 160 °C', 'off 160 °C')}, {y:TSD - THYS, label:t('恢復 140 °C', 'restart 140 °C')}],
        extra:(X, Y) => { let s = '', st = null; rec.forEach((r, i) => { if(r[2] && st === null) st = r[0]; if((!r[2] || i === rec.length - 1) && st !== null){ s += '<rect x="' + X(st).toFixed(1) + '" y="' + (Y(Math.min(Ta, 0) - 5) - 10).toFixed(1) + '" width="' + (X(r[0]) - X(st)).toFixed(1) + '" height="10" style="fill:var(--ok);fill-opacity:.6"/>'; st = null; } });
          return s + '<text class="ts" x="' + (X(0) + 6) + '" y="' + (Y(Math.min(Ta, 0) - 5) - 14).toFixed(1) + t('" style="fill:var(--ok)">綠色 = 輸出開啟</text>', '" style="fill:var(--ok)">green = output on</text>'); }});
    }
    render(); redraws.push(render);
  };

  /* =====================================================================
     5. Buck: inductor current, output ripple, CCM / DCM / FPWM, efficiency
     ===================================================================== */
  const LS = [0.22, 0.33, 0.47, 0.68, 1, 1.5, 2.2, 3.3, 4.7, 10].map(v => v * 1e-6);
  const BK = {RHS:0.06, RLS:0.03, TSW:8e-9, QG:4e-9, VDRV:5, TONMIN:60e-9};
  function buckOp(p){
    const T = 1 / p.f, D = p.vout / p.vin, L = p.L, dcr = 0.02 * Math.pow(L / 1e-6, 0.7);
    const dI = p.vout * (1 - D) / (L * p.f), icrit = dI / 2;
    const out = {D, dI, dcr, T};
    if(p.mode === 'pfm' && p.I < icrit){
      // PFM: fixed-peak bursts, frequency scales with load
      const ipk = dI, t1 = L * ipk / (p.vin - p.vout), t2 = L * ipk / p.vout;
      const feff = p.I / (ipk * (t1 + t2) / 2);
      const pc = ipk * ipk / 3 * (t1 * BK.RHS + t2 * BK.RLS + (t1 + t2) * dcr) * feff;
      const ps = 0.5 * p.vin * ipk * BK.TSW * feff + BK.QG * BK.VDRV * feff + p.vin * 25e-6;
      return Object.assign(out, {mode:'PFM / DCM', ipk, imin:0, t1, t2, feff, loss:pc + ps});
    }
    const ipk = p.I + dI / 2, imin = p.I - dI / 2, irms2 = p.I * p.I + dI * dI / 12;
    const pc = irms2 * (D * BK.RHS + (1 - D) * BK.RLS + dcr);
    const ps = 0.5 * p.vin * BK.TSW * p.f * (Math.abs(ipk) + Math.abs(Math.min(imin, 0))) + BK.QG * BK.VDRV * p.f + p.vin * 1e-3;
    return Object.assign(out, {mode:imin < 0 ? t('FPWM（電流反向）', 'FPWM (negative current)') : 'CCM', ipk, imin, feff:p.f, loss:pc + ps});
  }
  INIT.buck = function(){
    const Imap = logMap(1e-3, 3), Emap = logMap(1e-3, 0.1);
    const getMode = toggle('bk-mode', render);
    const vin = range('bk-vin', v => v.toFixed(1) + ' V', render);
    const vout = range('bk-vout', v => v.toFixed(2) + ' V', render);
    const iS = range('bk-i', v => fmtSI(Imap(v), 'A'), render);
    const fS = range('bk-f', v => v.toFixed(1) + ' MHz', render);
    const lS = range('bk-l', v => fmtSI(LS[v], 'H'), render);
    const isat = range('bk-isat', v => v.toFixed(1) + ' A', render);
    const cS = range('bk-c', v => fmtSI(CAPS[v], 'F'), render);
    const eS = range('bk-esr', v => fmtSI(Emap(v), 'Ω'), render);
    function render(){
      const p = {vin:vin.get(), vout:Math.min(vout.get(), vin.get() * 0.95), I:Imap(iS.get()), f:fS.get() * 1e6, L:LS[lS.get()], mode:getMode()};
      const c = CAPS[cS.get()], esr = Emap(eS.get()), Isat = isat.get();
      const o = buckOp(p), pfm = o.mode.startsWith('PFM');
      const ton = pfm ? o.t1 : o.D * o.T, tonBad = ton < BK.TONMIN;
      // waveform: three switching periods (or three PFM bursts)
      const per = pfm ? 1 / o.feff : o.T, win = 3 * per, N = 900, dt = win / N, pts = [];
      for(let n = 0; n <= N; n++){
        const t = n * dt, u = (t % per);
        let il;
        if(pfm){ il = u < o.t1 ? o.ipk * u / o.t1 : u < o.t1 + o.t2 ? o.ipk * (1 - (u - o.t1) / o.t2) : 0; }
        else { const ton0 = o.D * per; il = u < ton0 ? o.imin + (o.ipk - o.imin) * u / ton0 : o.ipk - (o.ipk - o.imin) * (u - ton0) / (per - ton0); }
        pts.push([t, il]);
      }
      let vc = 0; const vr = pts.map(([t, il]) => { const ic = il - p.I; vc += ic * dt / c; return [t, vc + esr * ic]; });
      const mean = vr.reduce((s, r) => s + r[1], 0) / vr.length; vr.forEach(r => { r[1] -= mean; });
      const vpp = Math.max(...vr.map(r => r[1])) - Math.min(...vr.map(r => r[1]));
      const eff = 100 * p.vout * p.I / (p.vout * p.I + o.loss);
      metrics($('bk-metrics'), [
        {l:t('工作週期 D', 'Duty cycle D'), v:(100 * o.D).toFixed(1), u:'%', s:'t_ON = ' + fmtSI(ton, 's'), cls:tonBad ? 'bad' : ''},
        {l:t('漣波電流 ΔI<sub>L</sub>', 'Ripple current ΔI<sub>L</sub>'), v:fmtSI(o.dI, 'A'), s:(100 * o.dI / p.I).toFixed(0) + '% of I_OUT'},
        {l:t('峰值電流', 'Peak current'), v:fmtSI(o.ipk, 'A'), s:'I_sat ' + Isat.toFixed(1) + ' A', cls:o.ipk > Isat ? 'bad' : o.ipk > 0.85 * Isat ? 'warn' : 'ok'},
        {l:t('輸出漣波', 'Output ripple'), v:fmtSI(vpp, 'V'), s:'pp', cls:vpp < 0.01 * p.vout ? 'ok' : vpp < 0.03 * p.vout ? 'warn' : 'bad'},
        {l:t('模式', 'Mode'), v:o.mode, s:pfm ? t('有效頻率 ', 'effective freq ') + fmtSI(o.feff, 'Hz') : (tonBad ? t('低於 t_ON,min → 跳脈衝', 'below t_ON,min → pulse skipping') : '')},
        {l:t('估計效率', 'Estimated efficiency'), v:eff.toFixed(1), u:'%', cls:eff > 85 ? 'ok' : eff > 70 ? 'warn' : 'bad'}
      ]);
      const us = 1e6, ilmin = Math.min(0, o.imin), ilmax = Math.max(o.ipk, Isat) * 1.1;
      plot($('bk-il'), {x:[0, win * us], y:[ilmin - 0.05 * ilmax, ilmax], H:230, xlabel:t('時間 (µs)', 'Time (µs)'), ylabel:'i_L (A)',
        series:[{pts:pts.map(r => [r[0] * us, r[1]]), color:'var(--accent)', w:2.2}],
        hlines:[{y:p.I, label:'I_OUT'}, {y:Isat, color:'var(--bad)', label:'I_sat'}, {y:0, color:'var(--line)'}]});
      const vm = Math.max(vpp * 0.7, 1e-4) * 1e3;
      plot($('bk-v'), {x:[0, win * us], y:[-vm, vm], W:380, H:270, xlabel:t('時間 (µs)', 'Time (µs)'), ylabel:'mV',
        series:[{pts:vr.map(r => [r[0] * us, r[1] * 1e3]), color:'var(--s3)', w:2}]});
      const Is = logspace(1e-3, 3, 80), other = p.mode === 'pfm' ? 'fpwm' : 'pfm';
      const effAt = (ii, m) => { const q = buckOp(Object.assign({}, p, {I:ii, mode:m})); return 100 * p.vout * ii / (p.vout * ii + q.loss); };
      plot($('bk-eff'), {x:[1e-3, 3], y:[0, 100], logx:true, W:380, H:270, xlabel:t('負載電流 (A)', 'Load current (A)'), ylabel:t('效率 (%)', 'Efficiency (%)'),
        series:[{pts:Is.map(ii => [ii, effAt(ii, other)]), color:'var(--muted)', w:1.4, dash:'5 4'},
                {pts:Is.map(ii => [ii, effAt(ii, p.mode)]), color:'var(--accent)', w:2.4}],
        extra:(X, Y) => '<circle cx="' + X(p.I).toFixed(1) + '" cy="' + Y(eff).toFixed(1) + '" r="5" style="fill:var(--accent);stroke:var(--surface);stroke-width:2"/>'});
    }
    render(); redraws.push(render);
  };

  /* =====================================================================
     6. MLCC: DC bias, temperature, tolerance, ageing
     ===================================================================== */
  const MC = [0.1, 0.22, 0.47, 1, 2.2, 4.7, 10, 22];
  const SIZE = [{n:'0201', s:0.3}, {n:'0402', s:0.4}, {n:'0603', s:0.59}, {n:'0805', s:0.71}, {n:'1206', s:0.85}];
  const DIEL = {x5r:{v0:1, age:0.025}, x7r:{v0:1.1, age:0.015}, y5v:{v0:0.4, age:0.05}};
  function biasF(V, cu, size, vr, d){
    const v0 = vr * SIZE[size].s * Math.pow(1 / cu, 0.15) * DIEL[d].v0;
    return 1 / (1 + Math.pow(Math.max(V, 0) / v0, 1.6));
  }
  function tempF(T, d){
    if(d === 'x5r') return T >= 25 ? 1 - 0.15 * Math.pow((T - 25) / 60, 2) : 1 - 0.10 * Math.pow((25 - T) / 80, 2);
    if(d === 'x7r') return T >= 25 ? 1 - 0.15 * Math.pow((T - 25) / 100, 2) : 1 - 0.10 * Math.pow((25 - T) / 80, 2);
    return Math.max(0.05, T >= 25 ? 1 - 0.82 * Math.pow((T - 25) / 60, 1.5) : 1 - 0.6 * Math.pow((25 - T) / 55, 1.3));
  }
  INIT.mlcc = function(){
    const cS = range('ml-c', v => MC[v] + ' µF', render);
    const vS = range('ml-v', v => v.toFixed(1) + ' V', render);
    const tS = range('ml-t', v => v + ' °C', render);
    const aS = range('ml-age', v => { const h = Math.pow(10, v); return h < 48 ? h.toFixed(0) + t(' 小時', ' h') : h < 8760 ? (h / 24).toFixed(0) + t(' 天', ' days') : (h / 8760).toFixed(1) + t(' 年', ' yr'); }, render);
    const rS = range('ml-req', v => v.toFixed(1) + ' µF', render);
    ['ml-size', 'ml-vr', 'ml-diel', 'ml-tol'].forEach(id => $(id).addEventListener('change', render));
    function render(){
      const cu = MC[cS.get()], size = +$('ml-size').value, vr = +$('ml-vr').value, d = $('ml-diel').value, tol = +$('ml-tol').value;
      const V = vS.get(), T = tS.get(), hrs = Math.pow(10, aS.get()), req = rS.get();
      const fb = biasF(V, cu, size, vr, d), ft = tempF(T, d), fa = Math.max(0.5, 1 - DIEL[d].age * Math.max(lg(hrs), 0));
      const steps = [cu, cu * (1 - tol), cu * (1 - tol) * fb, cu * (1 - tol) * fb * ft, cu * (1 - tol) * fb * ft * fa];
      const ceff = steps[4], overV = V > vr;
      metrics($('ml-metrics'), [
        {l:t('標稱', 'Nominal'), v:cu, u:'µF', s:SIZE[size].n + ' · ' + vr + ' V · ' + d.toUpperCase()},
        {l:t('只看 DC bias', 'DC bias only'), v:(cu * fb).toPrecision(3), u:'µF', s:(100 * fb).toFixed(0) + '% @ ' + V.toFixed(1) + ' V'},
        {l:t('最差有效容值', 'Worst-case effective C'), v:ceff.toPrecision(3), u:'µF', s:(100 * ceff / cu).toFixed(0) + t('% of 標稱', '% of nominal'), cls:ceff >= req ? 'ok' : 'bad'},
        {l:t('需要並聯幾顆', 'Parts in parallel'), v:String(Math.ceil(req / ceff)), s:t('才能 ≥ ', 'to reach ≥ ') + req.toFixed(1) + ' µF', cls:Math.ceil(req / ceff) <= 1 ? 'ok' : 'warn'},
        {l:t('電壓使用率', 'Voltage utilisation'), v:(100 * V / vr).toFixed(0), u:'%', s:overV ? t('超過額定電壓！', 'above rated voltage!') : t('工作 / 額定', 'working / rated'), cls:overV ? 'bad' : V / vr > 0.8 ? 'warn' : ''}
      ]);
      const vs = Array.from({length:120}, (_, i) => vr * i / 119);
      plot($('ml-bias'), {x:[0, vr], y:[0, cu * 1.05], H:260, xlabel:t('直流偏壓 (V)', 'DC bias (V)'), ylabel:t('有效容值 (µF)', 'Effective C (µF)'),
        series:SIZE.map((sz, j) => ({pts:vs.map(v => [v, cu * biasF(v, cu, j, vr, d)]), color:j === size ? 'var(--accent)' : 'var(--muted)', w:j === size ? 2.6 : 1, dash:j === size ? null : '3 3'}))
          .concat([{pts:vs.map(v => [v, cu * (1 - tol) * biasF(v, cu, size, vr, d) * ft * fa]), color:'var(--accent)', w:1.6, dash:'6 4'}]),
        vlines:[{x:Math.min(V, vr), color:'var(--ink)', label:t('工作電壓', 'working V'), dash:'2 3'}],
        hlines:[{y:req, color:'var(--bad)'}],
        extra:(X, Y) => SIZE.map((sz, j) => '<text class="ts t-mut" x="' + (X(vr) - 4) + '" y="' + (Y(cu * biasF(vr, cu, j, vr, d)) - 4).toFixed(1) + '" text-anchor="end">' + sz.n + '</text>').join('')});
      const labels = [t('標稱', 'Nominal'), t('容差', 'Tolerance'), 'DC bias', t('溫度', 'Temperature'), t('老化', 'Ageing')];
      plot($('ml-wf'), {x:[0, 5], y:[0, cu * 1.12], H:230, ylabel:'µF', xticks:[0.5, 1.5, 2.5, 3.5, 4.5], xfmt:v => labels[Math.floor(v)] || '',
        hlines:[{y:req, color:'var(--bad)'}],
        extra:(X, Y) => steps.map((s, i) => {
          const top = Y(s), base = Y(0), prev = i ? Y(steps[i - 1]) : top;
          return (i ? '<rect x="' + X(i + 0.2).toFixed(1) + '" y="' + prev.toFixed(1) + '" width="' + (X(i + 0.8) - X(i + 0.2)).toFixed(1) + '" height="' + (top - prev).toFixed(1) + '" style="fill:var(--bad);fill-opacity:.35"/>' : '') +
            '<rect x="' + X(i + 0.2).toFixed(1) + '" y="' + top.toFixed(1) + '" width="' + (X(i + 0.8) - X(i + 0.2)).toFixed(1) + '" height="' + (base - top).toFixed(1) + '" style="fill:var(--accent);fill-opacity:' + (i === 4 ? .85 : .45) + '"/>' +
            '<text class="ts t-mono" x="' + X(i + 0.5).toFixed(1) + '" y="' + (top - 5).toFixed(1) + '" text-anchor="middle">' + s.toPrecision(3) + '</text>';
        }).join('')});
    }
    render(); redraws.push(render);
  };

  /* =====================================================================
     7. Trim: pre-trim spread, finite trim range and LSB, package shift, Cpk
     ===================================================================== */
  function rng(seed){ return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  INIT.trim = function(){
    const N = 20000, R = rng(20221008), gauss = () => Math.sqrt(-2 * Math.log(R() + 1e-12)) * Math.cos(2 * Math.PI * R());
    const Z = [0, 1, 2, 3].map(() => Float64Array.from({length:N}, gauss));
    const pct = v => (v >= 0 ? '' : '−') + Math.abs(v).toFixed(2) + '%';
    const getPc = toggle('tm-pc', render);
    const sig = range('tm-sig', v => v.toFixed(2) + '%', render);
    const mu = range('tm-mu', pct, render);
    const bits = range('tm-bits', v => v + t(' bit（', ' bit (') + Math.pow(2, v) + t(' 階）', ' steps)'), render);
    const lsb = range('tm-lsb', v => v.toFixed(2) + '%', render);
    const pk = range('tm-pk', pct, render);
    const pks = range('tm-pks', v => v.toFixed(2) + '%', render);
    const nz = range('tm-nz', v => v.toFixed(3) + '%', render);
    const spec = range('tm-spec', v => '±' + v.toFixed(2) + '%', render);
    function render(){
      const s = sig.get(), m = mu.get(), nb = bits.get(), L = lsb.get(), pm = pk.get(), ps = pks.get(), n = nz.get(), sp = spec.get();
      const target = getPc() === '1' ? -pm : 0, cmin = -Math.pow(2, nb - 1), cmax = Math.pow(2, nb - 1) - 1, cpLim = 0.7 * sp;
      const pre = new Float64Array(N), fin = [], codes = new Int32Array(N);
      let edge = 0, cpPass = 0, ftPass = 0;
      for(let i = 0; i < N; i++){
        const x0 = m + s * Z[0][i];
        pre[i] = x0;
        let code = Math.round((target - (x0 + n * Z[2][i])) / L);
        if(code <= cmin || code >= cmax) edge++;
        code = clamp(code, cmin, cmax); codes[i] = code;
        const post = x0 + code * L;
        if(Math.abs(post + n * Z[3][i] - target) > cpLim) continue;
        cpPass++;
        const f = post + pm + ps * Z[1][i];
        fin.push(f);
        if(Math.abs(f) <= sp) ftPass++;
      }
      const mean = fin.reduce((a, b) => a + b, 0) / Math.max(fin.length, 1);
      const sd = Math.sqrt(fin.reduce((a, b) => a + (b - mean) * (b - mean), 0) / Math.max(fin.length - 1, 1));
      const cpk = Math.min(sp - mean, mean + sp) / (3 * sd);
      const yCP = cpPass / N, yFT = ftPass / Math.max(cpPass, 1);
      metrics($('tm-metrics'), [
        {l:t('修調範圍', 'Trim range'), v:'±' + (Math.pow(2, nb - 1) * L).toFixed(2), u:'%', s:t('修調前 ±3σ = ', 'pre-trim ±3σ = ') + (Math.abs(m) + 3 * s).toFixed(2) + '%', cls:Math.pow(2, nb - 1) * L >= Math.abs(m) + 3 * s ? 'ok' : 'bad'},
        {l:t('碼用到邊界', 'Codes at the limit'), v:(100 * edge / N).toFixed(1), u:'%', cls:edge / N < 0.005 ? 'ok' : edge / N < 0.03 ? 'warn' : 'bad'},
        {l:t('CP 良率', 'CP yield'), v:(100 * yCP).toFixed(1), u:'%', cls:yCP > 0.98 ? 'ok' : yCP > 0.9 ? 'warn' : 'bad'},
        {l:t('FT 良率', 'FT yield'), v:(100 * yFT).toFixed(2), u:'%', s:t('CP 通過者', 'of CP passes'), cls:yFT > 0.995 ? 'ok' : yFT > 0.97 ? 'warn' : 'bad'},
        {l:t('總良率', 'Overall yield'), v:(100 * yCP * yFT).toFixed(1), u:'%'},
        {l:t('FT 最終 Cpk', 'Final FT Cpk'), v:isFinite(cpk) ? cpk.toFixed(2) : '—', s:'μ ' + pct(mean) + ' · σ ' + sd.toFixed(3) + '%', cls:cpk >= 1.67 ? 'ok' : cpk >= 1.33 ? 'warn' : 'bad'}
      ]);
      const W = Math.max(Math.abs(m) + 3.5 * s, sp * 1.5), NB = 140, bw = 2 * W / NB;
      const hist = arr => { const h = new Array(NB).fill(0); arr.forEach(v => { const b = Math.floor((v + W) / bw); if(b >= 0 && b < NB) h[b]++; }); return h; };
      const hp = hist(pre), hf = hist(fin);
      const step = (h, scale) => { const out = []; h.forEach((c, b) => { const x0 = -W + b * bw; out.push([x0, c * scale], [x0 + bw, c * scale]); }); return out; };
      const mxp = Math.max(...hp), mxf = Math.max(...hf);
      plot($('tm-hist'), {x:[-W, W], y:[0, 1.08], H:260, xlabel:t('輸出誤差 (%)', 'Output error (%)'), ylabel:t('相對數量', 'Relative count'), yticks:[0, 0.5, 1],
        series:[{pts:step(hp, 1 / mxp), color:'var(--muted)', w:1.2, fill:true, op:.25}, {pts:step(hf, 1 / Math.max(mxf, 1)), color:'var(--accent)', w:1.6, fill:true, op:.35}],
        vlines:[{x:-sp, color:'var(--bad)', label:'−spec', anchor:'end'}, {x:sp, color:'var(--bad)', label:'+spec'}, {x:-cpLim, color:'var(--warn)', dash:'2 3', dy:14, anchor:'end', label:t('CP 極限', 'CP limit')}, {x:cpLim, color:'var(--warn)', dash:'2 3', dy:14}]});
      const span = cmax - cmin + 1, hc = new Array(span).fill(0);
      codes.forEach(c => { hc[c - cmin]++; });
      const mxc = Math.max(...hc);
      plot($('tm-code'), {x:[cmin - 1, cmax + 1], y:[0, mxc * 1.1], H:200, xlabel:t('修調碼', 'Trim code'), ylabel:t('顆數', 'Count'), xn:Math.min(span, 10),
        extra:(X, Y) => hc.map((c, k) => { const code = k + cmin, edgeC = code === cmin || code === cmax;
          return '<rect x="' + X(code - 0.42).toFixed(1) + '" y="' + Y(c).toFixed(1) + '" width="' + Math.max(X(code + 0.42) - X(code - 0.42), 1).toFixed(1) + '" height="' + (Y(0) - Y(c)).toFixed(1) + '" style="fill:' + (edgeC ? 'var(--bad)' : 'var(--accent)') + ';fill-opacity:.6"/>'; }).join('')});
    }
    render(); redraws.push(render);
  };

  /* =====================================================================
     Auto sweep: animate one slider back and forth, leaving fading trails of earlier curves
     ===================================================================== */
  const SWEEP_DEFAULT = {bode:'bd-esr', psrr:'ps-bw', transient:'tr-pm', thermal:'th-i', buck:'bk-l', mlcc:'ml-v', trim:'tm-lsb'};
  const SPEED = {slow:[140, 70], mid:[70, 50], fast:[36, 35]};   // [steps per pass, ms per step]
  const TRAIL = 7;
  let sweep = null;                                               // {sec, el, pos, dir, timer, ghosts}
  const labelOf = el => { const l = document.querySelector('label[for="' + el.id + '"]'); if(!l) return el.id; const c = l.cloneNode(true); c.querySelectorAll('output').forEach(o => o.remove()); return c.textContent.trim(); };

  function snapshot(sec){
    // remember the stroked series paths of every plot in this tab before it re-renders
    const out = {};
    sec.querySelectorAll('svg.viz').forEach(svg => {
      const g = svg.querySelector('g[clip-path]'); if(!g) return;
      out[svg.id] = [...g.children].filter(p => p.tagName === 'path' && /fill:none/.test(p.getAttribute('style') || '')).map(p => p.outerHTML).join('');
    });
    return out;
  }
  function paintGhosts(sec){
    if(!sweep.trail) return;
    sec.querySelectorAll('svg.viz').forEach(svg => {
      const g = svg.querySelector('g[clip-path]'), hist = sweep.ghosts[svg.id];
      if(!g || !hist || !hist.length) return;
      const ghost = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      ghost.setAttribute('class', 'ghost');
      ghost.innerHTML = hist.map((h, i) => '<g style="opacity:' + (0.08 + 0.32 * (i + 1) / hist.length).toFixed(2) + '">' + h + '</g>').join('');
      g.insertBefore(ghost, g.firstChild);
    });
  }
  function tick(){
    const s = sweep; if(!s) return;
    const el = s.el, min = +el.min, max = +el.max, [steps, ms] = SPEED[s.speed];
    s.pos += s.dir * (max - min) / steps;
    if(s.pos >= max){ s.pos = max; s.dir = -1; } else if(s.pos <= min){ s.pos = min; s.dir = 1; }
    const before = el.value;
    el.value = s.pos;
    if(el.value !== before){
      const snap = snapshot(s.sec);
      const t0 = performance.now();
      s.internal = true; el.dispatchEvent(new Event('input')); s.internal = false;
      Object.keys(snap).forEach(id => { const h = s.ghosts[id] = s.ghosts[id] || []; if(snap[id]) h.push(snap[id]); if(h.length > TRAIL) h.shift(); });
      paintGhosts(s.sec);
      s.timer = setTimeout(tick, Math.max(0, ms - (performance.now() - t0)));
    } else s.timer = setTimeout(tick, 0);
  }
  function stopSweep(){
    if(!sweep) return;
    clearTimeout(sweep.timer);
    const c = sweep.el.closest('.ctl'); if(c) c.classList.remove('sw-on');
    const b = sweep.sec.querySelector('.sw-play');
    if(b){ b.textContent = t('▶ 開始掃描', '▶ Start sweep'); b.setAttribute('aria-pressed', 'false'); }
    sweep = null;
  }
  function startSweep(sec){
    stopSweep();
    const el = document.getElementById(sec.querySelector('.sw-param').value);
    sweep = {sec, el, pos:+el.value, dir:1, timer:0, ghosts:{}, speed:sec.querySelector('.sw-speed').value, trail:sec.querySelector('.sw-trail').checked};
    if(sweep.pos >= +el.max) sweep.dir = -1;
    const c = el.closest('.ctl'); if(c) c.classList.add('sw-on');
    const b = sec.querySelector('.sw-play');
    b.textContent = t('❚❚ 暫停', '❚❚ Pause'); b.setAttribute('aria-pressed', 'true');
    tick();
  }
  document.querySelectorAll('section.tabp').forEach(sec => {
    const name = sec.id.slice(4), panel = sec.querySelector('.bench > .panel');
    const ranges = [...panel.querySelectorAll('input[type=range]')];
    if(!panel || !ranges.length) return;
    const box = document.createElement('div');
    box.className = 'sweep';
    box.innerHTML = '<div class="sw-head">' + t('自動掃描', 'Auto sweep') + '<small>' + t('讓參數自己來回跑，留下殘影比較', 'let a parameter run back and forth, with trails to compare') + '</small></div>' +
      '<div class="ctl"><label>' + t('掃描參數', 'Parameter') + '</label><select class="sw-param">' +
      ranges.map(r => '<option value="' + r.id + '"' + (r.id === SWEEP_DEFAULT[name] ? ' selected' : '') + '>' + labelOf(r) + '</option>').join('') + '</select></div>' +
      '<div class="sw-row"><button class="btn pri sw-play" type="button" aria-pressed="false">' + t('▶ 開始掃描', '▶ Start sweep') + '</button>' +
      '<select class="sw-speed" aria-label="' + t('速度', 'Speed') + '"><option value="slow">' + t('慢', 'Slow') + '</option><option value="mid" selected>' + t('中', 'Medium') + '</option><option value="fast">' + t('快', 'Fast') + '</option></select>' +
      '<label class="sw-tr"><input type="checkbox" class="sw-trail" checked> ' + t('殘影', 'Trails') + '</label></div>';
    panel.querySelector('h3').after(box);
    box.querySelector('.sw-play').addEventListener('click', () => { sweep && sweep.sec === sec ? stopSweep() : startSweep(sec); });
    box.querySelector('.sw-param').addEventListener('change', () => { if(sweep && sweep.sec === sec) startSweep(sec); });
    box.querySelector('.sw-speed').addEventListener('change', e => { if(sweep && sweep.sec === sec) sweep.speed = e.target.value; });
    box.querySelector('.sw-trail').addEventListener('change', e => { if(sweep && sweep.sec === sec){ sweep.trail = e.target.checked; if(!sweep.trail) sweep.ghosts = {}; } });
    // touching any control by hand stops the sweep
    panel.addEventListener('input', e => { if(sweep && sweep.sec === sec && !sweep.internal && !e.target.closest('.sweep')) stopSweep(); });
    panel.addEventListener('click', e => { if(sweep && sweep.sec === sec && e.target.closest('button[data-v], button[data-preset]')) stopSweep(); });
  });
  tabs.forEach(tb => tb.addEventListener('click', stopSweep));
  document.addEventListener('visibilitychange', () => { if(document.hidden) stopSweep(); });

  show(location.hash.slice(1) || 'bode');
})();
