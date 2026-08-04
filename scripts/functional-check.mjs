import { chromium } from '/Users/maxducroisy/thryveloop/node_modules/playwright/index.mjs';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on('console', message => {
  if (message.type() === 'error') errors.push(message.text());
});
page.on('pageerror', error => errors.push(error.message));

await page.goto('http://127.0.0.1:4173', { waitUntil: 'networkidle' });
await page.getByRole('tab', { name: 'Writing' }).click();
await page.waitForURL(url => url.searchParams.get('view') === 'writing');
await page.goBack();
await page.getByRole('button', { name: 'procurement', exact: true }).click();
await page.waitForURL(url => url.searchParams.get('thread') === 'procurement');
await page.getByText('I’m working on AI agents that reduce manual procurement work').waitFor();

await page.getByRole('button', { name: 'Browse all', exact: true }).click();
await page.waitForURL(url => url.searchParams.get('browse') === 'all');
await page.getByRole('button', { name: 'Close browse view' }).click();
await page.waitForURL(url => !url.searchParams.has('browse'));

await page.goto('http://127.0.0.1:4173/?view=notes#top', { waitUntil: 'networkidle' });
await page.getByRole('tab', { name: 'Notes', selected: true }).waitFor();
await page.getByRole('link', { name: 'What I Mean by Useful' }).waitFor();

await page.goto('http://127.0.0.1:4173/?browse=note#top', { waitUntil: 'networkidle' });
await page.getByRole('dialog').waitFor();
await page.getByRole('link', { name: 'What I Mean by Useful' }).waitFor();

await page.goto('http://127.0.0.1:4173/notes/what-i-mean-by-useful.html', { waitUntil: 'networkidle' });
await page.getByRole('heading', { name: 'What I mean by useful' }).waitFor();
await page.getByText('what happens on a Tuesday morning').waitFor();

await page.goto('http://127.0.0.1:4173/404.html', { waitUntil: 'networkidle' });
await page.getByRole('heading', { name: 'This path does not lead anywhere.' }).waitFor();

if (errors.length) throw new Error(`Browser errors: ${errors.join(' | ')}`);
console.log('functional browser checks passed');
await browser.close();
