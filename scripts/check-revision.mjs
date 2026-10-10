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
const extraABI = runInNewContext(source.slice(source.indexOf('const KEY_T ='), source.indexOf('/// v4: rewards')) + '\n[...QUOTER_ABI, ...EARN_ABI, ...MIRROR_ABI, ...RENDERER_ABI]');
const iface = new Interface([...padABI, ...extraABI,
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
const baseline = process.argv.includes('--baseline');
let empty = false, outage = false, noCode = false, delayToken = 0, failToken = false;
const ethereumPad = '0xa89083083119B70c06b372dC85Dc6155a8F568CC'.toLowerCase();
const ethereumLens = '0xfda1aD95068d23b8491D0787Cc374767b0c67864'.toLowerCase();
const earn = '0xf2363c208B1772C3c9dB7a3fe84d75Bf2881fc20';
const second = '0x072Fb5A1B65F30d59BcD11BEeD99803675bCE8CC'; // existing address, fixture identity only
const ethToken = [...token]; ethToken[0] = second; ethToken[1] = 'Ethereum fixture'; ethToken[2] = 'TEST'; ethToken[4] = '0xD34a99Bc0f67aE1bbd63C660e6d0b0dd03E263B7';
const fixtureMeta = 'data:application/json;base64,' + Buffer.from(JSON.stringify({name:'Pepes Earn IMD #1 (fixture)', image:'data:image/svg+xml;base64,' + Buffer.from(fixtureArt).toString('base64'), attributes:[{trait_type:'Test',value:'Fixture'}]})).toString('base64');
function rpc(call) {
  const { method, params = [], id } = call;
  let result;
  if (outage || (failToken && method === 'eth_call' && iface.parseTransaction({data:params[0].data})?.name === 'getTokenInfo')) return {jsonrpc:'2.0',id,error:{code:-32000,message:'Review fixture: RPC unavailable'}};
  if (method === 'eth_getCode') result = noCode ? '0x' : '0x01';
  else if (method === 'eth_chainId') result = '0x1237';
  else if (method === 'eth_blockNumber') result = '0x1';
  else if (method === 'eth_getLogs') result = [];
  else if (method === 'eth_call') {
    const tx = iface.parseTransaction({ data: params[0].data });
    if (!tx) throw new Error('Unimplemented fixture selector: ' + params[0].data.slice(0, 10));
    const values = {
      tokenCount: [!empty && [v1, ethereumPad].includes(params[0].to.toLowerCase()) ? 1 : 0],
      getTokens: [empty ? [] : params[0].to.toLowerCase() === v1 ? [token] : params[0].to.toLowerCase() === ethereumLens ? [ethToken] : []],
      getTokenInfo: [(tx.name === 'getTokenInfo' ? String(tx.args[0]).toLowerCase() : '') === earn.toLowerCase() ? [earn, 'Pepes Earn IMD', 'EARN', ...token.slice(3)] : (tx.name === 'getTokenInfo' ? String(tx.args[0]).toLowerCase() : '') === second.toLowerCase() ? ethToken : token],
      poolKey: [[ZeroAddress, imd, 10000, 200, ZeroAddress]], quoteExactInputSingle: [10n ** 18n, 1], quoteExactOutputSingle: [10n ** 18n, 1],
      totalPepesBurned: [0], buybackReserve:[0], totalRecycled:[0], ownerAt:[owner], tokenURI:[fixtureMeta], pendingCreatorFees:[0],
      getSlot0: [BigInt(Math.floor(Math.sqrt(tx.name === 'getSlot0' && tx.args[0] === ethUsdPool ? 2500 / 1e12 : 2500 / 7.75) * 2 ** 96)), 0, 0, 0],
      startTick: [0],
      owner: [owner], feeRecipient: [owner], creatorPayout: [owner], pendingCreatorPayout: [ZeroAddress],
      pendingProtocolFees: [0], feeSplit: [0, 300, 0], totalBurned: [0], pendingBurn: [0],
      balanceOf: [100n * 10n ** 18n], withdrawableDividendOf: [123n * 10n ** 18n], withdrawnDividends: [0],
      totalSupply: [12], hasPass: [false], passPrice: [100000n * 10n ** 18n],
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
const shots = baseline ? 'artifacts/revision-before' : 'artifacts/revision-after';
await mkdir(shots, { recursive:true });
let browser;
const report = { fixtureData: true, checks: [], viewports: [], console: [], failedRequests: [], unexpectedRpc: [], contrast: [] };
function pass(name, details) {
  report.checks.push({ name, result: 'passed', ...(details ? { details } : {}) });
  console.log('PASS: ' + name);
}
try {
  browser = await chromium.launch({ headless: true, executablePath: process.env.PEPES_CHROMIUM, args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  report.browser = browser.version();
  report.baseline = baseline;
  const context = await browser.newContext({ viewport: { width:390, height:844 }, colorScheme:'light', reducedMotion:'reduce' });
  const base = `http://127.0.0.1:${server.address().port}/preview/`;
  await context.route('**/*', async route => {
    const req = route.request(), url = req.url();
    if (url.startsWith(base)) return route.continue();
    if (url.includes('publicnode.com')) {
      try {
        const body = req.postDataJSON();
        const calls = Array.isArray(body) ? body : [body];
        if (delayToken && calls.some(c => c.method === 'eth_call' && iface.parseTransaction({data:c.params[0].data})?.name === 'getTokenInfo')) await new Promise(r => setTimeout(r, delayToken));
        const results = calls.map(rpc);
        return route.fulfill({json:Array.isArray(body) ? results : results[0]});
      } catch (e) { report.unexpectedRpc.push(e.message); return route.fulfill({status:500,body:e.message}); }
    }
    if (url.includes('blockscout.com/api/')) return route.fulfill({json:{items:[], next_page_params:null}});
    if (url.startsWith('https://fonts.googleapis.com/')) return route.fulfill({contentType:'text/css',body:''});
    return route.abort('blockedbyclient');
  });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.on('pageerror', e => report.console.push({type:'pageerror',message:e.message}));
  page.on('requestfailed', req => report.failedRequests.push({url:req.url(),error:req.failure()?.errorText}));
  const open = async (hash, selector) => { await page.goto(base + hash); await page.locator(selector).first().waitFor(); };
  const top = async () => page.evaluate(() => scrollTo(0, 0));
  const rect = async sel => page.locator(sel).first().evaluate(el => { const r=el.getBoundingClientRect(); return {top:r.top,bottom:r.bottom,left:r.left,width:r.width,height:r.height}; });
  const shot = async name => page.screenshot({path:`${shots}/${name}.png`});

  await open('#/t/' + pepes, '#trade');
  for (const [width,height] of [[390,844],[320,700],[768,844],[860,844],[1440,900]]) {
    await page.setViewportSize({width,height}); await top();
    const metrics={width,height,amount:await rect('#amt'),trade:await rect('#trade'),chart:await rect('#chart'),scrollWidth:await page.evaluate(()=>document.documentElement.scrollWidth)};
    report.viewports.push({page:'token',...metrics});
    assert.equal(metrics.scrollWidth,width);
    if (width<=390) assert.equal(metrics.trade.bottom<=height-40,!baseline);
    if ([320,390,1440].includes(width)) await shot('token-'+width);
  }
  pass(baseline ? 'Reproduced token action below phone screen' : 'Token action on first phone screen; desktop columns preserved');
  if (!baseline) {
    await page.locator('.tabs [data-s="sell"]').click();
    assert.match(await page.locator('#amtl').innerText(), /PEPES/);
    await page.locator('.tabs [data-s="buy"]').click();
    await page.locator('#via [data-v="imd"]').click();
    await page.locator('#quick button').nth(1).click();
    assert.equal(await page.locator('#amt').inputValue(), '5');
    await page.waitForFunction(() => document.querySelector('#pv').textContent.includes('You receive'));
    await page.locator('#trade').click();
    await page.waitForFunction(() => document.querySelector('#toast').textContent.includes('Connect a wallet first'));
    pass('Reordered token card retains buy/sell, payment currency, quick amount, quote and no-wallet feedback');
  }

  await page.setViewportSize({width:390,height:844});
  await open('#/nft','#ntrade'); await page.locator('#browse img').first().waitFor(); await top();
  const nft={trade:await rect('#ntrade'),collection:await rect('#browse'),amount:await rect('#ncount')};
  report.viewports.push({page:'nft',width:390,...nft});
  assert.equal(nft.trade.bottom<=804,!baseline); await shot('nft-390');
  if (!baseline) {
    for (const [width,height] of [[320,700],[768,844],[860,844],[1440,900]]) {
      await page.setViewportSize({width,height}); await top();
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width);
      const r=await rect('#ntrade'); report.viewports.push({page:'nft',width,height,trade:r});
      if(width===320) assert.ok(r.bottom<=660);
      if(width===1440) await shot('nft-1440');
    }
    await page.setViewportSize({width:390,height:844});
  }
  pass(baseline ? 'Reproduced collection hiding NFT action' : 'NFT action precedes collection and fits first phone screen');
  if (!baseline) {
    await page.locator('.tabs [data-s="sell"]').click();
    assert.match(await page.locator('#ncountl').innerText(), /sell/);
    await page.locator('.tabs [data-s="buy"]').click();
    await page.locator('#nvia [data-v="imd"]').click();
    await page.locator('#nquick button').nth(1).click();
    assert.equal(await page.locator('#ncount').inputValue(), '5');
    await page.waitForFunction(() => document.querySelector('#npv').textContent.includes('for 5 NFTs'));
    await page.locator('#ntrade').click();
    await page.waitForFunction(() => document.querySelector('#toast').textContent.includes('Connect a wallet first'));
    pass('Reordered NFT card retains count, buy/sell, currency, quote and no-wallet feedback');
  }

  const tile=page.locator('#browse [data-nft="1"]'); await tile.focus(); await page.keyboard.press('Enter');
  await page.locator('.modal #nftinfo table').waitFor();
  const focusInside=await page.evaluate(()=>document.activeElement.closest('.modal')!==null);
  assert.equal(focusInside,!baseline);
  if (!baseline) {
    assert.equal(await page.locator('.modal').getAttribute('role'),'dialog');
    assert.equal(await page.locator('.modal').getAttribute('aria-modal'),'true');
    assert.ok(await page.locator('.modal').getAttribute('aria-label'));
    assert.equal(await page.locator('#browse [data-nft="2"]').evaluate(el=>{el.focus();return el===document.activeElement}),false);
    for(const key of ['Tab','Tab','Tab','Tab','Shift+Tab','Shift+Tab','Shift+Tab']) {
      await page.keyboard.press(key); assert.ok(await page.evaluate(()=>!!document.activeElement.closest('.modal')));
    }
    await shot('nft-dialog-focus-390');
  }
  await page.keyboard.press('Escape'); assert.equal(await page.locator('.modal').count(),baseline?1:0);
  if(baseline) { await shot('nft-dialog-390'); await page.locator('.modal [data-close]').click(); }
  else {
    assert.equal(await tile.evaluate(el=>el===document.activeElement),true);
    for(const close of ['button','backdrop']) {
      await tile.press('Enter'); await page.locator('.modal [data-close]').waitFor();
      if(close==='button') await page.locator('.modal [data-close]').click();
      else await page.locator('.modal').click({position:{x:2,y:2}});
      assert.equal(await tile.evaluate(el=>el===document.activeElement),true);
      assert.equal(await tile.evaluate(el=>{el.focus();return el===document.activeElement}),true);
    }
  }
  pass(baseline?'Reproduced missing NFT dialog focus/Escape':'NFT dialog label, trap, inert background and focus return on all close paths');

  await open('#/create','#n');
  await page.locator('#presets [data-p="burn"]').click();
  const launch=await page.locator('#app').innerText();
  assert.match(await page.locator('#splitnote').innerText(),/3% burned/);
  assert.equal(launch.includes('Holders earn their 3% in IMD'),baseline);
  if(!baseline) assert.match(launch,/Choose below how the 3% is split/);
  await shot('launch-burn-390');
  await open('#/rewards','.hero p');
  assert.equal((await page.locator('.hero p').innerText()).includes('3% holder fee'),baseline);
  empty=true; await open('#/rewards/'+owner,'#rw .empty');
  assert.equal((await page.locator('#rw').innerText()).includes('earn 3% of every trade'),baseline); empty=false;
  pass(baseline?'Reproduced contradictory launch and rewards copy':'Launch/rewards copy reflects configurable holder allocation');

  await open('','#list .tcard');
  const badge=page.locator('.tcard .pill.chain').first();
  const contrast=await badge.evaluate(el=>{
    const fg=getComputedStyle(el).color, bg=getComputedStyle(el.closest('.card')).backgroundColor;
    const L=s=>s.match(/[\d.]+/g).slice(0,3).map(Number).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((a,b,i)=>a+b*[.2126,.7152,.0722][i],0);
    const a=L(fg),b=L(bg);return {fg,bg,ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05),fontSize:getComputedStyle(el).fontSize};
  });
  report.contrast.push(contrast); assert.equal(contrast.ratio>=4.5,!baseline);
  pass(baseline?'Reproduced Ethereum badge contrast below 4.5':'Ethereum badge uses readable text token',contrast);

  // Render genuine feed entries through its normal Blockscout parsing path.
  await context.route('**/*blockscout.com/api/**', async route=>{
    const event=iface.getEvent('Trade');
    const items=Array.from({length:20},(_,i)=>{
      const e=iface.encodeEventLog(event,[pepes,owner,i%2===0,10n**18n,100n*10n**18n,4n*10n**16n,2n**96n]);
      return {...e,transaction_hash:ZeroHash,index:i,block_timestamp:new Date(Date.now()-i*1000).toISOString()};
    });
    return route.fulfill({json:{items,next_page_params:null}});
  });
  await open('','#scr-log a.ln:visible'); await page.locator('.scene').scrollIntoViewIfNeeded();
  const rows=await page.locator('#scr-log').evaluate(el=>{
    const r=el.getBoundingClientRect(); return {height:r.height,rows:[...el.querySelectorAll('a.ln')].filter(a=>!a.hidden).map(a=>{const b=a.getBoundingClientRect();return {height:b.height,top:b.top-r.top,bottom:b.bottom-r.top};})};
  });
  report.terminal=rows;
  assert.equal(rows.rows.every(r=>r.height>=24&&r.top>=0&&r.bottom<=rows.height+.1),!baseline);
  await shot('terminal-390');
  pass(baseline?'Reproduced crowded and clipped live feed rows':'Feed renders only complete rows with at least 24px targets',rows);

  await open('','#list .tcard'); delayToken=2000;
  await page.locator(`.tcard[href="#/t/${pepes}"]`).click();
  await page.locator('nav [data-nav="/create"]').click();
  await page.locator('#n').fill('KEEP MY FORM');
  await page.waitForTimeout(2600);
  assert.equal(new URL(page.url()).hash,'#/create');
  assert.equal(await page.locator('#n').count(),baseline?0:1);
  if(!baseline) assert.equal(await page.locator('#n').inputValue(),'KEEP MY FORM');
  await shot('route-race-390'); delayToken=0;
  pass(baseline?'Reproduced delayed token read erasing Launch':'Delayed token read cannot replace Launch or its entered values');
  if (!baseline) {
    failToken=true; delayToken=2000;
    await page.locator('nav [data-nav="/"]').click(); await page.locator('#list .tcard').first().waitFor();
    await page.locator(`.tcard[href="#/t/${pepes}"]`).click();
    await page.locator('nav [data-nav="/create"]').click(); await page.locator('#n').fill('KEEP AFTER NOT FOUND');
    await page.waitForTimeout(2600);
    assert.equal(await page.locator('#n').inputValue(),'KEEP AFTER NOT FOUND'); failToken=false;delayToken=0;
    pass('Delayed token-not-found response preserves the next route');

    await context.route('**/*blockscout.com/api/**',async route=>{
      await new Promise(r=>setTimeout(r,2000));
      return route.fulfill({json:{items:[],next_page_params:null}});
    });
    await open('#/t/'+pepes,'#trade');
    await page.locator('nav [data-nav="/create"]').click(); await page.locator('#n').fill('KEEP AFTER HISTORY');
    await page.waitForTimeout(2600);
    assert.equal(await page.locator('#n').inputValue(),'KEEP AFTER HISTORY');
    pass('Delayed trade history cannot write into a later route');
  }

  outage=true; await open('','#app .card');
  const setup=await page.locator('#app').innerText(); report.outage=setup;
  assert.equal(setup.includes('Not deployed yet'),baseline);
  if(!baseline) {
    assert.match(setup,/Could not reach the chain\. Reload to try again\./);
    await shot('outage-390');
    outage=false; await page.locator('#app button').click(); await page.locator('#list .tcard').first().waitFor();
    noCode=true; await open('','#app .card'); assert.match(await page.locator('#app').innerText(),/Not deployed yet/); noCode=false;
  }
  await shot('setup-390'); outage=false;
  pass(baseline?'Reproduced outage misreported as missing deployment':'Outage has Reload recovery; successful empty-code reads retain deployment state');

  await open('world/','#go');
  const motion=()=>page.evaluate(()=>({world:world.quaternion.toArray(),clouds:clouds.rotation.y,reduce:matchMedia('(prefers-reduced-motion: reduce)').matches}));
  const a=await motion(); await page.waitForTimeout(700); const b=await motion();
  report.motion={before:a,after:b}; assert.equal(JSON.stringify(a)===JSON.stringify(b),!baseline);
  if(!baseline) {
    await page.emulateMedia({reducedMotion:'no-preference'});const c=await motion();await page.waitForTimeout(350);const d=await motion();assert.notDeepEqual(c.world,d.world);
    await page.emulateMedia({reducedMotion:'reduce'});const e=await motion();await page.waitForTimeout(350);assert.deepEqual(await motion(),e);
  }
  await shot('world-reduced-390');
  pass(baseline?'Reproduced World motion under reduced motion':'World idle motion stops and responds to preference changes');
  assert.deepEqual(report.unexpectedRpc,[]);
  if(!baseline) assert.deepEqual(report.console,[]);
  report.result='passed';
} catch(e) { report.result='failed';report.failure=e.stack;console.error(e);process.exitCode=1; }
finally {
  await writeFile(`artifacts/revision-${baseline?'before':'after'}.json`,JSON.stringify(report,null,2)+'\n');
  await browser?.close();server.close();
}
