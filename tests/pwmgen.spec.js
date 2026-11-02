// Design chapter: the PWM-generation simulation (carrier + reference → comparator → PWM), running in time.
const {test, expect} = require('./fixtures');
const {LANGS, watchErrors, setRange} = require('./helpers');

const scan = page => page.evaluate(() => {
  const s = ['pg-m', 'pg-wave', 'pg-out', 'pg-vref', 'pg-vsaw', 'pg-vout', 'pg-rule'].map(id => document.getElementById(id).innerHTML).join('');
  return /NaN|Infinity|undefined/.test(s) ? 'bad' : '';
});
// refill the window at a given V_ref (set without an input event, so playback state does not matter) and return the last period's duty
// duties are measured from 120 samples per period, so they are exact to within one sample (1/120)
const near = (d, x) => Math.abs(d - x) <= 1 / 120 + 1e-9;
const dutyAt = (page, ref) => page.evaluate(r => {
  document.getElementById('pg-ref').value = r;
  window.PMICPwmGen.reset();
  const ps = window.PMICPwmGen.periods;
  return ps[ps.length - 1].d;
}, ref);

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
  expect(near(await dutyAt(page, 30), 0.30)).toBe(true);
  await page.locator('#pg-carrier button[data-v="tri"]').click();
  expect(near(await dutyAt(page, 30), 0.30)).toBe(true);
  // digital, 4 bits: the compare value rounds to whole sixteenths, 52% → 8 / 16 = 50%
  await page.locator('#pg-carrier button[data-v="saw"]').click();
  await page.locator('#pg-mode button[data-v="digital"]').click();
  await setRange(page, 'pg-bits', 4);
  expect(near(await dutyAt(page, 52), 0.50)).toBe(true);
});

test('PWM generator: changing V_ref changes only the future periods', async ({page}) => {
  await page.goto('design.html#pwm-gen');
  await expect(page.locator('#pg-m .metric')).toHaveCount(3);
  const r = await page.evaluate(() => {
    const G = window.PMICPwmGen, el = document.getElementById('pg-ref');
    el.value = 30; G.reset();
    const before = G.periods.map(p => p.d);
    el.value = 70; G.advance(3);
    return {before, after:G.periods.map(p => p.d)};
  });
  expect(r.before.every(d => Math.abs(d - 0.30) < 0.02)).toBe(true);
  // the window still holds earlier periods at 30%, and the newest ones are at 70%
  expect(r.after.some(d => Math.abs(d - 0.30) < 0.02)).toBe(true);
  expect(Math.abs(r.after[r.after.length - 1] - 0.70)).toBeLessThan(0.02);
});

test('PWM generator: time runs, the comparator shows "now", and playback pauses', async ({page}) => {
  await page.goto('design.html#pwm-gen');
  await page.locator('#pg-wave').scrollIntoViewIfNeeded();
  const t0 = await page.evaluate(() => window.PMICPwmGen.now);
  await expect.poll(() => page.evaluate(() => window.PMICPwmGen.now), {timeout:5000}).toBeGreaterThan(t0);
  const ok = await page.evaluate(() => { const c = window.PMICPwmGen.cur; return document.getElementById('pg-vout').textContent === (c.r > c.c ? 'HIGH' : 'LOW'); });
  expect(ok).toBe(true);
  await page.locator('#pg-play').click();
  await expect(page.locator('#pg-play')).toHaveAttribute('aria-pressed', 'false');
  const t1 = await page.evaluate(() => window.PMICPwmGen.now);
  await page.waitForTimeout(600);
  expect(await page.evaluate(() => window.PMICPwmGen.now)).toBe(t1);
  // the V_ref sweep resumes playback and moves the slider; touching a control stops the sweep
  await page.locator('#pg-sweep').click();
  await expect(page.locator('#pg-play')).toHaveAttribute('aria-pressed', 'true');
  const v0 = await page.locator('#pg-ref').inputValue();
  await expect.poll(() => page.locator('#pg-ref').inputValue(), {timeout:5000}).not.toBe(v0);
  await setRange(page, 'pg-cyc', 4);
  await expect(page.locator('#pg-sweep')).toHaveAttribute('aria-pressed', 'false');
});
