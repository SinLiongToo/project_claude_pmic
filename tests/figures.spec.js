// Good-vs-bad PCB layout figures on the Applications chapter.
const {test, expect} = require('./fixtures');
const {LANGS, watchErrors} = require('./helpers');

for(const lang of LANGS){
  test(`${lang || 'zh/'}application: four bad/good layout pairs render, labels stay on the board`, async ({page}) => {
    const errors = watchErrors(page);
    await page.goto(lang + 'application.html');
    const figs = page.locator('figure.cmp');
    await expect(figs).toHaveCount(4);
    for(let i = 0; i < 4; i++){
      await expect(figs.nth(i).locator('.side.bad svg')).toHaveCount(1);
      await expect(figs.nth(i).locator('.side.good svg')).toHaveCount(1);
      expect(await figs.nth(i).locator('.side li').count()).toBeGreaterThanOrEqual(6);
    }
    const r = await page.evaluate(() => {
      const texts = [...document.querySelectorAll('figure.cmp svg text')];
      return {
        outside: texts.filter(t => { const b = t.getBBox(); return b.x < 4 || b.x + b.width > 316; }).map(t => t.textContent),
        bad: [...document.querySelectorAll('figure.cmp svg *')].some(e => /NaN|undefined/.test([...e.attributes].map(a => a.value).join(' ')))
      };
    });
    expect(r.outside).toEqual([]);
    expect(r.bad).toBe(false);
    expect(errors).toEqual([]);
  });
}
