// Run the existing production build without installing packages or writing a root lockfile.
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const root = new URL('../', import.meta.url);
const manifest = JSON.parse(readFileSync(new URL('package.json', root), 'utf8'));
execSync(manifest.scripts.build, { cwd: root, stdio: 'inherit' });
console.log('Production export built in dist/ using package.json scripts.build.');
