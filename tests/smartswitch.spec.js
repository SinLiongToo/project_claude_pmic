// Smart-switch page: the three calculators stay finite at every setting and agree with hand calculations from the datasheet.
const {test, expect} = require('./fixtures');
const {LANGS, watchErrors, setRange} = require('./helpers');

const CALCS = ['hs-sense', 'hs-ind', 'hs-pwm'];
const scan = page => page.evaluate(ids => ids.map(id => {
  const txt = document.getElementById(id + '-m').textContent + document.getElementById(id + '-n').textContent;
  const svg = document.getElementById(id + '-p').innerHTML;
  return /NaN|Infinity|undefined/.test(txt + svg) ? id : '';
}).join(''), CALCS);

for(const lang of LANGS){
  test(`${lang || 'zh/'}smartswitch calculators: every control at min / mid / max, no NaN, no errors`, async ({page}) => {
    const errors = watchErrors(page);
    await page.goto(lang + 'smartswitch.html');
    await expect(page.locator('#hs-sense-m .metric')).toHaveCount(5);
    await expect(page.locator('#hs-ind-m .metric')).toHaveCount(4);
    await expect(page.locator('#hs-pwm-m .metric')).toHaveCount(4);
    expect(await scan(page)).toBe('');
    const ranges = await page.locator('.bench input[type=range]').evaluateAll(rs => rs.map(r => ({id:r.id, min:+r.min, max:+r.max, v:r.value})));
    expect(ranges.length).toBe(8);
    for(const r of ranges){
      for(const v of [r.min, (r.min + r.max) / 2, r.max]){
        await setRange(page, r.id, v);
        expect(await scan(page), `${r.id}=${v}`).toBe('');
      }
      await setRange(page, r.id, r.v);
    }
    for(const b of await page.locator('.bench .btnrow button').all()){
      await b.click();
      expect(await scan(page)).toBe('');
    }
    expect(errors).toEqual([]);
  });
}

test('smartswitch calculators agree with hand calculations', async ({page}) => {
  await page.goto('smartswitch.html');
  await expect(page.locator('#hs-sense-m .metric')).toHaveCount(5);
  // 20 A / 18 000 × 1 kΩ ≈ 1.11 V; worst case 20 / 15 500 + 8.25 µA ≈ 1.30 mA (datasheet I_IS2 max. 1.3 mA)
  let s = await page.evaluate(() => window.PMICHss.sense);
  expect(s.vTyp).toBeCloseTo(1.111, 2);
  expect(s.vMax).toBeCloseTo(1.299, 2);
  expect(s.vFaultMin).toBeCloseTo(5, 3);
  // about 1 mH (slider 67 → 1.02 mH), 19 A: ½ L × 361 × 35 / 21.5 ≈ 0.29–0.30 J, above E_AR 130 mJ
  await setRange(page, 'hs-l', 67);
  await setRange(page, 'hs-ii', 19);
  s = await page.evaluate(() => window.PMICHss.ind);
  expect(s.L).toBeGreaterThan(0.98e-3);
  expect(s.L).toBeLessThan(1.05e-3);
  expect(s.E).toBeCloseTo(0.5 * s.L * 361 * 35 / 21.5, 6);
  expect(s.lim).toBeCloseTo(0.130, 3);
  await expect(page.locator('#hs-ind-m .metric').nth(2)).toHaveClass(/bad/);
  // DC 24 A at 85 °C on 2s2p: T_J ≈ 85 + 24² × R(T_J) × 22 ≈ 140 °C (typical R_DS(ON))
  await setRange(page, 'hs-pi', 24);
  await setRange(page, 'hs-pd', 100);
  s = await page.evaluate(() => window.PMICHss.pwm);
  expect(s.ps).toBe(0);
  expect(s.tj).toBeGreaterThan(135);
  expect(s.tj).toBeLessThan(145);
  // PWM above the 200 Hz limit is flagged
  await setRange(page, 'hs-pd', 50);
  await setRange(page, 'hs-pf', 300);
  await expect(page.locator('#hs-pwm-m .metric').nth(3)).toHaveClass(/bad/);
});
