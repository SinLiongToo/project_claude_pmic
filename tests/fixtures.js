// Common test setup: block Google Fonts (external, slow, not needed for checks) so tests are fast and work offline.
const base = require('@playwright/test');

const test = base.test.extend({
  page: async ({page}, use) => {
    await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
    await use(page);
  }
});

module.exports = {test, expect: base.expect};
