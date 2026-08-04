import { chromium } from '/Users/maxducroisy/thryveloop/node_modules/playwright/index.mjs';
import { readFile } from 'node:fs/promises';

const browser = await chromium.launch({ headless: true });
const catalogue = JSON.parse(await readFile('content.json', 'utf8'));
const cases = [
  { name: 'desktop', width: 1440, height: 1000, colorScheme: 'light' },
  { name: 'desktop-night', width: 1440, height: 1000, colorScheme: 'dark', ambient: 'night' },
  { name: 'mobile', width: 390, height: 844, colorScheme: 'light' },
  { name: 'mobile-long', width: 390, height: 844, colorScheme: 'light', expanded: true },
];

for (const testCase of cases) {
  const page = await browser.newPage({
    viewport: { width: testCase.width, height: testCase.height },
    deviceScaleFactor: 1,
    colorScheme: testCase.colorScheme,
  });

  const consoleErrors = [];
  const requestFailures = [];
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', error => consoleErrors.push(error.message));
  page.on('requestfailed', request => {
    requestFailures.push({
      url: request.url(),
      error: request.failure()?.errorText || 'unknown',
    });
  });

  if (testCase.ambient) {
    await page.addInitScript(mode => localStorage.setItem('max-ambient', mode), testCase.ambient);
  }

  if (testCase.expanded) {
    const kinds = ['writing', 'project', 'video', 'note'];
    const types = ['Writing', 'Project', 'Video', 'Note'];
    const entries = Array.from({ length: 32 }, (_, index) => {
      const source = catalogue.entries[index % catalogue.entries.length];
      const kindIndex = index % kinds.length;
      return {
        ...source,
        id: `qa-${index + 1}`,
        kind: kinds[kindIndex],
        type: types[kindIndex],
        date: String(2026 - Math.floor(index / 12)),
        classification: kindIndex === 2 ? 'Talks & demos' : kindIndex === 3 ? 'Working note' : source.classification,
        title: `${source.title} ${index + 1}`,
      };
    });
    await page.route('**/content.json', route => route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ entries }),
    }));
  }

  await page.goto('http://127.0.0.1:4173', { waitUntil: 'networkidle' });
  await page.waitForTimeout(350);
  await page.waitForFunction(() => Array.from(document.images).every(image => image.complete && image.naturalWidth > 0));
  await page.screenshot({
    path: `output/${testCase.name}.png`,
    fullPage: true,
  });

  const initialAmbient = await page.locator('html').getAttribute('data-ambient');
  await page.getByRole('button', { name: `Switch to ${initialAmbient === 'night' ? 'day' : 'night'} theme` }).click();
  const toggledAmbient = await page.locator('html').getAttribute('data-ambient');
  await page.getByRole('button', { name: `Switch to ${initialAmbient} theme` }).click();

  await page.getByRole('button', { name: 'Browse all', exact: true }).click();
  await page.screenshot({
    path: `output/${testCase.name}-archive.png`,
    fullPage: false,
  });
  const archiveControls = {
    filters: await page.locator('.archive-filter').count(),
    visibleItems: await page.locator('.archive-item').count(),
    showMore: await page.locator('.archive-more').isVisible(),
    search: await page.getByPlaceholder('Search the archive').isVisible(),
  };
  const search = page.getByPlaceholder('Search the archive');
  if (testCase.expanded) {
    await page.locator('[data-archive-filter="video"]').click();
    archiveControls.videoItems = await page.locator('.archive-item').count();
  } else {
    await search.fill('ethics');
    archiveControls.searchItems = await page.locator('.archive-item').count();
  }
  await page.getByRole('button', { name: 'Close browse view', exact: true }).click();

  const overflow = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    body: document.body.scrollWidth,
    document: document.documentElement.scrollWidth,
  }));

  console.log(JSON.stringify({
    case: testCase.name,
    title: await page.title(),
    overflow,
    archiveControls,
    ambient: { initial: initialAmbient, toggled: toggledAmbient },
    dynamicFavicon: await page.locator('#site-favicon').getAttribute('href').then(href => href?.startsWith('data:image/png')),
    consoleErrors,
    requestFailures,
  }));

  await page.close();
}

const faviconPage = await browser.newPage({
  viewport: { width: 256, height: 256 },
  deviceScaleFactor: 1,
  colorScheme: 'dark',
});
await faviconPage.goto('http://127.0.0.1:4173/assets/favicon.svg', { waitUntil: 'networkidle' });
await faviconPage.screenshot({ path: 'output/favicon.png' });
await faviconPage.close();

const standalonePages = [
  { name: 'note-desktop', url: 'http://127.0.0.1:4173/notes/what-i-mean-by-useful.html', width: 1200, height: 900 },
  { name: 'note-mobile', url: 'http://127.0.0.1:4173/notes/what-i-mean-by-useful.html', width: 390, height: 844 },
  { name: '404-desktop', url: 'http://127.0.0.1:4173/404.html', width: 1200, height: 820 },
  { name: '404-mobile', url: 'http://127.0.0.1:4173/404.html', width: 390, height: 844 },
];

for (const standalone of standalonePages) {
  const page = await browser.newPage({
    viewport: { width: standalone.width, height: standalone.height },
    deviceScaleFactor: 1,
  });
  const errors = [];
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(standalone.url, { waitUntil: 'networkidle' });
  await page.screenshot({ path: `output/${standalone.name}.png`, fullPage: true });
  const overflow = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
  }));
  console.log(JSON.stringify({ case: standalone.name, overflow, consoleErrors: errors }));
  await page.close();
}

await browser.close();
