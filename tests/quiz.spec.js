// Quiz: answer every question by keyboard, in both languages.
const {test, expect} = require('./fixtures');
const {LANGS, watchErrors} = require('./helpers');

for(const lang of LANGS){
  test(`${lang || 'zh/'}quiz can be completed end to end`, async ({page}) => {
    test.setTimeout(420_000);   // 65 questions; desktop WebKit on Windows needs 1–3 s per question
    const errors = watchErrors(page);
    await page.goto(lang + 'quiz.html');
    await expect(page.locator('#qz-chips button')).toHaveCount(9);
    await page.locator('#qz-n').selectOption('all');
    const total = parseInt((await page.locator('#qz-count').textContent()).replace(/\D/g, ''), 10);
    expect(total).toBeGreaterThan(50);
    await page.locator('#qz-start').click();
    const checked = new Set();
    for(let i = 0; i < total; i++){
      const q = await page.locator('#qz-q').textContent();
      const opts = await page.locator('#qz-opts button').allTextContents();
      expect(opts, q).toHaveLength(4);
      expect(q + opts.join(), q).not.toMatch(/NaN|undefined/);
      if(lang) expect(q + opts.join(), 'Chinese in English quiz').not.toMatch(/[一-鿿]/);
      await page.keyboard.press(String(1 + (i % 4)));
      const link = (await page.locator('#qz-fb a').getAttribute('href')).split('#')[0];
      if(!checked.has(link)){
        checked.add(link);
        const res = await page.request.get(new URL(link, page.url()).href);
        expect(res.status(), 'review link ' + link).toBe(200);
      }
      await page.locator('#qz-next').click();
    }
    await expect(page.locator('#qz-end')).toBeVisible();
    expect(errors).toEqual([]);
  });
}
