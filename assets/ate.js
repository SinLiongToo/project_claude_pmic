/* PMIC Notes — test chapter: volume-ATE throughput (UPH) and cost-of-test calculator.
   Multisite model: T_N = T_1 × (1 + (N − 1)(1 − PTE)); one touchdown = T_N + handler index time. */
(function(){
  const {plot, fmtSI} = window.MemPlot;
  const t = (window.MemSite && window.MemSite.t) || (zh => zh);
  const $ = id => document.getElementById(id);
  if(!$('at-t1')) return;
  const ATE = window.PMICAte = {};    // last result, read by the tests
  const SITES = [1, 2, 4, 8, 16, 32];
  const HOURS = 720;                  // hours in a 30-day month; OEE covers downtime

  function metrics(el, arr){
    el.innerHTML = arr.map(m => '<div class="metric ' + (m.cls || '') + '"><div class="ml">' + m.l + '</div><div class="mv">' + m.v +
      (m.u ? ' <small>' + m.u + '</small>' : '') + '</div>' + (m.s ? '<div class="ms">' + m.s + '</div>' : '') + '</div>').join('');
  }
  function range(id, fmt){
    const el = $(id), out = $(id + '-o');
    const upd = () => { if(out) out.textContent = fmt(+el.value); };
    el.addEventListener('input', () => { upd(); draw(); });
    upd();
    return () => +el.value;
  }
  function toggle(id){
    const box = $(id);
    box.addEventListener('click', e => {
      const b = e.target.closest('button[data-v]'); if(!b) return;
      box.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
      draw();
    });
    return () => +box.querySelector('[aria-pressed="true"]').dataset.v;
  }
  const fmtNum = v => Math.round(v).toLocaleString('en-US');
  const cents = usd => (usd * 100).toFixed(usd * 100 < 1 ? 3 : 2);

  const t1S = range('at-t1', v => v.toFixed(2) + ' s');
  const nS = range('at-n', v => SITES[v] + t(' 站', ' sites'));
  const pteS = range('at-pte', v => v + '%');
  const idxS = range('at-idx', v => v.toFixed(2) + ' s');
  const oeeS = range('at-oee', v => v + '%');
  const rtS = range('at-rt', v => v + '%');
  const rateS = range('at-rate', v => 'US$ ' + v + t(' / 小時', ' / h'));
  const yS = range('at-y', v => v.toFixed(1) + '%');
  const volS = range('at-vol', v => v + t(' 百萬顆 / 月', ' M units / month'));
  const insS = toggle('at-ins');

  function model(p, N){
    const tn = p.t1 * (1 + (N - 1) * (1 - p.pte));
    const cycle = tn + p.idx;
    const uphRaw = 3600 * N / cycle;
    const uph = uphRaw * p.oee / (1 + p.rt);
    const cost = p.rate / uph * p.ins;              // US$ per unit, all insertions
    return {tn, cycle, uphRaw, uph, cost, good:cost / p.y, idxShare:p.idx / cycle};
  }
  function draw(){
    const p = {t1:t1S(), pte:pteS() / 100, idx:idxS(), oee:oeeS() / 100, rt:rtS() / 100, rate:rateS(), y:yS() / 100, ins:insS()};
    const N = SITES[nS()], vol = volS() * 1e6;
    const r = model(p, N);
    const hours = vol * p.ins / r.uph, cells = Math.max(1, Math.ceil(hours / HOURS - 1e-9));
    Object.assign(ATE, r, {N, hours, cells});
    metrics($('at-m'), [
      {l:t('每次下壓（touchdown）', 'Per touchdown'), v:r.cycle.toFixed(2), u:'s', s:t('測試 ', 'test ') + r.tn.toFixed(2) + ' s + index ' + p.idx.toFixed(2) + ' s'},
      {l:'UPH', v:fmtNum(r.uph), s:t('理論 ', 'raw ') + fmtNum(r.uphRaw) + t('，扣除 OEE 與重測', ', after OEE and retest')},
      {l:t('每顆測試成本', 'Test cost per unit'), v:cents(r.cost), u:t('美分', 'US¢'), s:p.ins + t(' 個溫度 / 插入', ' insertion(s)')},
      {l:t('每顆良品的測試成本', 'Test cost per good unit'), v:cents(r.good), u:t('美分', 'US¢'), s:t('良率 ', 'yield ') + (p.y * 100).toFixed(1) + '%'},
      {l:t('需要的測試單元', 'Test cells needed'), v:cells, s:fmtNum(hours) + t(' 機時 / 月', ' cell-hours / month'), cls:cells > 20 ? 'warn' : ''},
      {l:t('handler 等待佔比', 'Handler index share'), v:Math.round(r.idxShare * 100), u:'%', s:t('每次下壓中不在測試的時間', 'time per touchdown not testing'), cls:r.idxShare > 0.4 ? 'warn' : ''}
    ]);
    const notes = [];
    if(r.idxShare > 0.4) notes.push(t('handler 換料時間佔了四成以上：再加站數幫助有限，要換更快的 handler（例如轉塔式或條帶測試）或把測試時間拉長的部分平行化。', 'Handler index takes over 40% of each touchdown: more sites help little; use a faster handler (e.g. turret or strip test) or parallelize the long tests.'));
    const r2 = model(p, Math.min(32, N * 2));
    if(N < 32 && r2.uph / r.uph < 1.3) notes.push(t('站數加倍只多 ' + Math.round((r2.uph / r.uph - 1) * 100) + '% UPH：平行效率或 index 時間已經是瓶頸。', 'Doubling the sites adds only ' + Math.round((r2.uph / r.uph - 1) * 100) + '% UPH: parallel efficiency or index time is now the bottleneck.'));
    if(p.rt > 0.05) notes.push(t('重測率超過 5%：通常代表接觸或測試極限有問題，應先查 socket 與站間良率差異，而不是靠重測救良率。', 'Retest above 5% usually points to contact or limit problems; check sockets and site-to-site yield first instead of recovering yield by retest.'));
    if(!notes.length) notes.push(t('試試把站數往上拉：UPH 增加會越來越慢，因為平行效率不到 100%，而 handler 的 index 時間不會跟著平行化。', 'Try raising the sites: UPH grows ever more slowly, because parallel efficiency is below 100% and handler index time does not parallelize.'));
    $('at-n-note').innerHTML = notes.join('<br>');
    const xs = Array.from({length:32}, (_, i) => i + 1);
    const ideal = {...p, pte:1};
    const uphMax = Math.max(...xs.map(x => model(ideal, x).uph)) * 1.08;
    plot($('at-uph'), {
      x:[1, 32], y:[0, uphMax], xlabel:t('站數 N', 'Sites N'), ylabel:'UPH', m:{l:64},
      xticks:[1, 4, 8, 16, 32], yfmt:v => v >= 1000 ? Math.round(v / 1000) + 'k' : String(v),
      series:[
        {pts:xs.map(x => [x, model(ideal, x).uph]), color:'var(--muted)', w:1.3, dash:'4 3'},
        {pts:xs.map(x => [x, model(p, x).uph]), color:'var(--s1)'}
      ],
      extra:(X, Y) => '<circle cx="' + X(N).toFixed(1) + '" cy="' + Y(r.uph).toFixed(1) + '" r="5" style="fill:var(--ink);stroke:var(--surface);stroke-width:2"/>'
    });
    const cMax = Math.max(...xs.map(x => model(p, x).cost)) * 100 * 1.1;
    plot($('at-cost'), {
      x:[1, 32], y:[0, cMax], xlabel:t('站數 N', 'Sites N'), ylabel:t('美分 / 顆', 'US¢ / unit'), m:{l:64},
      xticks:[1, 4, 8, 16, 32],
      series:[{pts:xs.map(x => [x, model(p, x).cost * 100]), color:'var(--s2)'}],
      extra:(X, Y) => '<circle cx="' + X(N).toFixed(1) + '" cy="' + Y(r.cost * 100).toFixed(1) + '" r="5" style="fill:var(--ink);stroke:var(--surface);stroke-width:2"/>'
    });
  }
  draw();
})();
