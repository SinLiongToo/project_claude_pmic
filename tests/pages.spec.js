// Every page, both languages: no errors, navigation, table of contents, language switch, theme switch.
const {test, expect} = require('./fixtures');
const {PAGES, LANGS, watchErrors} = require('./helpers');

for(const lang of LANGS){
  for(const f of PAGES){
    test(`${lang || 'zh/'}${f} loads cleanly and its chrome works`, async ({page}) => {
      const errors = watchErrors(page);
      await page.goto(lang + f);
      await expect(page.locator('header.top .nav a')).toHaveCount(13);
      if(f !== 'index.html') await expect(page.locator('header.top .nav a[aria-current="page"]')).toHaveCount(1);
      // table of contents matches the numbered sections
      const h2 = await page.locator('article h2[id]').count();
      if(h2) await expect(page.locator('.toc a')).toHaveCount(h2);
      // language switch points to the twin page, which exists
      const twin = await page.locator('#langBtn').getAttribute('href');
      expect(twin).toBe(lang ? '../' + f : 'en/' + f);
      const res = await page.request.get(new URL(twin, page.url()).href);
      expect(res.status()).toBe(200);
      // theme switch changes the background
      const before = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
      await page.locator('#themeBtn').click();
      await expect.poll(() => page.evaluate(() => getComputedStyle(document.body).backgroundColor)).not.toBe(before);
      expect(errors).toEqual([]);
    });
  }
}

test('pager links the chapters in order', async ({page}) => {
  const order = ['architecture', 'process', 'design', 'production', 'test', 'application'];
  for(let i = 0; i < order.length; i++){
    await page.goto(order[i] + '.html');
    const next = page.locator('.pager a.next');
    await expect(next).toHaveAttribute('href', i + 1 < order.length ? order[i + 1] + '.html' : 'issues.html');
  }
});
