// Glossary: underlined terms on chapters, popup by hover / keyboard, glossary page filter and anchors.
const {test, expect} = require('./fixtures');
const {LANGS, CHAPTERS} = require('./helpers');

for(const lang of LANGS){
  test(`${lang || 'zh/'} chapters underline terms, and each points at a known entry`, async ({page}) => {
    for(const c of CHAPTERS){
      await page.goto(lang + c + '.html');
      await expect.poll(() => page.locator('abbr.gl').count(), {message:c}).toBeGreaterThan(20);
      const bad = await page.evaluate(() => [...document.querySelectorAll('abbr.gl')].filter(a => !window.GLOSSARY[+a.dataset.g]).length);
      expect(bad, c).toBe(0);
    }
  });

  test(`${lang || 'zh/'} UVLO popup by hover and keyboard`, async ({page}) => {
    await page.goto(lang + 'design.html');
    const uvlo = page.locator('abbr.gl', {hasText:/^UVLO$/}).first();
    await uvlo.scrollIntoViewIfNeeded();
    await uvlo.hover();
    const pop = page.locator('.gl-pop');
    await expect(pop).toBeVisible();
    await expect(pop).toContainText(lang ? 'Undervoltage lockout' : '欠壓鎖定');
    for(const href of await pop.locator('a').evaluateAll(as => as.map(a => a.getAttribute('href')))){
      const res = await page.request.get(new URL(href.split('#')[0], page.url()).href);
      expect(res.status(), href).toBe(200);
    }
    await page.keyboard.press('Escape');
    await expect(pop).toBeHidden();
    await uvlo.focus();
    await expect(pop).toBeVisible();
  });
}

test('ambiguous words are not mislinked (MV/cm unit, material "Bandgap")', async ({page}) => {
  await page.goto('en/sic.html');
  await expect.poll(() => page.locator('abbr.gl').count()).toBeGreaterThan(20);
  const wrong = await page.evaluate(() => [...document.querySelectorAll('abbr.gl')].filter(a => {
    const g = window.GLOSSARY[+a.dataset.g], after = (a.nextSibling && a.nextSibling.textContent) || '';
    return (a.textContent === 'MV' && after.startsWith('/cm')) || (a.textContent === 'Bandgap' && g.s === 'g-bandgap-reference');
  }).length);
  expect(wrong).toBe(0);
});

test('glossary page: filter and anchor highlight', async ({page}) => {
  await page.goto('glossary.html#g-uvlo');
  await expect(page.locator('#g-uvlo')).toBeVisible();
  await expect(page.locator('.gl-list > div.gl-target')).toHaveCount(1);
  await page.locator('#glf').fill('UVLO');
  await expect(page.locator('.gl-list > div:not([hidden])')).toHaveCount(1);
  await page.locator('#glf').fill('');
  expect(await page.locator('.gl-list > div:not([hidden])').count()).toBeGreaterThan(200);
});
