import { createHash } from 'node:crypto';

/** Shared record encoding for desktop verification, checkpoints and hosted delivery. */
export function createSourceHash() {
  const hash = createHash('sha256').update('AppYard source hash v2\0');
  return {
    update(filePath: string, contents: Uint8Array) {
      const name = Buffer.from(filePath, 'utf8');
      const lengths = Buffer.alloc(8);
      lengths.writeUInt32BE(name.length, 0);
      lengths.writeUInt32BE(contents.byteLength, 4);
      hash.update(lengths); hash.update(name); hash.update(contents);
    },
    digest() { return hash.digest('hex'); }
  };
}
