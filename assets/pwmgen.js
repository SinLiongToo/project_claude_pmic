/* PMIC Notes — design chapter: how a PWM signal is generated, as a running simulation.
   Time advances like an oscilloscope in roll mode: the right edge of both plots is "now" and the waveforms scroll left.
   Each new sample takes the carrier (sawtooth or triangle; analog ramp or digital counter) and the reference as they are
   at that moment, and the comparator output is HIGH while reference > carrier. Changing V_ref only affects the future,
   so the history shows how the duty follows the reference over time. */
(function(){
  const {plot} = window.MemPlot;
  const t = (window.MemSite && window.MemSite.t) || (zh => zh);
  const $ = id => document.getElementById(id);
  if(!$('pg-ref')) return;
  const PG = window.PMICPwmGen = {};    // state for the tests
  const SPP = 120;                      // samples per carrier period
  const SINE_PERIODS = 8;               // a "slowly varying" reference completes one cycle in 8 carrier periods

  const sel = id => () => $(id).querySelector('[aria-pressed="true"]').dataset.v;
  const mode = sel('pg-mode'), carrier = sel('pg-carrier'), refMode = sel('pg-refmode');
  const val = id => +$(id).value;

  // ---- the signals at absolute time x (in carrier periods), with the settings as they are now ----
  function params(){
    const digital = mode() === 'digital', steps = Math.pow(2, val('pg-bits'));
    return {digital, tri:carrier() === 'tri', steps, R:val('pg-ref') / 100, sine:refMode() === 'sine'};
  }
  // sample number n is at time n / SPP; integer arithmetic keeps every sample in exactly one period
  function sample(n, p){
    const x = n / SPP, f = (((n % SPP) + SPP) % SPP) / SPP;
    let c = p.tri ? 1 - Math.abs(2 * f - 1) : f;
    let r = p.sine ? p.R + Math.min(0.25, p.R, 1 - p.R) * Math.sin(2 * Math.PI * x / SINE_PERIODS) : p.R;
    r = Math.min(1, Math.max(0, r));
    if(p.digital){ c = Math.floor(c * p.steps) / p.steps; r = Math.round(r * p.steps) / p.steps; }   // counter and compare register hold whole steps
    return {x, c, r, o:r > c ? 1 : 0};
  }

  // ---- history: a rolling window of samples, and the duty of each finished period ----
  let now = 0, hist = [], periods = [], acc = null;
  const W = () => val('pg-cyc');
  function push(n, p){
    const s = sample(n, p);
    const k = Math.floor(n / SPP);
    if(!acc || acc.k !== k){                              // a new period starts: close the previous one
      if(acc && acc.n === SPP) periods.push({k:acc.k, d:acc.h / acc.n});   // only periods sampled in full
      acc = {k, h:0, n:0};
    }
    acc.h += s.o; acc.n++;
    hist.push(s);
  }
  function trim(){
    const lo = now - W();
    let i = 0; while(i < hist.length && hist[i].x < lo) i++;
    if(i) hist = hist.slice(i);
    periods = periods.filter(q => q.k + 1 > lo);
  }
  // refill the whole window with the current settings (at start, and when the structure changes)
  function reset(){
    const p = params(), w = W();
    if(now < w) now = w;
    hist = []; periods = []; acc = null;
    const n0 = Math.ceil((now - w) * SPP), n1 = Math.floor(now * SPP);
    for(let n = n0; n <= n1; n++) push(n, p);
    draw();
  }
  function advance(dPeriods){
    const p = params();
    const n0 = Math.floor(now * SPP) + 1;
    now += dPeriods;
    const n1 = Math.floor(now * SPP);
    for(let n = n0; n <= n1; n++) push(n, p);
    trim();
  }

  // ---- drawing ----
  function nowMark(X, Y, top){
    const px = X(now).toFixed(1);
    return '<line x1="' + px + '" x2="' + px + '" y1="' + Y(top).toFixed(1) + '" y2="' + Y(-0.05).toFixed(1) + '" style="stroke:var(--bad);stroke-width:1.5"/>' +
      '<text class="ts" x="' + (X(now) - 4).toFixed(1) + '" y="' + (Y(top) + 12).toFixed(1) + '" text-anchor="end" style="fill:var(--bad)">' + t('現在', 'now') + '</text>';
  }
  function draw(){
    const p = params(), w = W(), lo = now - w;
    const ticks = []; for(let k = Math.ceil(lo); k <= Math.floor(now); k++) ticks.push(k);
    const xl = t('時間（載波週期）　右邊是現在', 'Time (carrier periods); the right edge is now');
    plot($('pg-wave'), {
      x:[lo, now], y:[-0.05, 1.15], H:230, xlabel:xl, ylabel:'V / V_ramp', yticks:[0, 0.5, 1], xticks:ticks, xfmt:v => String(Math.round(v)),
      series:[
        {pts:hist.map(h => [h.x, h.c]), color:'var(--warn)'},
        {pts:hist.map(h => [h.x, h.r]), color:'var(--s3)', dash:'6 4', w:2.2}
      ],
      extra:(X, Y) => {
        let d = '', run = [];
        const flush = () => { if(run.length > 1) d += 'M' + run.map(h => X(h.x).toFixed(1) + ' ' + Y(h.r).toFixed(1)).join('L') + 'L' + run.slice().reverse().map(h => X(h.x).toFixed(1) + ' ' + Y(h.c).toFixed(1)).join('L') + 'Z'; run = []; };
        hist.forEach(h => { if(h.o) run.push(h); else flush(); }); flush();
        return '<path d="' + d + '" style="fill:var(--accent);opacity:.18;stroke:none"/>' + nowMark(X, Y, 1.15);
      }
    });
    plot($('pg-out'), {
      x:[lo, now], y:[-0.15, 1.45], H:190, xlabel:xl, ylabel:'V_out', yticks:[0, 1], yfmt:v => v ? 'HIGH' : 'LOW', xticks:ticks, xfmt:v => String(Math.round(v)), m:{l:60},
      series:[{pts:hist.map(h => [h.x, h.o]), color:'var(--s1)', w:2.2}],
      extra:(X, Y) => (w <= 8 ? periods.filter(q => q.k >= lo).map(q => '<text class="ts" x="' + X(q.k + 0.5).toFixed(1) + '" y="' + Y(1.28).toFixed(1) + '" text-anchor="middle" style="fill:var(--s1)">' + Math.round(q.d * 100) + '%</text>').join('') : '') + nowMark(X, Y, 1.45)
    });
    const cur = hist[hist.length - 1] || sample(Math.floor(now * SPP), p), last = periods[periods.length - 1];
    const step = 100 / p.steps;
    $('pg-m').innerHTML = [
      [t('上一個週期的 duty', 'Duty of the last period'), (last ? (last.d * 100).toFixed(1) : '—') + '<small> %</small>', p.tri ? t('三角波：兩個邊緣都會動', 'triangle: both edges move') : t('鋸齒波：D = V_ref / V_ramp', 'sawtooth: D = V_ref / V_ramp')],
      p.digital ? [t('duty 解析度', 'Duty resolution'), step.toFixed(step < 1 ? 2 : 1) + '<small> %</small>', t('一階 = 1 / 2^N；f_PWM = f_clk / 2^N', 'one step = 1 / 2^N; f_PWM = f_clk / 2^N')]
                : [t('載波', 'Carrier'), p.tri ? t('三角波', 'Triangle') : t('鋸齒波', 'Sawtooth'), p.tri ? t('中心對齊 PWM', 'center-aligned PWM') : t('後緣調變', 'trailing-edge modulation')],
      [t('比較器輸出（現在）', 'Comparator output (now)'), '<span style="color:' + (cur.o ? 'var(--s1)' : 'var(--muted)') + '">' + (cur.o ? 'HIGH' : 'LOW') + '</span>', t('右邊緣那一刻', 'at the right edge')]
    ].map(([l, v, s]) => '<div class="metric"><div class="ml">' + l + '</div><div class="mv">' + v + '</div><div class="ms">' + s + '</div></div>').join('');
    // comparator schematic: inputs and output right now
    const nm = p.tri ? 'V_tri' : 'V_saw';
    $('pg-icon').setAttribute('d', p.tri ? 'M130 158l10-10l10 10l10-10l10 10l10-10l10 10' : 'M130 158l14-10v10l14-10v10l14-10v10l14-10v10');
    $('pg-vref').textContent = 'V_ref = ' + Math.round(cur.r * 100) + '%';
    $('pg-vsaw').textContent = nm + ' = ' + Math.round(cur.c * 100) + '%';
    $('pg-vout').textContent = cur.o ? 'HIGH' : 'LOW';
    $('pg-vout').style.fill = cur.o ? 'var(--s1)' : 'var(--muted)';
    $('pg-node').style.fill = cur.o ? 'var(--s1)' : 'var(--surface)';
    $('pg-rule').textContent = cur.o ? 'V_ref > ' + nm + '  →  HIGH' : 'V_ref < ' + nm + '  →  LOW';
    Object.assign(PG, {now, cur, periods:periods.slice(), avg:hist.reduce((a, h) => a + h.o, 0) / Math.max(1, hist.length), mode:p.digital ? 'digital' : 'analog'});
  }

  // ---- playback: about 25 frames a second, paused while the figure is off screen ----
  let playing = true, visible = true, last = 0, raf = 0;
  function loop(ts){
    raf = 0;
    if(!playing || !visible) return;
    if(last){
      const dt = Math.min(0.1, (ts - last) / 1000);
      if(dt >= 0.04){ advance(dt * +$('pg-speed').value); draw(); last = ts; }
    } else last = ts;
    raf = requestAnimationFrame(loop);
  }
  const kick = () => { if(!raf && playing && visible){ last = 0; raf = requestAnimationFrame(loop); } };
  function setPlay(on){
    playing = on;
    $('pg-play').setAttribute('aria-pressed', on ? 'true' : 'false');
    $('pg-play').textContent = on ? t('❚❚ 暫停', '❚❚ Pause') : t('▶ 播放', '▶ Play');
    kick();
  }
  const resume = () => { if(!playing) setPlay(true); };

  // ---- controls ----
  const label = (id, fmt) => { const el = $(id), out = $(id + '-o'); const upd = () => { if(out) out.textContent = fmt(+el.value); }; upd(); return upd; };
  const updRef = label('pg-ref', v => v + '%');
  const updBits = label('pg-bits', v => v + ' bit' + t('（', ' (') + Math.pow(2, v) + t(' 階）', ' steps)'));
  const updCyc = label('pg-cyc', v => v + t(' 個週期', ' periods'));
  // V_ref and the reference shape change only the future: the history keeps the old reference
  $('pg-ref').addEventListener('input', () => { updRef(); resume(); });
  $('pg-bits').addEventListener('input', () => { updBits(); reset(); });
  $('pg-cyc').addEventListener('input', () => { updCyc(); reset(); });
  ['pg-mode', 'pg-carrier', 'pg-refmode'].forEach(id => $(id).addEventListener('click', e => {
    const b = e.target.closest('button[data-v]'); if(!b) return;
    $(id).querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
    if(id === 'pg-refmode') resume(); else reset();
  }));
  $('pg-play').addEventListener('click', () => setPlay(!playing));
  $('pg-speed').addEventListener('change', kick);

  // ---- V_ref sweep: the slider moves on its own, so the reference (and the duty) changes over time ----
  let sw = null, dir = 1, internal = false;
  function stopSweep(){
    if(!sw) return;
    clearTimeout(sw); sw = null;
    $('pg-sweep').setAttribute('aria-pressed', 'false');
    $('pg-sweep').textContent = t('↕ 掃描 V_ref', '↕ Sweep V_ref');
    $('pg-ref').closest('.ctl').classList.remove('sw-on');
  }
  function tick(){
    const el = $('pg-ref'); let v = +el.value + dir * 2;
    if(v >= 95){ v = 95; dir = -1; } else if(v <= 5){ v = 5; dir = 1; }
    internal = true; el.value = v; el.dispatchEvent(new Event('input', {bubbles:true})); internal = false;
    sw = setTimeout(tick, 150);
  }
  $('pg-sweep').addEventListener('click', () => {
    if(sw) return stopSweep();
    $('pg-sweep').setAttribute('aria-pressed', 'true');
    $('pg-sweep').textContent = t('■ 停止', '■ Stop');
    $('pg-ref').closest('.ctl').classList.add('sw-on');
    resume();
    tick();
  });
  const panel = $('pg-ref').closest('.panel');
  panel.addEventListener('input', () => { if(sw && !internal) stopSweep(); });
  panel.addEventListener('click', e => { if(sw && e.target.closest('button[data-v]')) stopSweep(); });
  if('IntersectionObserver' in window)
    new IntersectionObserver(es => es.forEach(e => { visible = e.isIntersecting; if(!visible) stopSweep(); kick(); })).observe($('pg-wave').closest('.bench'));

  PG.reset = reset;                          // the tests refill the window with the current settings
  PG.advance = d => { advance(d); draw(); }; // and step time forward without waiting for frames
  reset();
  kick();
})();
