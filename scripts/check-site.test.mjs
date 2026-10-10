import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { Script, runInNewContext } from 'node:vm';

const root = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root));
const text = (path) => read(path).toString();
const pages = ['index.html', 'world/index.html'];
const lock = JSON.parse(text('web/vendor/dependencies.lock.json'));

test('vendored runtime bytes match the original cdnjs SHA-512 SRI and lockfile', () => {
  for (const dependency of lock.dependencies) {
    const bytes = read(`web/vendor/${dependency.file}`);
    assert.equal(bytes.length, dependency.bytes);
    assert.equal('sha512-' + createHash('sha512').update(bytes).digest('base64'), dependency.integrity);
    assert.ok(read(`web/vendor/${dependency.licenseFile}`).length > 100);
  }
  for (const page of pages) {
    const html = text(`web/${page}`);
    assert.match(html, /script-src 'self' 'unsafe-inline';/);
    assert.doesNotMatch(html, /cdnjs\.cloudflare\.com/);
    for (const match of html.matchAll(/<script\s+src="([^"]+)"([^>]*)>/g)) {
      assert.ok(!match[1].startsWith('/') && !match[1].includes('://'));
      const dependency = lock.dependencies.find((d) => match[1].endsWith('/' + d.file));
      if (dependency) assert.ok(match[2].includes(`integrity="${dependency.integrity}"`));
      assert.ok(readFileSync(new URL(match[1], new URL(`web/${page}`, root))).length);
    }
  }
});

test('production export is byte-for-byte complete and contains no server/dependency packaging', () => {
  function walk(path) {
    return readdirSync(new URL(path, root), { withFileTypes: true }).flatMap((entry) => {
      if (entry.name === 'api' || entry.name === 'vercel.json') return [];
      const next = `${path}/${entry.name}`;
      return entry.isDirectory() ? walk(next) : [next];
    });
  }
  const sources = walk('web');
  assert.deepEqual(walk('dist').map((p) => p.slice(5)).sort(), sources.map((p) => p.slice(4)).sort());
  for (const source of sources) {
    assert.deepEqual(read(source), read(source.replace(/^web\//, 'dist/')), source);
    assert.doesNotMatch(source, /node_modules|\.tgz$|package-lock\.json/);
  }
});

test('both pages have metadata and relative local asset/navigation URLs', () => {
  for (const page of pages) {
    const html = text(`dist/${page}`);
    for (const required of ['<title>', 'name="description"', 'rel="icon"', 'property="og:title"', 'property="og:image"']) {
      assert.ok(html.includes(required), `${page}: ${required}`);
    }
    assert.doesNotMatch(html, /(?:src|href)="\//);
    const og = html.match(/property="og:image" content="([^"]+)"/)[1];
    assert.ok(readFileSync(new URL(og, new URL(`dist/${page}`, root))).length);
  }
});

test('all first-party browser scripts parse', () => {
  for (const page of pages) {
    for (const match of text(`web/${page}`).matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)) {
      new Script(match[1], { filename: page });
    }
  }
  new Script(text('web/share-image.js'), { filename: 'share-image.js' });
});

const decode = runInNewContext(text('web/share-image.js') + '\nshareImageBlob;', {
  atob, Blob, Uint8Array,
  fetch() { throw new Error('The share image decoder must not use fetch'); },
});

test('PNG data URL conversion preserves every byte, MIME type, and file contents without fetch', async () => {
  const bytes = Uint8Array.from({ length: 256 }, (_, i) => i);
  const blob = decode('data:image/png;base64,' + Buffer.from(bytes).toString('base64'));
  assert.equal(blob.type, 'image/png');
  assert.deepEqual(new Uint8Array(await blob.arrayBuffer()), bytes);
  const file = new File([blob], 'pepesfamily-rewards.png', { type: 'image/png' });
  assert.equal(file.name, 'pepesfamily-rewards.png');
  assert.equal(file.type, 'image/png');
  assert.deepEqual(new Uint8Array(await file.arrayBuffer()), bytes);
});

test('decoder rejects unexpected formats and corrupt base64', () => {
  for (const url of ['https://example.com/image.png', 'data:image/jpeg;base64,YQ==', 'data:image/png;base64,%%%']) {
    assert.throws(() => decode(url));
  }
});

test('both share controls use the local decoder; CSP does not permit data: connections', () => {
  const html = text('web/index.html');
  assert.ok(html.includes('const blob = () => shareImageBlob(url);'));
  assert.ok(html.includes('new ClipboardItem({ "image/png": blob() })'));
  assert.ok(html.includes('new File([await blob()], file, { type: "image/png" })'));
  assert.doesNotMatch(html.match(/connect-src ([^;]+)/)[1], /data:/);
  assert.doesNotMatch(html, /fetch\(url\)\.then\(\(x\) => x\.blob\(\)\)/);
});
