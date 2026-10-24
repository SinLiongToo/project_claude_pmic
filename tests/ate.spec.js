// Test chapter: the UPH / test-cost calculator stays finite at every setting and matches the worked example in the text.
const {test, expect} = require('./fixtures');
const {LANGS, watchErrors, setRange} = require('./helpers');

const scan = page => page.evaluate(() => {
  const txt = document.getElementById('at-m').textContent + document.getElementById('at-n-note').textContent +
    document.getElementById('at-uph').innerHTML + document.getElementById('at-cost').innerHTML;
  return /NaN|Infinity|undefined/.test(txt) ? 'bad' : '';
});

for(const lang of LANGS){
  test(`${lang || 'zh/'}UPH calculator: every control at min / mid / max, no NaN, no errors`, async ({page}) => {
    const errors = watchErrors(page);
    await page.goto(lang + 'test.html#calc-uph');
    await expect(page.locator('#at-m .metric')).toHaveCount(6);
    expect(await scan(page)).toBe('');
    const ranges = await page.locator('#calc-uph + .bench input[type=range]').evaluateAll(rs => rs.map(r => ({id:r.id, min:+r.min, max:+r.max, v:r.value})));
    expect(ranges.length).toBe(9);
    for(const r of ranges){
      for(const v of [r.min, (r.min + r.max) / 2, r.max]){
        await setRange(page, r.id, v);
        expect(await scan(page), `${r.id}=${v}`).toBe('');
      }
      await setRange(page, r.id, r.v);
    }
    for(const b of await page.locator('#at-ins button').all()){
      await b.click();
      expect(await scan(page)).toBe('');
    }
    expect(errors).toEqual([]);
  });
}

test('UPH calculator matches the worked example', async ({page}) => {
  await page.goto('test.html#calc-uph');
  await expect(page.locator('#at-m .metric')).toHaveCount(6);
  // T1 0.6 s, 8 sites, PTE 95%, index 0.4 s: T8 = 0.81 s, 1.21 s per touchdown, raw UPH = 28 800 / 1.21 ≈ 23 802;
  // × 0.85 OEE / 1.03 retest ≈ 19 642; test cost = 80 / 19 642 ≈ 0.41 US¢; 10 M units need ≈ 509 h → 1 cell
  let s = await page.evaluate(() => ({...window.PMICAte}));
  expect(s.tn).toBeCloseTo(0.81, 6);
  expect(s.cycle).toBeCloseTo(1.21, 6);
  expect(s.uphRaw).toBeCloseTo(23801.65, 1);
  expect(s.uph).toBeCloseTo(19642.0, 0);
  expect(s.cost * 100).toBeCloseTo(0.4073, 3);
  expect(s.cells).toBe(1);
  // three temperatures triple the cost per unit
  await page.locator('#at-ins button[data-v="3"]').click();
  s = await page.evaluate(() => ({...window.PMICAte}));
  expect(s.cost * 100).toBeCloseTo(3 * 0.4073, 3);
});
