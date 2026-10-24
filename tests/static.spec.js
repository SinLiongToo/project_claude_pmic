// @static — file-level checks that need no browser: links, anchors, zh/en parity, generated files, JS syntax.
const {test, expect} = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const {execFileSync} = require('child_process');
const {ROOT, PAGES, LAB_TABS} = require('./helpers');

const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const ids = src => new Set([...src.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]));

test.describe('@static site files', () => {
  test('every page exists in both languages with the right lang attribute', () => {
    const en = fs.readdirSync(path.join(ROOT, 'en')).filter(f => f.endsWith('.html')).sort();
    expect(en).toEqual(PAGES);
    for(const f of PAGES){
      expect(read(f), f).toContain('lang="zh-Hant"');
      expect(read('en/' + f), 'en/' + f).toContain('lang="en"');
    }
  });

  test('internal links, anchors and assets all resolve', () => {
    const problems = [];
    for(const dir of ['', 'en/']){
      const idmap = Object.fromEntries(PAGES.map(f => [f, ids(read(dir + f))]));
      for(const f of PAGES){
        const src = read(dir + f);
        for(const [, page, anc] of src.matchAll(/href="([^"#:]*\.html)?(#[^"]*)?"/g)){
          const target = page || f;
          if(target.startsWith('../') || target.startsWith('en/')){
            if(!fs.existsSync(path.join(ROOT, dir, target))) problems.push(`${dir}${f} → ${target}`);
            continue;
          }
          if(!idmap[target]){ problems.push(`${dir}${f} → missing page ${target}`); continue; }
          const a = (anc || '').slice(1);
          if(a && !idmap[target].has(a) && !(target === 'lab.html' && LAB_TABS.includes(a))) problems.push(`${dir}${f} → ${target}#${a}`);
        }
        for(const [, src2] of src.matchAll(/(?:src|href)="((?:\.\.\/)?assets\/[^"]+)"/g))
          if(!fs.existsSync(path.join(ROOT, dir, src2))) problems.push(`${dir}${f} → asset ${src2}`);
        const all = [...src.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
        const dup = all.filter((x, i) => all.indexOf(x) !== i);
        if(dup.length) problems.push(`${dir}${f} duplicate ids: ${[...new Set(dup)].join(', ')}`);
      }
    }
    expect(problems).toEqual([]);
  });

  test('zh and en pages have identical section ids (the language switch lands on the same section)', () => {
    for(const f of PAGES) expect([...ids(read('en/' + f))].sort(), f).toEqual([...ids(read(f))].sort());
  });

  test('no Chinese text left on English pages', () => {
    for(const f of PAGES){
      const src = read('en/' + f).replace(/<link[^>]*>/g, '');
      expect(src.match(/[一-鿿]+/g) || [], 'en/' + f).toEqual([]);
    }
  });

  test('search index, glossary and update dates are up to date', () => {
    for(const tool of ['tools/build_glossary.py', 'tools/build_index.py', 'tools/stamp_updated.py']){
      const out = execFileSync('python', ['-X', 'utf8', path.join(ROOT, tool), '--check'], {cwd:ROOT, encoding:'utf8'});
      expect(out, tool).toContain('up to date');
    }
  });

  test('every search-index entry and glossary link points at a real section', () => {
    const problems = [];
    for(const [file, dir] of [['assets/search-index.js', ''], ['assets/search-index-en.js', 'en/']]){
      const src = read(file), data = JSON.parse(src.slice(src.indexOf('['), src.lastIndexOf(']') + 1));
      for(const e of data){
        if(!e.a) continue;
        const target = ids(read(dir + e.p));
        if(!target.has(e.a) && !(e.p === 'lab.html' && LAB_TABS.includes(e.a))) problems.push(`${file}: ${e.p}#${e.a}`);
      }
    }
    const g = read('assets/glossary-data.js'), gl = JSON.parse(g.slice(g.indexOf('['), g.lastIndexOf(']') + 1));
    const gloss = ids(read('glossary.html'));
    for(const e of gl){
      const [p, a] = e.l.split('#');
      if(!ids(read(p)).has(a)) problems.push(`glossary ${e.s} → ${e.l}`);
      if(!gloss.has(e.s)) problems.push(`glossary anchor ${e.s}`);
    }
    expect(problems).toEqual([]);
  });

  test('all JavaScript parses', () => {
    for(const f of fs.readdirSync(path.join(ROOT, 'assets')).filter(x => x.endsWith('.js')))
      expect(() => new Function(read('assets/' + f)), f).not.toThrow();
  });
});
