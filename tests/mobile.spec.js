// @mobile — runs only in the phone projects (Pixel 7, iPhone 14): no sideways scrolling, touch interactions.
const {test, expect} = require('./fixtures');
const {PAGES, LANGS, LAB_TABS} = require('./helpers');

test.describe('@mobile', () => {
  for(const lang of LANGS){
    test(`${lang || 'zh/'} no page scrolls sideways`, async ({page}) => {
      for(const f of PAGES){
        await page.goto(lang + f);
        const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(over, f).toBeLessThanOrEqual(2);
      }
    });
  }

  test('lab tabs fit the screen and the controls respond to touch', async ({page}) => {
    for(const tab of LAB_TABS){
      await page.goto('lab.html#' + tab);
      await expect(page.locator(`#tab-${tab} svg.schem g.el`).first()).toBeVisible();
      const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(over, tab).toBeLessThanOrEqual(2);
    }
    await page.goto('lab.html#bode');
    await page.locator('#tab-bode [data-preset="tan"]').tap();
    await expect(page.locator('#bd-esr-o')).toContainText('Ω');
  });

  test('tapping a term opens its popup inside the screen; tapping elsewhere closes it', async ({page}) => {
    await page.goto('application.html');
    const term = page.locator('abbr.gl').nth(5);
    await term.scrollIntoViewIfNeeded();
    await term.tap();
    const pop = page.locator('.gl-pop');
    await expect(pop).toBeVisible();
    const box = await pop.boundingBox(), vw = page.viewportSize().width;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(vw);
    await page.locator('article h1').tap();
    await expect(pop).toBeHidden();
  });

  test('menu: the current chapter is scrolled into view in the top bar', async ({page}) => {
    await page.goto('complaints.html');
    const cur = page.locator('header.top .nav a[aria-current="page"]');
    await expect(cur).toBeInViewport();
  });
});
