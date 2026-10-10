// Browser regression check; all RPC data below is a test fixture, never chain state.
// Run with an installed playwright-core module path as argv[2]. No wallet is injected.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { extname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { runInNewContext } from 'node:vm';

const require = createRequire(import.meta.url);
const { Interface, ZeroAddress, ZeroHash } = require('../web/vendor/ethers.umd.min.js');
const { chromium } = await import(process.argv[2] ? pathToFileURL(resolve(process.argv[2])).href : 'playwright-core');
const root = resolve('dist');
const source = await readFile(resolve('web/index.html'), 'utf8');
const padABI = runInNewContext(source.slice(source.indexOf('const KEY_T ='), source.indexOf('const ROUTER_ABI =')) + '\nPAD_ABI');
const iface = new Interface([...padABI,
  'function getSlot0(bytes32) view returns (uint160,int24,uint24,uint24)',
  'function balanceOf(address) view returns (uint256)',
  'function withdrawableDividendOf(address) view returns (uint256)',
  'function withdrawnDividends(address) view returns (uint256)',
  'function totalSupply() view returns (uint256)',
  'function hasPass(address) view returns (bool)',
  'function passPrice() view returns (uint256)',
  'function image(uint256) pure returns (string)',
]);
// Existing deployed addresses identify fixtures; none are used for writes.
const pepes = '0xE2C46c7068566740A33A4C93f5445B07BCfE5644';
const v1 = '0x2d7689E48Fd71D9A0f225C673D7b8F8A693368CC'.toLowerCase();
const owner = '0x3c8A4d94B3219F6633F2cC94094f4765b30c691C';
const imd = '0x5F7Bb59365ce557C26dbcAa4EE9d39A4b95B7127';
const ethUsdPool = source.match(/ethUsdPoolId: "(0x[a-f0-9]+)"/)[1];
const token = [pepes, 'Pepes (test fixture)', 'PEPES', '', imd, owner, 1791500000, 1, false, ZeroHash, 2n ** 96n, 1000n * 10n ** 18n, 0, 123n * 10n ** 18n];
const fixtureArt = source.match(/const FROG_SVG = `([\s\S]*?)`;/)[1].replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
let empty = false;
function rpc(call) {
  const { method, params = [], id } = call;
  let result;
  if (method === 'eth_getCode') result = '0x01';
  else if (method === 'eth_chainId') result = '0x1237';
  else if (method === 'eth_blockNumber') result = '0x1';
  else if (method === 'eth_getLogs') result = [];
  else if (method === 'eth_call') {
    const tx = iface.parseTransaction({ data: params[0].data });
    if (!tx) throw new Error('Unimplemented fixture selector: ' + params[0].data.slice(0, 10));
    const values = {
      tokenCount: [!empty && params[0].to.toLowerCase() === v1 ? 1 : 0],
      getTokens: [[...(!empty && params[0].to.toLowerCase() === v1 ? [token] : [])]],
      getTokenInfo: [token],
      getSlot0: [BigInt(Math.floor(Math.sqrt(tx.name === 'getSlot0' && tx.args[0] === ethUsdPool ? 2500 / 1e12 : 2500 / 7.75) * 2 ** 96)), 0, 0, 0],
      startTick: [0],
      owner: [owner], feeRecipient: [owner], creatorPayout: [owner], pendingCreatorPayout: [ZeroAddress],
      pendingProtocolFees: [0], feeSplit: [0, 300, 0], totalBurned: [0], pendingBurn: [0],
      balanceOf: [100n * 10n ** 18n], withdrawableDividendOf: [123n * 10n ** 18n], withdrawnDividends: [0],
      totalSupply: [10n ** 27n], hasPass: [false], passPrice: [100000n * 10n ** 18n],
      image: [fixtureArt],
    };
    if (!tx || !values[tx.name]) throw new Error('Unimplemented fixture call: ' + params[0].data);
    result = iface.encodeFunctionResult(tx.fragment, values[tx.name]);
  } else throw new Error('Unexpected RPC method (writes forbidden): ' + method);
  return { jsonrpc: '2.0', id, result };
}

