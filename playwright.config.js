// Playwright config: serves the site with a small Node static server (like GitHub Pages, over http)
// and runs the same checks in Chromium, Firefox and WebKit, plus two phone profiles.
const {defineConfig, devices} = require('@playwright/test');
const os = require('os');
const path = require('path');

// keep test output outside OneDrive: syncing those folders while tests write to them breaks traces and screenshots
const OUT = path.join(os.tmpdir(), 'pmic-notes-tests');

const PORT = 8765;

module.exports = defineConfig({
  testDir: './tests',
  timeout: 120_000,
  expect: {timeout: 10_000},
  fullyParallel: true,
  // 2 browsers at a time: with 4, three engines plus the animated lab pages exhausted memory on a typical laptop
  // (Firefox "OutOfMemory", WebKit "Target crashed" and its CrashReport.dmp)
  workers: 2,
  // one retry absorbs a rare engine crash; a retried test is reported as "flaky", so it stays visible
  retries: 1,
  globalSetup: require.resolve('./tests/run-lock.js'),
  outputDir: path.join(OUT, 'results'),
  reporter: [['list'], ['html', {open: 'never', outputFolder: path.join(OUT, 'report')}]],
  use: {
    baseURL: `http://127.0.0.1:${PORT}/`,
    trace: 'on-first-retry',          // record traces only when a test is retried (keeps memory and disk use low)
    screenshot: 'only-on-failure'
  },
  webServer: {
    command: `node tests/server.js ${PORT}`,
    url: `http://127.0.0.1:${PORT}/index.html`,
    reuseExistingServer: true,
    timeout: 30_000
  },
  projects: [
    // desktop: every test except the phone-only ones (@mobile); the static file checks run once, in chromium
    {name: 'chromium', use: {...devices['Desktop Chrome']}, grepInvert: /@mobile/},
    {name: 'firefox', use: {...devices['Desktop Firefox']}, grepInvert: /@mobile|@static/},
    {name: 'webkit', use: {...devices['Desktop Safari']}, grepInvert: /@mobile|@static/},
    // phones: only the layout and touch checks
    {name: 'mobile-chrome', use: {...devices['Pixel 7']}, grep: /@mobile/},
    {name: 'mobile-safari', use: {...devices['iPhone 14']}, grep: /@mobile/}
  ]
});
