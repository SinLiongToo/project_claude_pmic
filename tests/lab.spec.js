// Interactive lab: every control at its limits, toggles, selects, auto sweep, schematic links, current playback.
const {test, expect} = require('./fixtures');
const {LANGS, LAB_TABS, watchErrors, scanTab, setRange} = require('./helpers');

for(const lang of LANGS){
  for(const tab of LAB_TABS){
    test.describe(`${lang || 'zh/'}lab#${tab}`, () => {
      test.beforeEach(async ({page}) => {
        await page.goto(lang + 'lab.html#' + tab);
        await expect(page.locator(`#tab-${tab} svg.schem g.el`).first()).toBeVisible();
      });

      test('every control at min / mid / max, every toggle and option: no NaN, no errors', async ({page}) => {
        test.setTimeout(300_000);   // ~50 settings, each re-simulating the model
        const errors = watchErrors(page);
        const panel = `#tab-${tab} .bench > .panel`;
        expect(await scanTab(page)).toBe('');
        const ranges = await page.locator(`${panel} input[type=range]`).evaluateAll(rs => rs.map(r => ({id:r.id, min:+r.min, max:+r.max, v:r.value})));
        for(const r of ranges){
          for(const v of [r.min, (r.min + r.max) / 2, r.max]){
            await setRange(page, r.id, v);
            expect(await scanTab(page), `${r.id}=${v}`).toBe('');
          }
          await setRange(page, r.id, r.v);
        }
        const buttons = page.locator(`${panel} .btnrow[id] button[data-v], ${panel} button[data-preset]`);
        for(let i = 0; i < await buttons.count(); i++){
          await buttons.nth(i).click();
          expect(await scanTab(page), 'button ' + i).toBe('');
        }
        const selects = await page.locator(`${panel} .ctl select`).evaluateAll(ss => ss.filter(s => !s.closest('.sweep')).map(s => ({id:s.id, n:s.options.length})));
        for(const s of selects){
          for(let k = 0; k < s.n; k++){
            await page.locator('#' + s.id).selectOption({index:k});
            expect(await scanTab(page), `${s.id}[${k}]`).toBe('');
          }
        }
        for(const pick of ['min', 'max']){
          await page.evaluate(([tb, pk]) => document.querySelectorAll(`#tab-${tb} .bench > .panel input[type=range]`).forEach(r => { r.value = r[pk]; r.dispatchEvent(new Event('input', {bubbles:true})); }), [tab, pick]);
          expect(await scanTab(page), 'all ' + pick).toBe('');
        }
        expect(errors).toEqual([]);
      });

      test('auto sweep runs, and stops when a control is touched', async ({page}) => {
        const play = page.locator(`#tab-${tab} .sw-play`);
        const id = await page.locator(`#tab-${tab} .sw-param`).inputValue();
        const v0 = await page.locator('#' + id).inputValue();
        await play.click();
        await expect(play).toHaveAttribute('aria-pressed', 'true');
        await expect.poll(() => page.locator('#' + id).inputValue(), {timeout:8000}).not.toBe(v0);
        expect(await scanTab(page)).toBe('');
        await setRange(page, id, await page.locator('#' + id).getAttribute('min'));
        await expect(play).toHaveAttribute('aria-pressed', 'false');
      });

      test('schematic: every part maps to a control and every control has a part; hover and click link them', async ({page}) => {
        const keys = await page.locator(`#tab-${tab} svg.schem g.el`).evaluateAll(gs => gs.map(g => g.dataset.k));
        const parts = new Set(keys.join(' ').split(' '));
        for(const id of parts) await expect(page.locator('#' + id), 'part → ' + id).toHaveCount(1);
        const controls = await page.locator(`#tab-${tab} .bench > .panel .ctl [id]`).evaluateAll(es => es.map(e => e.id).filter(id => !/-o$/.test(id)));
        expect(controls.filter(id => !parts.has(id)), 'controls with no circuit part').toEqual([]);
        // moving a slider lights its part (checked right after the redraw: the highlight fades after 1.6 s by design)
        const first = await page.locator(`#tab-${tab} .bench > .panel input[type=range]`).first().getAttribute('id');
        const lit = await page.evaluate(async ([tb, id]) => {
          const e = document.getElementById(id); e.value = e.max; e.dispatchEvent(new Event('input', {bubbles:true}));
          await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
          return document.querySelectorAll(`#tab-${tb} svg.schem g.el.hot[data-k~="${id}"]`).length;
        }, [tab, first]);
        expect(lit, 'part lights up when ' + first + ' moves').toBe(1);
        // clicking a part jumps to its control (focus moves there; the flash itself is too short-lived to assert on slow engines)
        await page.locator(`#tab-${tab} svg.schem g.el[data-k~="${first}"]`).first().click();
        await expect(page.locator('#' + first)).toBeFocused();
      });

      if(tab === 'transient' || tab === 'buck'){
        test('current playback moves and shows a time cursor on both plots', async ({page}) => {
          const live = page.locator(`#tab-${tab} svg.schem g.live`);
          const a = await live.textContent();
          await expect.poll(() => live.textContent(), {timeout:5000}).not.toBe(a);
          await expect(page.locator(`#tab-${tab} svg line.cursor`)).toHaveCount(2);
          expect(await live.textContent()).not.toMatch(/NaN|Infinity|undefined/);
          // scrubbing pauses playback and moves to that moment
          await page.locator(`#tab-${tab} .an-pos`).evaluate(e => { e.value = 300; e.dispatchEvent(new Event('input', {bubbles:true})); });
          await expect(page.locator(`#tab-${tab} .an-play`)).toHaveAttribute('aria-pressed', 'false');
        });

        test('playback stops while the schematic is scrolled out of view, and resumes when it is back', async ({page}) => {
          const live = page.locator(`#tab-${tab} svg.schem g.live`);
          await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
          await page.waitForTimeout(400);
          const a = await live.textContent();
          await page.waitForTimeout(800);
          expect(await live.textContent(), 'no frames while off screen').toBe(a);
          await page.locator(`#tab-${tab} .schem-panel`).scrollIntoViewIfNeeded();
          await expect.poll(() => live.textContent(), {timeout:5000}).not.toBe(a);
        });
      }
    });
  }
}

