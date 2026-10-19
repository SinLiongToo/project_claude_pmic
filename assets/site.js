/* PMIC Notes — shared chrome: top bar, theme, table of contents, pager, site-wide find (Ctrl+K). */
(function(){
  const EN = (document.documentElement.lang || '').toLowerCase().startsWith('en');
  const t = (zh, en) => EN ? en : zh;
  const PAGES = [
    {id:'index',   href:'index.html',        label:t('首頁', 'Home')},
    {id:'arch',    href:'architecture.html', label:t('架構', 'Architecture'), ch:'arc', en:'Architecture'},
    {id:'fab',     href:'process.html',      label:t('製程', 'Process'), ch:'fab', en:'Process'},
    {id:'design',  href:'design.html',       label:t('設計', 'Design'), ch:'des', en:'Circuit design'},
    {id:'mfg',     href:'production.html',   label:t('生產', 'Production'), ch:'mfg', en:'Production'},
    {id:'test',    href:'test.html',         label:t('測試', 'Test'), ch:'tst', en:'Test & qualification'},
    {id:'app',     href:'application.html',  label:t('應用', 'Applications'), ch:'use', en:'Applications'},
    {id:'sic',     href:'sic.html',          label:t('SiC 與資料中心', 'SiC & data centers')},
    {sep:true},
    {id:'issues',     href:'issues.html',     label:t('常見問題', 'Troubleshooting')},
    {id:'complaints', href:'complaints.html', label:t('客訴處理', 'Complaints')},
    {sep:true},
    {id:'lab',   href:'lab.html',   label:t('互動實驗室', 'Lab')},
    {id:'roles', href:'roles.html', label:t('職務地圖', 'Careers')},
    {id:'quiz',  href:'quiz.html',  label:t('測驗', 'Quiz')}
  ];
  const CHAPTERS = PAGES.filter(p => p.ch);
  const page = document.body.dataset.page || 'index';

  const ICON = {
    bolt:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M13 6.5 8.5 13H12l-1 4.5L15.5 11H12z" fill="currentColor" opacity=".35"/><path d="M8 1.5v2.5M12 1.5v2.5M16 1.5v2.5M8 20v2.5M12 20v2.5M16 20v2.5"/></svg>',
    find:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
    sun:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    moon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>'
  };

  /* ---------- theme ---------- */
  const root = document.documentElement;
  function store(k, v){ try{ if(v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); }catch(e){ return null; } }
  const saved = store('pmic-theme');
  if(saved === 'light' || saved === 'dark') root.dataset.theme = saved;
  function isDark(){
    if(root.dataset.theme) return root.dataset.theme === 'dark';
    return window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches;
  }

  /* ---------- header ---------- */
  const hdr = document.createElement('header');
  hdr.className = 'top';
  hdr.innerHTML = '<div class="top-in">' +
    '<a class="brand" href="index.html" aria-label="' + t('PMIC Notes 首頁', 'PMIC Notes home') + '">' + ICON.bolt + '<span>PMIC Notes</span></a>' +
    '<nav class="nav" aria-label="' + t('章節', 'Chapters') + '">' + PAGES.filter(p => p.id !== 'index').map(p => p.sep ? '<span class="sep"></span>' :
      '<a href="' + p.href + '"' + (p.id === page ? ' aria-current="page"' : '') + '>' + p.label + '</a>').join('') + '</nav>' +
    '<button class="tbtn" id="findBtn" type="button" title="' + t('搜尋', 'Search') + ' (Ctrl+K)">' + ICON.find + '<span class="lbl">' + t('搜尋', 'Search') + '</span></button>' +
    '<a class="tbtn" id="langBtn" href="#" title="' + t('Switch to English', '切換為中文') + '" lang="' + t('en', 'zh-Hant') + '">' + t('EN', '中') + '</a>' +
    '<button class="tbtn" id="themeBtn" type="button" title="' + t('切換深淺色', 'Toggle theme') + '"></button>' +
    '</div>';
  document.body.prepend(hdr);
  /* language switch: zh pages live at the root, English pages in /en/ with the same file names and anchors */
  const langBtn = hdr.querySelector('#langBtn');
  function langHref(){
    const file = location.pathname.split('/').pop() || 'index.html';
    return (EN ? '../' : 'en/') + file + location.search + location.hash;
  }
  langBtn.href = langHref();
  window.addEventListener('hashchange', () => { langBtn.href = langHref(); });
  langBtn.addEventListener('click', () => { store('pmic-lang', EN ? 'zh' : 'en'); langBtn.href = langHref(); });
  const themeBtn = hdr.querySelector('#themeBtn');
  function paintThemeBtn(){ themeBtn.innerHTML = isDark() ? ICON.sun : ICON.moon; themeBtn.setAttribute('aria-label', isDark() ? t('切換為淺色', 'Switch to light') : t('切換為深色', 'Switch to dark')); }
  paintThemeBtn();
  themeBtn.addEventListener('click', () => {
    const next = isDark() ? 'light' : 'dark';
    root.dataset.theme = next; store('pmic-theme', next); paintThemeBtn();
    document.dispatchEvent(new CustomEvent('themechange'));
  });
  if(window.matchMedia) matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { paintThemeBtn(); document.dispatchEvent(new CustomEvent('themechange')); });
  const navCur = hdr.querySelector('.nav a[aria-current]');
  if(navCur) navCur.scrollIntoView({block:'nearest', inline:'center'});

  /* ---------- TOC + scrollspy ---------- */
  const toc = document.querySelector('.toc');
  const heads = [...document.querySelectorAll('article h2[id]')];
  if(toc && heads.length){
    toc.innerHTML = '<b>' + t('本章目錄', 'On this page') + '</b>' + heads.map(h => '<a href="#' + h.id + '">' + h.textContent + '</a>').join('');
    const links = new Map([...toc.querySelectorAll('a')].map(a => [a.getAttribute('href').slice(1), a]));
    const io = new IntersectionObserver(es => {
      es.forEach(e => { if(e.isIntersecting){ links.forEach(a => a.classList.remove('on')); const a = links.get(e.target.id); if(a) a.classList.add('on'); } });
    }, {rootMargin:'-20% 0px -70% 0px'});
    heads.forEach(h => io.observe(h));
  }
  heads.forEach((h, i) => { if(!h.querySelector('.num')) h.insertAdjacentHTML('afterbegin', '<span class="num">' + String(i + 1).padStart(2, '0') + '</span>'); });

  /* ---------- pager ---------- */
  const pager = document.querySelector('.pager');
  const ci = CHAPTERS.findIndex(c => c.id === page);
  if(pager && ci >= 0){
    const prev = CHAPTERS[ci - 1], next = CHAPTERS[ci + 1];
    const name = c => EN ? c.en : c.label + ' · ' + c.en;
    pager.innerHTML = (prev ? '<a href="' + prev.href + '"><small>' + t('← 上一章', '← Previous') + '</small>' + name(prev) + '</a>' : '<span></span>') +
      (next ? '<a class="next" href="' + next.href + '"><small>' + t('下一章 →', 'Next →') + '</small>' + name(next) + '</a>'
            : '<a class="next" href="issues.html"><small>' + t('接著看 →', 'Up next →') + '</small>' + t('常見問題與排查', 'Troubleshooting') + '</a>');
  }

  /* ---------- find ---------- */
  const PAGE_LABEL = EN ? {arch:'Arch', fab:'Process', design:'Design', mfg:'Prod', test:'Test', app:'Apps', issues:'Issues', complaints:'Complaints', lab:'Lab', roles:'Careers', quiz:'Quiz', index:'Home', sic:'SiC'}
    : {arch:'架構', fab:'製程', design:'設計', mfg:'生產', test:'測試', app:'應用', issues:'問題', complaints:'客訴', lab:'實驗室', roles:'職務', quiz:'測驗', index:'首頁', sic:'SiC'};
  const PAGE_TAG = {arch:'arc', fab:'fab', design:'des', mfg:'mfg', test:'tst', app:'use', issues:'rel', complaints:'rel', lab:'lab', roles:'dsg', quiz:'dsg', index:'lab', sic:'fab'};
  const ov = document.createElement('div');
  ov.className = 'find-ov'; ov.hidden = true;
  ov.innerHTML = '<div class="find-box" role="dialog" aria-modal="true" aria-label="' + t('全站搜尋', 'Search the site') + '">' +
    '<input id="findQ" type="search" placeholder="' + t('搜尋：dropout、PSRR、ESR、trim、8D、MLCC…', 'Search: dropout, PSRR, ESR, trim, 8D, MLCC…') + '" autocomplete="off">' +
    '<div class="find-meta" id="findMeta"></div><div class="find-res" id="findRes" role="listbox"></div></div>';
  document.body.appendChild(ov);
  const q = ov.querySelector('#findQ'), res = ov.querySelector('#findRes'), meta = ov.querySelector('#findMeta');
  let sel = 0, hits = [];
  const esc = s => s.replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  function hl(s, terms){
    let out = esc(s);
    terms.forEach(w => { if(!w) return; const re = new RegExp('(' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig'); out = out.replace(re, '<mark>$1</mark>'); });
    return out;
  }
  function run(){
    const idx = window.SEARCH_INDEX || [];
    const terms = q.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if(!terms.length){ hits = idx.filter(e => e.lv === 1).slice(0, 40); }
    else {
      hits = idx.map(e => {
        const tt = e.t.toLowerCase(), s = (e.s || '').toLowerCase();
        let score = 0;
        for(const w of terms){
          if(tt.includes(w)) score += tt.startsWith(w) ? 6 : 4;
          else if(s.includes(w)) score += 1;
          else return null;
        }
        if(e.lv === 1) score += .5;
        return {e, score};
      }).filter(Boolean).sort((a, b) => b.score - a.score).slice(0, 60).map(x => x.e);
    }
    sel = 0;
    meta.textContent = terms.length ? (hits.length + t(' 筆結果', ' results')) : t('所有章節 — 輸入關鍵字（中英文皆可）', 'All sections — type a keyword');
    res.innerHTML = hits.map((e, i) => {
      const snip = e.s ? e.s.slice(0, 110) : '';
      return '<a role="option" href="' + e.p + (e.a ? '#' + e.a : '') + '"' + (i === 0 ? ' class="sel"' : '') + '>' +
        '<span class="tag ' + (PAGE_TAG[e.g] || 'lab') + '">' + (PAGE_LABEL[e.g] || '') + '</span>' + hl(e.t, terms) +
        (snip ? '<small>' + hl(snip, terms) + '</small>' : '') + '</a>';
    }).join('') || '<div class="find-meta">' + t('找不到符合的內容', 'No matches') + '</div>';
  }
  function openFind(){ ov.hidden = false; q.value = ''; run(); q.focus(); }
  function closeFind(){ ov.hidden = true; }
  function mark(){ [...res.children].forEach((a, i) => a.classList.toggle('sel', i === sel)); const a = res.children[sel]; if(a) a.scrollIntoView({block:'nearest'}); }
  q.addEventListener('input', run);
  q.addEventListener('keydown', e => {
    if(e.key === 'ArrowDown'){ e.preventDefault(); sel = Math.min(sel + 1, hits.length - 1); mark(); }
    else if(e.key === 'ArrowUp'){ e.preventDefault(); sel = Math.max(sel - 1, 0); mark(); }
    else if(e.key === 'Enter'){ const a = res.children[sel]; if(a && a.href){ closeFind(); location.href = a.href; } }
  });
  res.addEventListener('click', e => { if(e.target.closest('a')) closeFind(); });
  ov.addEventListener('click', e => { if(e.target === ov) closeFind(); });
  document.addEventListener('keydown', e => {
    if((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k'){ e.preventDefault(); ov.hidden ? openFind() : closeFind(); }
    else if(e.key === '/' && ov.hidden && !/input|textarea|select/i.test(document.activeElement.tagName)){ e.preventDefault(); openFind(); }
    else if(e.key === 'Escape' && !ov.hidden) closeFind();
  });
  hdr.querySelector('#findBtn').addEventListener('click', openFind);
  document.querySelectorAll('[data-open-find]').forEach(b => b.addEventListener('click', openFind));
  window.MemSite = {openFind, isDark, EN, t};
})();
