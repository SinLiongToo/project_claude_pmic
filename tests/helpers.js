// Shared helpers for the PMIC Notes test suite.
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PAGES = fs.readdirSync(ROOT).filter(f => f.endsWith('.html')).sort();
const LANGS = ['', 'en/'];
const LAB_TABS = ['bode', 'psrr', 'transient', 'thermal', 'buck', 'mlcc', 'trim'];
const CHAPTERS = ['architecture', 'process', 'design', 'production', 'test', 'application', 'issues', 'complaints', 'sic', 'roles'];
const BAD = /NaN|Infinity|undefined/;

/** Collect JS errors, console errors and failed requests (Google Fonts are ignored: they need the internet). */
function watchErrors(page){
  const errors = [];
  const ignore = u => /fonts\.(googleapis|gstatic)\.com/.test(u);
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if(m.type() === 'error' && !ignore(m.text()) && !/Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });
  page.on('requestfailed', r => { if(!ignore(r.url())) errors.push('request failed: ' + r.url()); });
  page.on('response', r => { if(r.status() >= 400 && !ignore(r.url())) errors.push('HTTP ' + r.status() + ': ' + r.url()); });
  return errors;
}

/** Scan the visible lab tab for NaN / Infinity / undefined in metrics, plot text, path data and coordinates. */
async function scanTab(page){
  return page.evaluate(() => {
    const sec = document.querySelector('section.tabp:not([hidden])');
    const txt = [...sec.querySelectorAll('.metric, svg text, output, .schem-note')].map(e => e.textContent).join(' ');
    const d = [...sec.querySelectorAll('svg path')].map(p => p.getAttribute('d') || '').join(' ');
    const attrs = [...sec.querySelectorAll('svg *')].flatMap(e => ['x', 'y', 'x1', 'x2', 'y1', 'y2', 'width', 'height', 'cx', 'cy'].map(a => e.getAttribute(a) || '')).join(' ');
    const all = txt + ' ' + d + ' ' + attrs;
    const m = all.match(/.{0,40}(NaN|Infinity|undefined).{0,20}/);
    return m ? m[0] : '';
  });
}

/** Set a range input and fire the input event like a user would. */
async function setRange(page, id, value){
  await page.locator('#' + id).evaluate((e, v) => { e.value = v; e.dispatchEvent(new Event('input', {bubbles:true})); }, value);
}

module.exports = {ROOT, PAGES, LANGS, LAB_TABS, CHAPTERS, BAD, watchErrors, scanTab, setRange};
