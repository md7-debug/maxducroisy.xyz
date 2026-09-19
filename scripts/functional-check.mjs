import { chromium } from '/Users/maxducroisy/thryveloop/node_modules/playwright/index.mjs';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const procurementContactUrl = 'https://www.traduotech.com/contact?lead=max&topic=Procurement%20AI%20%26%20Agent%20Deployment';
const errors = [];
page.on('console', message => {
  if (message.type() === 'error') errors.push(message.text());
});
page.on('pageerror', error => errors.push(error.message));

await page.goto('http://127.0.0.1:4173', { waitUntil: 'networkidle' });
if (await page.getByRole('link', { name: 'Book a conversation', exact: true }).getAttribute('href') !== procurementContactUrl) {
  throw new Error('Header booking link does not use the TraDuotech contact route');
}
await page.getByRole('tab', { name: 'Writing' }).click();
await page.waitForURL(url => url.searchParams.get('view') === 'writing');
await page.goBack();
await page.getByRole('tab', { name: 'Video' }).click();
await page.waitForURL(url => url.searchParams.get('view') === 'video');
const demoVideo = page.getByLabel('ThryveLoop in 37 seconds video preview');
await demoVideo.waitFor();
if (!(await demoVideo.getAttribute('poster'))?.endsWith('/thryveloop-demo-v10.jpg')) {
  throw new Error('ThryveLoop video preview is missing its poster');
}
if (!(await demoVideo.locator('source').getAttribute('src'))?.endsWith('/thryveloop-demo-v10.mp4')) {
  throw new Error('ThryveLoop video preview is missing its video source');
}
const demoLink = page.getByRole('link', { name: /Watch demo/ });
await demoLink.waitFor();
if (await demoLink.getAttribute('href') !== 'https://thryveloop.com/#demo') {
  throw new Error('ThryveLoop demo does not use its public video URL');
}
await page.goBack();
await page.getByRole('button', { name: 'procurement', exact: true }).click();
await page.waitForURL(url => url.searchParams.get('thread') === 'procurement');
await page.getByText('I am building a system for agents to work across procurement documents and tools.').waitFor();
if (await page.getByRole('link', { name: /Request a demo/ }).getAttribute('href') !== procurementContactUrl) {
  throw new Error('Procurement demo link does not use the TraDuotech contact route');
}

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 1280, height: 800 },
  { width: 1024, height: 768 },
  { width: 768, height: 800 },
  { width: 390, height: 844 },
]) {
  await page.setViewportSize(viewport);
  await page.waitForTimeout(50);
  const spacing = await page.evaluate(() => {
    const link = document.querySelector('.thread-item:nth-child(3) .thread-link')?.getBoundingClientRect();
    const navigator = document.querySelector('.thread-navigator')?.getBoundingClientRect();
    return link && navigator ? navigator.top - link.bottom : null;
  });
  if (spacing === null || spacing < 12) {
    throw new Error(`Procurement demo link is too close to navigation at ${viewport.width}px (${spacing}px)`);
  }
}
await page.setViewportSize({ width: 1280, height: 900 });

await page.getByRole('button', { name: 'Browse all', exact: true }).click();
await page.waitForURL(url => url.searchParams.get('browse') === 'all');
await page.getByRole('button', { name: 'Close browse view' }).click();
await page.waitForURL(url => !url.searchParams.has('browse'));

await page.goto('http://127.0.0.1:4173/?view=notes#top', { waitUntil: 'networkidle' });
await page.getByRole('tab', { name: 'Notes', selected: true }).waitFor();
const noteLink = page.getByRole('link', { name: 'What I Mean by Useful' });
await noteLink.waitFor();
if (await noteLink.getAttribute('href') !== 'notes/what-i-mean-by-useful') {
  throw new Error('Personal note does not use its clean public URL');
}

await page.goto('http://127.0.0.1:4173/?browse=note#top', { waitUntil: 'networkidle' });
await page.getByRole('dialog').waitFor();
await page.getByRole('link', { name: 'What I Mean by Useful' }).waitFor();
await page.getByRole('heading', { name: 'Archive', exact: true }).waitFor();

await page.goto('http://127.0.0.1:4173/notes/what-i-mean-by-useful.html', { waitUntil: 'networkidle' });
await page.getByRole('heading', { name: 'What I mean by useful' }).waitFor();
await page.getByText('what happens on a Tuesday morning').waitFor();

await page.goto('http://127.0.0.1:4173/404.html', { waitUntil: 'networkidle' });
await page.getByRole('heading', { name: 'This path does not lead anywhere.' }).waitFor();

if (errors.length) throw new Error(`Browser errors: ${errors.join(' | ')}`);
console.log('functional browser checks passed');
await browser.close();
