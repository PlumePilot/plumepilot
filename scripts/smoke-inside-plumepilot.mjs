import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const root = path.resolve('docs/inside-plumepilot');
const files = {
  '/it': 'Inside-PlumePilot.html',
  '/en': 'Inside-PlumePilot-en.html',
};
const server = http.createServer((req, res) => {
  const filename = files[new URL(req.url, 'http://localhost').pathname];
  if (!filename) { res.writeHead(404); res.end('Not found'); return; }
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(fs.readFileSync(path.join(root, filename)));
});

await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = 'http://127.0.0.1:' + server.address().port;
let browser;
try {
  browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--no-sandbox'] });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  const errors = [], remoteRequests = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => {
    if (!request.url().startsWith(origin + '/')) remoteRequests.push(request.url());
  });

  await page.goto(origin + '/en', { waitUntil: 'load' });
  assert.equal(await page.locator('html').getAttribute('lang'), 'en');
  assert.equal(await page.locator('.chapter').count(), 20);
  assert.equal(await page.locator('#themeSelect option').count(), 3);
  assert((await page.locator('#bookSearch').getAttribute('placeholder')).includes('Search'));

  await page.locator('#bookSearch').fill('generation token');
  await page.waitForFunction(() => document.querySelectorAll('.search-results.open .search-result').length > 0);
  await page.locator('.search-results .search-result').first().click();
  await page.waitForFunction(() => location.hash.startsWith('#'));
  const activeFromSearch = await page.locator('.chapter:not([hidden])').count();
  assert.equal(activeFromSearch, 1, 'search target must reveal exactly one chapter');

  await page.locator('[data-chapter-link="14"]').first().click();
  await page.waitForFunction(() => location.hash === '#chapter-14');
  assert((await page.locator('#sectionToc a').count()) > 300,
    'long chapter must expose its full table of contents');

  await page.locator('#themeSelect').selectOption('dark');
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
  await page.waitForFunction(() => localStorage.getItem('inside-plumepilot-state-en') !== null);
  const enState = await page.evaluate(() => localStorage.getItem('inside-plumepilot-state-en'));
  assert(JSON.parse(enState).chapter === '14', 'English reading position must persist');

  await page.keyboard.press('Alt+ArrowRight');
  await page.waitForFunction(() => location.hash === '#chapter-15');

  await page.goto(origin + '/it', { waitUntil: 'load' });
  assert.equal(await page.locator('html').getAttribute('lang'), 'it');
  assert((await page.locator('#bookSearch').getAttribute('placeholder')).includes('Cerca'));
  await page.waitForFunction(() => localStorage.getItem('inside-plumepilot-state') !== null);
  const keys = await page.evaluate(() => ({
    it: localStorage.getItem('inside-plumepilot-state'),
    en: localStorage.getItem('inside-plumepilot-state-en'),
  }));
  assert(keys.it && keys.en && keys.it !== keys.en, 'language positions must be independent');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('#menuBtn').click();
  assert(await page.locator('body').evaluate(el => el.classList.contains('sidebar-open')),
    'mobile drawer opens');

  assert.deepEqual(errors, [], 'no runtime JavaScript errors');
  assert.deepEqual(remoteRequests, [], 'reader must make no external requests');
  console.log('Browser smoke passed: search, chapter TOC, navigation, themes, storage, mobile, offline requests.');
  await context.close();
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
