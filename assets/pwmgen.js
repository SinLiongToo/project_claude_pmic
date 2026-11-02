/* PMIC Notes — design chapter: how a PWM signal is generated. A carrier (sawtooth or triangle; analog ramp or a digital
   counter) and a reference go into a comparator; the output is HIGH while reference > carrier. A time cursor plays through
   the waveforms and the comparator schematic shows its inputs and output at that instant. */
(function(){
  const {plot} = window.MemPlot;
  const t = (window.MemSite && window.MemSite.t) || (zh => zh);
  const $ = id => document.getElementById(id);
  if(!$('pg-ref')) return;
  const PG = window.PMICPwmGen = {};    // last result, read by the tests
  const N = 1600;                       // samples across the window

  function toggle(id){
    const box = $(id);
    box.addEventListener('click', e => {
      const b = e.target.closest('button[data-v]'); if(!b) return;
      box.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
      draw();
    });
    return () => box.querySelector('[aria-pressed="true"]').dataset.v;
  }
  function range(id, fmt){
    const el = $(id), out = $(id + '-o');
    const upd = () => { if(out) out.textContent = fmt(+el.value); };
    el.addEventListener('input', () => { upd(); draw(); });
    upd();
    return () => +el.value;
  }
  const mode = toggle('pg-mode'), carrier = toggle('pg-carrier'), refMode = toggle('pg-refmode');
  const refS = range('pg-ref', v => v + '%');
  const bitsS = range('pg-bits', v => v + ' bit' + t('（', ' (') + Math.pow(2, v) + t(' 階）', ' steps)'));
  const cycS = range('pg-cyc', v => v + t(' 個週期', ' periods'));

  // the model: everything normalized to the carrier's peak (0…1) and to one carrier period (time 0…cycles)
  function model(){
    const digital = mode() === 'digital', tri = carrier() === 'tri', cyc = cycS(), bits = bitsS(), steps = Math.pow(2, bits);
    const R = refS() / 100, sine = refMode() === 'sine', A = Math.min(0.25, R, 1 - R);
    const q = v => digital ? Math.floor(v * steps) / steps : v;            // the counter only holds whole steps
    const qr = v => digital ? Math.round(v * steps) / steps : v;            // the compare register too
    const car = x => { const f = x - Math.floor(x); return q(tri ? 1 - Math.abs(2 * f - 1) : f); };
    const ref = x => qr(Math.min(1, Math.max(0, sine ? R + A * Math.sin(2 * Math.PI * x / cyc) : R)));
    return {digital, tri, cyc, bits, steps, R, sine, car, ref, out:x => ref(x) > car(x) ? 1 : 0};
  }

  let M = null, cursor = 0;
  function draw(){
    M = model();
    const xs = Array.from({length:N + 1}, (_, i) => i / N * M.cyc);
    const per = Array.from({length:M.cyc}, () => [0, 0]);
    xs.forEach(x => { const k = Math.min(M.cyc - 1, Math.floor(x)); per[k][0] += M.out(x); per[k][1]++; });
    const duties = per.map(([h, n]) => h / n);
    const avg = xs.reduce((s, x) => s + M.out(x), 0) / xs.length;
    Object.assign(PG, {avg, duties, mode:M.digital ? 'digital' : 'analog', carrier:M.tri ? 'tri' : 'saw'});
    // carrier + reference, with the "reference above carrier" region shaded
    plot($('pg-wave'), {
      x:[0, M.cyc], y:[-0.05, 1.15], H:230, xlabel:t('時間（載波週期）', 'Time (carrier periods)'), ylabel:'V / V_ramp', yticks:[0, 0.5, 1],
      xticks:Array.from({length:M.cyc + 1}, (_, i) => i),
      series:[
        {pts:xs.map(x => [x, M.car(x)]), color:'var(--warn)'},
        {pts:xs.map(x => [x, M.ref(x)]), color:'var(--s3)', dash:'6 4', w:2.2}
      ],
      extra:(X, Y) => {
        let d = '', run = [];
        const flush = () => { if(run.length > 1) d += 'M' + run.map(x => X(x).toFixed(1) + ' ' + Y(M.ref(x)).toFixed(1)).join('L') + 'L' + run.slice().reverse().map(x => X(x).toFixed(1) + ' ' + Y(M.car(x)).toFixed(1)).join('L') + 'Z'; run = []; };
        xs.forEach(x => { if(M.out(x)) run.push(x); else flush(); }); flush();
        return '<path d="' + d + '" style="fill:var(--accent);opacity:.18;stroke:none"/>';
      }
    });
    // PWM output, with each period's duty written above it
    plot($('pg-out'), {
      x:[0, M.cyc], y:[-0.15, 1.45], H:190, xlabel:t('時間（載波週期）', 'Time (carrier periods)'), ylabel:'V_out', yticks:[0, 1], yfmt:v => v ? 'HIGH' : 'LOW',
      xticks:Array.from({length:M.cyc + 1}, (_, i) => i), m:{l:60},
      series:[{pts:xs.map(x => [x, M.out(x)]), color:'var(--s1)', w:2.2}],
      extra:(X, Y) => M.cyc <= 8 ? duties.map((d, k) => '<text class="ts" x="' + X(k + 0.5).toFixed(1) + '" y="' + Y(1.28).toFixed(1) + '" text-anchor="middle" style="fill:var(--s1)">' + Math.round(d * 100) + '%</text>').join('') : ''
    });
    $('pg-icon').setAttribute('d', M.tri ? 'M130 158l10-10l10 10l10-10l10 10l10-10l10 10' : 'M130 158l14-10v10l14-10v10l14-10v10l14-10v10');
    ['pg-wave', 'pg-out'].forEach(id => { const ln = document.createElementNS('http://www.w3.org/2000/svg', 'line'); ln.setAttribute('class', 'cursor'); $(id).appendChild(ln); });
    const step = 100 / M.steps;
    $('pg-m').innerHTML = [
      [t('平均 duty', 'Average duty'), (avg * 100).toFixed(1) + '<small> %</small>', M.sine ? t('參考在變，每個週期不同', 'reference varies, so each period differs') : (M.tri ? t('三角波：兩個邊緣都會動', 'triangle: both edges move') : t('鋸齒波：D = V_ref / V_ramp', 'sawtooth: D = V_ref / V_ramp'))],
      M.digital ? [t('duty 解析度', 'Duty resolution'), step.toFixed(step < 1 ? 2 : 1) + '<small> %</small>', t('一階 = 1 / 2^N；f_PWM = f_clk / 2^N', 'one step = 1 / 2^N; f_PWM = f_clk / 2^N')]
                : [t('載波', 'Carrier'), M.tri ? t('三角波', 'Triangle') : t('鋸齒波', 'Sawtooth'), M.tri ? t('中心對齊 PWM', 'center-aligned PWM') : t('後緣調變', 'trailing-edge modulation')],
      [t('比較器輸出', 'Comparator output'), '<span id="pg-now">—</span>', t('游標所在的瞬間', 'at the cursor')]
    ].map(([l, v, s]) => '<div class="metric"><div class="ml">' + l + '</div><div class="mv">' + v + '</div><div class="ms">' + s + '</div></div>').join('');
    paint();
  }

  // move the cursor and update the comparator schematic for that instant
  function paint(){
    if(!M) return;
    const x = Math.min(M.cyc - 1e-6, cursor), r = M.ref(x), c = M.car(x), o = M.out(x);
    ['pg-wave', 'pg-out'].forEach(id => {
      const svg = $(id), P = svg.__plot, ln = svg.querySelector('line.cursor'); if(!P || !ln) return;
      const px = P.X(x).toFixed(1);
      ln.setAttribute('x1', px); ln.setAttribute('x2', px); ln.setAttribute('y1', P.m.t); ln.setAttribute('y2', P.m.t + P.ph);
    });
    $('pg-vref').textContent = 'V_ref = ' + (r * 100).toFixed(0) + '%';
    $('pg-vsaw').textContent = (M.tri ? 'V_tri' : 'V_saw') + ' = ' + (c * 100).toFixed(0) + '%';
    $('pg-vout').textContent = o ? 'HIGH' : 'LOW';
    $('pg-node').style.fill = o ? 'var(--s1)' : 'var(--surface)';
    $('pg-vout').style.fill = o ? 'var(--s1)' : 'var(--muted)';
    $('pg-rule').textContent = o ? 'V_ref > ' + (M.tri ? 'V_tri' : 'V_saw') + '  →  HIGH' : 'V_ref < ' + (M.tri ? 'V_tri' : 'V_saw') + '  →  LOW';
    const now = $('pg-now'); if(now){ now.textContent = o ? 'HIGH' : 'LOW'; now.style.color = o ? 'var(--s1)' : 'var(--muted)'; }
    PG.cursor = {x, r, c, o};
  }

  // playback: one carrier period per second, paused while the figure is off screen
  let playing = true, visible = true, last = 0, raf = 0;
  function loop(ts){
    raf = 0;
    if(!playing || !visible || !M) return;
    if(last && ts - last >= 33){ cursor = (cursor + (ts - last) / 1000 * ($('pg-speed').value / 1)) % M.cyc; paint(); last = ts; }
    else if(!last) last = ts;
    raf = requestAnimationFrame(loop);
  }
  const kick = () => { if(!raf && playing && visible){ last = 0; raf = requestAnimationFrame(loop); } };
  $('pg-play').addEventListener('click', () => {
    playing = !playing;
    $('pg-play').setAttribute('aria-pressed', playing ? 'true' : 'false');
    $('pg-play').textContent = playing ? t('❚❚ 暫停', '❚❚ Pause') : t('▶ 播放', '▶ Play');
    kick();
  });
  $('pg-speed').addEventListener('change', kick);
  if('IntersectionObserver' in window)
    new IntersectionObserver(es => es.forEach(e => { visible = e.isIntersecting; if(!visible) stopSweep(); kick(); })).observe($('pg-wave').closest('.bench'));

  // auto sweep of the reference level; touching any control stops it
  let sw = null, internal = false;
  function stopSweep(){
    if(!sw) return;
    clearTimeout(sw); sw = null;
    $('pg-sweep').setAttribute('aria-pressed', 'false');
    $('pg-sweep').textContent = t('↕ 掃描 V_ref', '↕ Sweep V_ref');
    $('pg-ref').closest('.ctl').classList.remove('sw-on');
  }
  let dir = 1;
  function tick(){
    const el = $('pg-ref'); let v = +el.value + dir * 2;
    if(v >= 98){ v = 98; dir = -1; } else if(v <= 2){ v = 2; dir = 1; }
    internal = true; el.value = v; el.dispatchEvent(new Event('input', {bubbles:true})); internal = false;
    sw = setTimeout(tick, 120);
  }
  $('pg-sweep').addEventListener('click', () => {
    if(sw) return stopSweep();
    $('pg-sweep').setAttribute('aria-pressed', 'true');
    $('pg-sweep').textContent = t('■ 停止', '■ Stop');
    $('pg-ref').closest('.ctl').classList.add('sw-on');
    tick();
  });
  const panel = $('pg-ref').closest('.panel');
  panel.addEventListener('input', e => { if(sw && !internal) stopSweep(); });
  panel.addEventListener('click', e => { if(sw && e.target.closest('button[data-v]')) stopSweep(); });

  draw();
  kick();
})();
