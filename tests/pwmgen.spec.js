// Design chapter: the PWM-generation figure (carrier + reference → comparator → PWM).
const {test, expect} = require('./fixtures');
const {LANGS, watchErrors, setRange} = require('./helpers');

const scan = page => page.evaluate(() => {
  const s = ['pg-m', 'pg-wave', 'pg-out', 'pg-vref', 'pg-vsaw', 'pg-vout', 'pg-rule'].map(id => document.getElementById(id).innerHTML).join('');
  return /NaN|Infinity|undefined/.test(s) ? 'bad' : '';
});
const avg = page => page.evaluate(() => window.PMICPwmGen.avg);

for(const lang of LANGS){
  test(`${lang || 'zh/'}PWM generator: every control and option, no NaN, no errors`, async ({page}) => {
    const errors = watchErrors(page);
    await page.goto(lang + 'design.html#pwm-gen');
    await expect(page.locator('#pg-m .metric')).toHaveCount(3);
    for(const id of ['pg-ref', 'pg-bits', 'pg-cyc']){
      const r = await page.locator('#' + id).evaluate(e => ({min:+e.min, max:+e.max, v:e.value}));
      for(const v of [r.min, (r.min + r.max) / 2, r.max]){
        await setRange(page, id, v);
        expect(await scan(page), `${id}=${v}`).toBe('');
      }
      await setRange(page, id, r.v);
    }
    for(const m of ['analog', 'digital'])
      for(const c of ['saw', 'tri'])
        for(const r of ['const', 'sine']){
          await page.locator(`#pg-mode button[data-v="${m}"]`).click();
          await page.locator(`#pg-carrier button[data-v="${c}"]`).click();
          await page.locator(`#pg-refmode button[data-v="${r}"]`).click();
          expect(await scan(page), `${m}/${c}/${r}`).toBe('');
        }
    expect(errors).toEqual([]);
  });
}

test('PWM generator: duty equals V_ref / V_ramp, and the digital counter quantizes it', async ({page}) => {
  await page.goto('design.html#pwm-gen');
  await expect(page.locator('#pg-m .metric')).toHaveCount(3);
  // analog sawtooth and triangle: duty = reference share of the ramp
  await setRange(page, 'pg-ref', 30);
  expect(await avg(page)).toBeCloseTo(0.30, 2);
  await page.locator('#pg-carrier button[data-v="tri"]').click();
  expect(await avg(page)).toBeCloseTo(0.30, 2);
  // digital, 4 bits: the compare value rounds to whole sixteenths, 52% → 8 / 16 = 50%
  await page.locator('#pg-carrier button[data-v="saw"]').click();
  await page.locator('#pg-mode button[data-v="digital"]').click();
  await setRange(page, 'pg-bits', 4);
  await setRange(page, 'pg-ref', 52);
  expect(await avg(page)).toBeCloseTo(0.50, 2);
});

test('PWM generator: the cursor plays, the comparator follows it, and playback pauses', async ({page}) => {
  await page.goto('design.html#pwm-gen');
  await page.locator('#pg-wave').scrollIntoViewIfNeeded();
  const x0 = await page.evaluate(() => window.PMICPwmGen.cursor.x);
  await expect.poll(() => page.evaluate(() => window.PMICPwmGen.cursor.x), {timeout:5000}).not.toBe(x0);
  // the schematic shows what the comparator rule says at that instant
  const ok = await page.evaluate(() => { const c = window.PMICPwmGen.cursor; return document.getElementById('pg-vout').textContent === (c.r > c.c ? 'HIGH' : 'LOW'); });
  expect(ok).toBe(true);
  await page.locator('#pg-play').click();
  await expect(page.locator('#pg-play')).toHaveAttribute('aria-pressed', 'false');
  const x1 = await page.evaluate(() => window.PMICPwmGen.cursor.x);
  await page.waitForTimeout(600);
  expect(await page.evaluate(() => window.PMICPwmGen.cursor.x)).toBe(x1);
  // the V_ref sweep moves the slider, and touching a control stops it
  await page.locator('#pg-sweep').click();
  const v0 = await page.locator('#pg-ref').inputValue();
  await expect.poll(() => page.locator('#pg-ref').inputValue(), {timeout:5000}).not.toBe(v0);
  await setRange(page, 'pg-cyc', 4);
  await expect(page.locator('#pg-sweep')).toHaveAttribute('aria-pressed', 'false');
});
