import { chromium } from '/Users/maxducroisy/thryveloop/node_modules/playwright/index.mjs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  viewport: { width: 1200, height: 630 },
  deviceScaleFactor: 1,
});

const template = pathToFileURL(resolve('scripts/social-card.html')).href;
await page.goto(template, { waitUntil: 'networkidle' });
await page.screenshot({ path: 'assets/social-card.png' });
await browser.close();