const server = createServer(async (req, res) => {
  try {
    let pathname = new URL(req.url, 'http://localhost').pathname;
    if (!pathname.startsWith('/preview/')) return void res.writeHead(404).end();
    pathname = pathname.slice('/preview/'.length);
    if (!pathname || pathname.endsWith('/')) pathname += 'index.html';
    const file = resolve(root, pathname);
    if (!file.startsWith(root + '/')) return void res.writeHead(403).end();
    res.setHeader('Content-Type', ({ '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon' })[extname(file)] || 'application/octet-stream');
    // Inline application scripts were already part of this site's architecture.
    // CDN scripts are denied by this host policy; the HTML also denies data: fetch.
    res.setHeader('Content-Security-Policy', "script-src 'self' 'unsafe-inline'; object-src 'none'");
    res.end(await readFile(file));
  } catch { res.writeHead(404).end(); }
});
await new Promise((done) => server.listen(0, '127.0.0.1', done));
await mkdir('artifacts', { recursive: true });
let browser;
const report = { fixtureData: true, checks: [], viewports: [], console: [], failedRequests: [], unexpectedRpc: [], contrast: [] };
function pass(name, details) {
  report.checks.push({ name, result: 'passed', ...(details ? { details } : {}) });
  console.log('PASS: ' + name);
}
try {
  browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  report.browser = browser.version();
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: 'light', reducedMotion: 'reduce' });
  const base = `http://127.0.0.1:${server.address().port}/preview/`;
  await context.route('**/*', async (route) => {
    const request = route.request(), url = request.url();
    if (url.startsWith(base)) return route.continue();
    if (url.includes('publicnode.com')) {
      try {
        const body = request.postDataJSON();
        return route.fulfill({ json: Array.isArray(body) ? body.map(rpc) : rpc(body) });
      } catch (error) {
        report.unexpectedRpc.push(error.message);
        return route.fulfill({ status: 500, body: 'Unsupported test fixture call' });
      }
    }
    if (url.includes('blockscout.com/api/')) return route.fulfill({ json: { items: [], next_page_params: null } });
    // Test the site's existing monospace fallback with optional fonts offline.
    if (url.startsWith('https://fonts.googleapis.com/')) return route.fulfill({ contentType: 'text/css', body: '' });
    return route.abort('blockedbyclient');
  });
  await context.addInitScript(() => {
    window.__violations = [];
    document.addEventListener('securitypolicyviolation', (e) => window.__violations.push({ directive: e.violatedDirective, uri: e.blockedURI }));
    window.__shared = [];
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: ({ files }) => files?.[0]?.type === 'image/png' });
    Object.defineProperty(navigator, 'share', { configurable: true, value: async ({ files, text }) => {
      window.__shared.push({ name: files[0].name, type: files[0].type, size: files[0].size, text, bytes: Array.from(new Uint8Array(await files[0].arrayBuffer()).slice(0, 8)) });
    } });
  });
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.setDefaultNavigationTimeout(20000);
  page.on('pageerror', (error) => report.console.push({ type: 'pageerror', message: error.message }));
  page.on('console', (message) => { if (['error', 'warning'].includes(message.type())) report.console.push({ type: message.type(), message: message.text().slice(0, 800) }); });
  page.on('requestfailed', (request) => report.failedRequests.push({ url: request.url(), error: request.failure()?.errorText }));
  await page.goto(base);
  await page.locator('#list .tcard').waitFor();
  assert.equal(await page.evaluate(() => ethers.version), '6.13.4');
  pass('Local ethers boots the production export under the restrictive host CSP');

  for (const width of [320, 390, 601, 768, 860, 1024, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    await page.evaluate(() => scrollTo(0, 0));
    const metrics = await page.evaluate(() => {
      const action = document.querySelector('.hero .primary').getBoundingClientRect();
      return { width: innerWidth, scrollWidth: document.documentElement.scrollWidth, actionBottom: action.bottom, title: document.querySelector('h1').textContent };
    });
    report.viewports.push(metrics);
    assert.ok(metrics.scrollWidth <= width, `Horizontal overflow at ${width}: ${metrics.scrollWidth}`);
    assert.ok(metrics.actionBottom < 804, `Main action below first screen at ${width}`);
    if ([390, 1440].includes(width)) await page.screenshot({ path: `artifacts/home-${width}.png` });
  }
  pass('Home reflows at 320, 390, 601, 768, 860, 1024 and 1440; product/main action on first screen');
  assert.equal(await page.locator('.pepe svg').first().evaluate((e) => getComputedStyle(e).animationName), 'none');
  pass('Home frog animation honors the reduced-motion preference');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('#chainf [data-c="ethereum"]').click();
  assert.match(await page.locator('#list').innerText(), /No tokens on Ethereum yet/);
  await page.locator('#chainf [data-c="all"]').click();
  assert.equal(await page.locator('#list .tcard').count(), 1);
  await page.locator('#sort [data-s="mc"]').click();
  assert.equal(await page.evaluate(() => localStorage.getItem('tokenSort')), 'mc');
  pass('Chain filters, empty state and sort preference work');
  await page.locator('#theme').click();
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({ path: 'artifacts/home-dark-390.png' });
  await page.locator('#theme').click();
  pass('Light/dark toggle preserves the existing theme behavior');

  // The terminal remains dark in both themes, so its focus ring uses its green.
  await page.locator('.scr-input').focus();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  assert.equal(await page.locator('.scr-input').evaluate((e) => e === document.activeElement), true);
  assert.equal(await page.locator('.scr-input').evaluate((e) => getComputedStyle(e).outlineColor), 'rgb(61, 220, 132)');
  await page.locator('.scr-input').evaluate((e) => e.scrollIntoView({ block: 'center' }));
  await page.screenshot({ path: 'artifacts/terminal-focus-390.png' });

  // Keyboard activation reaches the launch form without requesting a wallet.
  await page.locator('header .logo').focus();
  for (let step = 0; step < 12; step++) {
    await page.keyboard.press('Tab');
    if (await page.locator('.hero .primary').evaluate((e) => e === document.activeElement)) break;
  }
  assert.equal(await page.locator('.hero .primary').evaluate((e) => e === document.activeElement), true);
  assert.equal(await page.locator('.hero .primary').evaluate((e) => getComputedStyle(e).outlineStyle), 'solid');
  await page.screenshot({ path: 'artifacts/home-focus-390.png' });
  await page.keyboard.press('Enter');
  await page.locator('#cf').waitFor();
  await page.locator('#n').fill('Browser validation');
  await page.locator('#s').fill('CHECK');
  await page.locator('#presets [data-p="custom"]').click();
  await page.screenshot({ path: 'artifacts/launch-390.png' });
  assert.equal(await page.locator('#n').inputValue(), 'Browser validation');
  assert.equal(await page.locator('#n').evaluate((e) => getComputedStyle(e).fontSize), '16px');
  pass('Keyboard opens Launch; name/ticker fields and custom fee disclosure work (no submit/signature)');
  await page.locator('#connect').click();
  await page.waitForFunction(() => document.querySelector('#toast').textContent.includes('No wallet found'));
  assert.match(await page.locator('#toast').innerText(), /wallet/i);
  pass('Connect without an installed wallet shows recovery guidance');

  await page.locator('nav a[data-nav="/rewards"]').click();
  await page.locator('#ra').fill('invalid');
  await page.locator('#rf button').click();
  assert.match(await page.locator('#toast').innerText(), /valid 0x address/);
  await page.locator('#ra').fill(owner);
  await page.locator('#rf button').click();
  await page.locator('#card').waitFor();
  await page.waitForFunction(() => document.querySelector('#card')?.src.startsWith('data:image/png;base64,'));
  assert.equal(await page.locator('[data-claim], #claimall').count(), 0);
  pass('Rewards address validation and read-only rewards view work');
  await page.locator('#sdl').scrollIntoViewIfNeeded();
  const downloadPromise = page.waitForEvent('download');
  await page.locator('#sdl').click();
  const download = await downloadPromise;
  assert.equal(download.suggestedFilename(), 'pepesfamily-rewards.png');
  const downloaded = await readFile(await download.path());
  assert.deepEqual([...downloaded.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.equal(downloaded.readUInt32BE(16), 1200);
  assert.equal(downloaded.readUInt32BE(20), 675);
  pass('Download saves a real PNG with the existing filename');
  await page.locator('#scp').click();
  await page.waitForFunction(() => document.querySelector('#toast').textContent.startsWith('Image copied:'));
  const copied = await page.evaluate(async () => {
    const items = await navigator.clipboard.read();
    const blob = await items[0].getType('image/png');
    return { type: blob.type, size: blob.size, bytes: [...new Uint8Array(await blob.arrayBuffer()).slice(0, 8)] };
  });
  assert.equal(copied.type, 'image/png');
  assert.ok(copied.size > 1000);
  assert.deepEqual(copied.bytes, [137, 80, 78, 71, 13, 10, 26, 10]);
  pass('Copy image writes an actual PNG to the Chromium clipboard without data: fetch', copied);
  await page.locator('#ssh').click();
  await page.waitForFunction(() => window.__shared.length === 1);
  let shares = await page.evaluate(() => window.__shared);
  assert.equal(shares[0].name, 'pepesfamily-rewards.png');
  assert.equal(shares[0].size, downloaded.length);
  const previousCard = await page.locator('#card').getAttribute('src');
  await page.locator('#sharepick').selectOption('0');
  await page.waitForFunction((previous) => document.querySelector('#card').src !== previous, previousCard);
  await page.locator('#ssh').click();
  await page.waitForFunction(() => window.__shared.length === 2);
  shares = await page.evaluate(() => window.__shared);
  assert.equal(shares.at(-1).name, 'pepesfamily-pepes.png');
  pass('Share passes the PNG File/text for all-token and per-token cards to a stubbed native share API');
  await page.locator('#card').scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'artifacts/rewards-share-390.png' });
  // Denied clipboard has an actionable fallback.
  await page.evaluate(() => Object.defineProperty(navigator.clipboard, 'write', { configurable: true, value: () => Promise.reject(new DOMException('Denied', 'NotAllowedError')) }));
  await page.locator('#scp').click();
  await page.waitForFunction(() => document.querySelector('#toast').textContent.includes('use Download image instead'));
  pass('Clipboard denial retains the Download image fallback');
  const violations = await page.evaluate(() => window.__violations);
  report.expectedLimitations = violations.filter((v) => v.uri.endsWith('/api/upload'));
  assert.deepEqual(violations.filter((v) => !v.uri.endsWith('/api/upload')), []);
  pass('No CSP violations from local scripts or image sharing; existing optional upload probe is blocked on HTTP preview');

  // Capture measured, opaque foreground/background pairs in both supported themes.
  for (const theme of ['light', 'dark']) {
    report.contrast.push(await page.evaluate((theme) => {
      document.documentElement.dataset.theme = theme;
      const rgb = (s) => s.match(/[\d.]+/g).slice(0, 3).map(Number);
      const luminance = (c) => rgb(c).map((n) => n / 255).map((n) => n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4).reduce((s, n, i) => s + n * [.2126, .7152, .0722][i], 0);
      const body = getComputedStyle(document.body), muted = getComputedStyle(document.querySelector('.hero p'));
      const bg = getComputedStyle(document.documentElement).backgroundColor;
      const ratio = (color) => { const a = luminance(color), b = luminance(bg); return (Math.max(a, b) + .05) / (Math.min(a, b) + .05); };
      return { theme, background: bg, text: body.color, textRatio: ratio(body.color), muted: muted.color, mutedRatio: ratio(muted.color) };
    }, theme));
  }
  assert.ok(report.contrast.every((p) => p.textRatio >= 4.5 && p.mutedRatio >= 4.5));
  pass('Measured primary/secondary text contrast in both themes exceeds 4.5:1');

  await page.goto(base + 'world/');
  await page.locator('#go').waitFor();
  assert.equal(await page.evaluate(() => THREE.REVISION), '160');
  assert.equal(await page.evaluate(() => document.querySelector('#c').width > 0), true);
  await page.screenshot({ path: 'artifacts/world-390.png' });
  for (const width of [320, 768, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width);
    assert.ok((await page.locator('#go').boundingBox()).y < 804);
    if (width === 1440) await page.screenshot({ path: 'artifacts/world-1440.png' });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('#go').click();
  assert.match(await page.locator('.err').innerText(), /wallet/i);
  await page.locator('#gatecard .logo').click();
  await page.locator('.hero .primary').waitFor();
  assert.equal(new URL(page.url()).pathname, '/preview/');
  pass('World loads local three.js/ethers, renders WebGL, handles no wallet, and links back under /preview/');
  assert.deepEqual(await page.evaluate(() => window.__violations), []);
  assert.deepEqual(report.unexpectedRpc, []);
  assert.deepEqual(report.console.filter((e) => e.type === 'pageerror'), []);
  assert.equal(report.failedRequests.filter((e) => !e.url.includes('/api/upload')).length, 0);
  report.result = 'passed';
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  report.result = 'failed';
  report.failure = error.stack;
  console.error(error);
  process.exitCode = 1;
} finally {
  await writeFile('artifacts/browser-results.json', JSON.stringify(report, null, 2) + '\n');
  await browser?.close();
  server.close();
}
