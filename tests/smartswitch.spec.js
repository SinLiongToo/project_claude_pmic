// Smart-switch page: the four calculators stay finite at every setting and agree with hand calculations from the datasheet.
const {test, expect} = require('./fixtures');
const {LANGS, watchErrors, setRange} = require('./helpers');

const CALCS = ['hs-sense', 'hs-ind', 'hs-pwm', 'hs-os'];
const scan = page => page.evaluate(ids => ids.map(id => {
  const txt = document.getElementById(id + '-m').textContent + document.getElementById(id + '-n').textContent;
  const svg = document.getElementById(id + '-p').innerHTML +
    (id === 'hs-pwm' ? document.getElementById('hs-pwm-w').innerHTML + document.getElementById('hs-pwm-s').innerHTML : '');
  return /NaN|Infinity|undefined/.test(txt + svg) ? id : '';
}).join(''), CALCS);

for(const lang of LANGS){
  test(`${lang || 'zh/'}smartswitch calculators: every control at min / mid / max, no NaN, no errors`, async ({page}) => {
    const errors = watchErrors(page);
    await page.goto(lang + 'smartswitch.html');
    await expect(page.locator('#hs-sense-m .metric')).toHaveCount(5);
    await expect(page.locator('#hs-ind-m .metric')).toHaveCount(4);
    await expect(page.locator('#hs-pwm-m .metric')).toHaveCount(6);
    await expect(page.locator('#hs-os-m .metric')).toHaveCount(4);
    expect(await scan(page)).toBe('');
    const ranges = await page.locator('.bench input[type=range]').evaluateAll(rs => rs.map(r => ({id:r.id, min:+r.min, max:+r.max, v:r.value})));
    expect(ranges.length).toBe(9);
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
    // every sweep parameter × every output, with the swept slider at both ends
    const params = await page.locator('#hs-sw-param option').evaluateAll(os => os.map(o => o.value));
    const outs = await page.locator('#hs-sw-out option').evaluateAll(os => os.map(o => o.value));
    expect(params.length).toBe(4);
    expect(outs.length).toBe(4);
    for(const p of params){
      await page.locator('#hs-sw-param').selectOption(p);
      for(const o of outs){
        await page.locator('#hs-sw-out').selectOption(o);
        expect(await scan(page), `${p} → ${o}`).toBe('');
      }
    }
    expect(errors).toEqual([]);
  });

  test(`${lang || 'zh/'}PWM auto sweep moves the chosen slider and stops when a control is touched`, async ({page}) => {
    await page.goto(lang + 'smartswitch.html#calc-pwm');
    await page.locator('#hs-sw-param').selectOption('hs-pf');
    const v0 = await page.locator('#hs-pf').inputValue();
    await page.locator('#hs-sw-play').click();
    await expect(page.locator('#hs-sw-play')).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(() => page.locator('#hs-pf').inputValue(), {timeout:8000}).not.toBe(v0);
    // the sweep plot's dot follows the slider
    await expect.poll(() => page.evaluate(() => window.PMICHss.pwm.sweep.cur[0] === +document.getElementById('hs-pf').value)).toBe(true);
    expect(await scan(page)).toBe('');
    await setRange(page, 'hs-pi', 10);
    await expect(page.locator('#hs-sw-play')).toHaveAttribute('aria-pressed', 'false');
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
  // waveform model at 100 Hz, 50%: output on from 50 µs to 5150 µs with symmetric 50 µs ramps → duty 51%;
  // power fraction is a little lower because each ramp carries only 1/3 of full power: 0.51 − 2 × 50 µs × (1/2 − 1/3) / 10 ms
  await setRange(page, 'hs-pf', 100);
  s = await page.evaluate(() => window.PMICHss.pwm.wave);
  expect(s.deff).toBeCloseTo(0.51, 3);
  expect(s.pf).toBeCloseTo(0.51 - 2 * 50e-6 * (1 / 2 - 1 / 3) / 10e-3, 3);
  // edge timing at 100 Hz (T = 10 ms): shortest pulse 100 µs typ. = 1%, 400 µs worst = 4%; duty shift +1% typ., +4.4% worst
  await setRange(page, 'hs-pf', 100);
  s = await page.evaluate(() => window.PMICHss.pwm.edge);
  expect(s.minTyp).toBeCloseTo(1, 6);
  expect(s.minMax).toBeCloseTo(4, 6);
  expect(s.dTyp).toBeCloseTo(1, 6);
  expect(s.dMax).toBeCloseTo(4.4, 6);
  // op-amp offset 350 µV over 2.7 mΩ ≈ 0.13 A, the datasheet I_L0 limit at 25 °C; 500 µV is over it
  await setRange(page, 'hs-vos', 350);
  s = await page.evaluate(() => window.PMICHss.os);
  expect(s.il0).toBeCloseTo(0.1296, 3);
  await setRange(page, 'hs-vos', 500);
  await expect(page.locator('#hs-os-m .metric').first()).toHaveClass(/bad/);
});