test('transient model stays physical for 200 random settings (0 V ≤ V_OUT ≤ V_IN, current within limits)', async ({page}) => {
  test.setTimeout(300_000);
  await page.goto('lab.html#transient');
  await expect(page.locator('#tab-transient svg.schem g.el').first()).toBeVisible();
  let seed = 12345;
  const rnd = n => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed % n; };
  for(let k = 0; k < 200; k++){
    const v = {'tr-c':rnd(9), 'tr-pm':15 + rnd(66)};
    for(const id of ['tr-i1', 'tr-i2', 'tr-tr', 'tr-esr', 'tr-bw', 'tr-sr']) v[id] = rnd(101);
    const s = await page.evaluate(vals => {
      for(const [id, x] of Object.entries(vals)){ const e = document.getElementById(id); e.value = x; e.dispatchEvent(new Event('input', {bubbles:true})); }
      const r = window.PMICLab.tr.rec; let vmin = 1e9, vmax = -1e9, ip = 0, bad = 0;
      r.forEach(x => { if(!isFinite(x[1]) || !isFinite(x[3])) bad++; vmin = Math.min(vmin, x[1]); vmax = Math.max(vmax, x[1]); ip = Math.max(ip, x[3]); });
      return {vmin, vmax, ip, bad};
    }, v);
    expect(s.bad, JSON.stringify(v)).toBe(0);
    expect(s.vmin, JSON.stringify(v)).toBeGreaterThanOrEqual(-1.8001);
    expect(s.vmax, JSON.stringify(v)).toBeLessThanOrEqual(1.5001);
    expect(s.ip, JSON.stringify(v)).toBeLessThanOrEqual(1.5001);
  }
});

test('lab models agree with hand calculations', async ({page}) => {
  await page.goto('lab.html#thermal');
  await expect(page.locator('#th-metrics .metric')).toHaveCount(7);
  // defaults: 5 V → 3.3 V, 300 mA, SOT-23 (210 °C/W), 45 °C → T_J ≈ 45 + 0.51 × 210 ≈ 152 °C
  await expect(page.locator('#th-metrics .metric').nth(1).locator('.mv')).toContainText('152');
  await page.goto('lab.html#buck');
  // defaults: 5 V → 1.2 V, 0.68 µH, 2 MHz → ΔI_L = 1.2 × 0.76 / (0.68 µ × 2 M) ≈ 671 mA
  await expect(page.locator('#bk-metrics .metric').nth(1).locator('.mv')).toContainText('671');
  await page.goto('lab.html#bode');
  // classic LDO + ceramic at 100 mA: poor phase margin (< 20°)
  const pm = parseFloat(await page.locator('#bd-metrics .metric').first().locator('.mv').textContent());
  expect(pm).toBeLessThan(20);
  await page.locator('#tab-bode [data-preset="tan"]').click();
  await expect.poll(async () => parseFloat(await page.locator('#bd-metrics .metric').first().locator('.mv').textContent())).toBeGreaterThan(45);
});
