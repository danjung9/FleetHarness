import { copyFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const destinations = {
  'build/icon.png': 'app-icon-1024.png',
  'build/icon.icns': 'app-icon.icns',
  'src/assets/brand/mark-gold.svg': 'mark-gold.svg',
  'src/assets/brand/logo-on-dark.svg': 'logo-on-dark.svg',
  'public/favicon.svg': 'favicon.svg',
  'public/favicon.ico': 'favicon.ico',
  'public/favicon-16.png': 'favicon-16.png',
  'public/favicon-32.png': 'favicon-32.png',
  'public/favicon-48.png': 'favicon-48.png',
  'public/apple-touch-icon.png': 'apple-touch-icon.png',
  'public/app-icon-192.png': 'app-icon-192.png',
  'public/app-icon-512.png': 'app-icon-512.png',
};

for (const [target, asset] of Object.entries(destinations)) {
  const output = new URL(target, root);
  await mkdir(new URL('./', output), { recursive: true });
  await copyFile(new URL('branding/' + asset, root), output);
}

await writeFile(new URL('build/icon.png.json', root), JSON.stringify({
  origin: 'AppYard anchor artwork supplied in the partner handoff, preserved in branding/.',
  authoring: 'Vector anchor with an app-shaped eye; navy #081F35 and gold #E1B75B.',
  regenerate: 'npm run icons copies the checked-in master assets into web, UI, and desktop locations.'
}, null, 2) + '\n');
console.log('AppYard brand assets updated in ' + fileURLToPath(root));
