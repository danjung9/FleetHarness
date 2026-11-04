import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { extractFile, getRawHeader, uncache } from '@electron/asar';

/** Detect partial/corrupted application files, including concurrent compile races. */
export function checkPackagedIntegrity(archive) {
  // An upgrade replaces app.asar at the same path within this test process.
  uncache(archive);
  const header = getRawHeader(archive).header;
  const entries = new Map();
  function walk(directory, prefix = '') {
    for (const [name, entry] of Object.entries(directory.files ?? {})) {
      const relative = prefix ? prefix + '/' + name : name;
      if (entry.files) walk(entry, relative);
      else if (relative === 'package.json' || relative.startsWith('dist/') || relative.startsWith('dist-electron/')) entries.set(relative, entry);
    }
  }
  walk(header);
  const fail = (relative, reason) => { throw new Error(`Packaged integrity failed for ${relative}: ${reason}. Rebuild from stable, complete compiled output; do not compile or edit files while packaging.`); };
  for (const required of ['package.json', 'dist/index.html']) if (!entries.has(required)) fail(required, 'missing application file');
  for (const [relative, entry] of entries) {
    if (entry.link || entry.integrity?.algorithm !== 'SHA256' || !/^[a-f0-9]{64}$/.test(entry.integrity.hash)) fail(relative, 'missing SHA-256 integrity metadata');
    // extractFile follows ASAR's unpacked mapping for files such as package.json.
    let bytes;
    try { bytes = extractFile(archive, path.normalize(relative)); }
    catch (error) { fail(relative, String(error)); }
    if (bytes.length !== entry.size) fail(relative, `expected ${entry.size} bytes, read ${bytes.length}`);
    if (createHash('sha256').update(bytes).digest('hex') !== entry.integrity.hash) fail(relative, 'bytes do not match the archive SHA-256');
  }
  const metadata = JSON.parse(extractFile(archive, 'package.json'));
  if (typeof metadata.main !== 'string' || !entries.has(metadata.main.replaceAll('\\', '/'))) fail('package.json', 'main entry is missing from the validated application files');
  return { checkedFiles: entries.size, main: metadata.main };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (!process.argv[2]) throw new Error('Usage: node scripts/check-packaged-integrity.mjs <resources/app.asar>');
  console.log(JSON.stringify(checkPackagedIntegrity(path.resolve(process.argv[2])), null, 2));
}
