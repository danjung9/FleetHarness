import { writeFile } from 'node:fs/promises';
import { fetchNorfolkSnapshot } from '../harness/norfolk.ts';

const snapshot = await fetchNorfolkSnapshot();
await writeFile(new URL('../harness/norfolk-snapshot.ts', import.meta.url),
  '// Generated from the official Norfolk API. Refresh with npm run sync:norfolk.\n' +
  'import type { NorfolkSnapshot } from "./norfolk.js";\n' +
  'export const norfolkSnapshot: NorfolkSnapshot = ' + JSON.stringify(snapshot, null, 2) + ';\n');
console.log(`Saved ${snapshot.useCases.length} Norfolk challenges (${snapshot.fetchedAt}).`);
