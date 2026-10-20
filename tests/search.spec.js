// Site search (Ctrl+K): results exist and point at real pages.
const {test, expect} = require('./fixtures');

const QUERIES = {'': ['dropout', 'PSRR', '修調', '8D', 'SiC', 'MLCC', 'UVLO'], 'en/': ['dropout', 'PSRR', 'trim', '8D', 'SiC', 'MLCC', 'UVLO']};

for(const [lang, qs] of Object.entries(QUERIES)){
  test(`${lang || 'zh/'} search finds every topic`, async ({page}) => {
    await page.goto(lang + 'design.html');
    for(const q of qs){
      await page.keyboard.press('Control+k');
      await expect(page.locator('#findQ')).toBeFocused();
      await page.locator('#findQ').fill(q);
      const first = page.locator('#findRes a').first();
      await expect(first, q).toBeVisible();
      const href = await first.getAttribute('href');
      const res = await page.request.get(new URL(href.split('#')[0], page.url()).href);
      expect(res.status(), q + ' → ' + href).toBe(200);
      await page.keyboard.press('Escape');
      await expect(page.locator('.find-ov')).toBeHidden();
    }
  });
}

test('pressing / also opens search and Enter follows the first result', async ({page}) => {
  await page.goto('index.html');
  await page.keyboard.press('/');
  await page.locator('#findQ').fill('UVLO');
  await page.keyboard.press('Enter');
  await expect(page).not.toHaveURL(/index\.html$/);
});
