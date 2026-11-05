import { createHash } from 'node:crypto';

/** Callers validate and sort the allowlist before adding its ordinary files. */
export function createRuntimeFilesHasher() {
  const hash = createHash('sha256').update('fleetharness-runtime-files-v2\0');
  return {
    add(file: string, bytes: Uint8Array) {
      const name = Buffer.from(file, 'utf8'), lengths = Buffer.alloc(16);
      // Delimiters can occur in binary contents. Explicit byte lengths bind
      // each path and its contents without interpreting application data.
      lengths.writeBigUInt64BE(BigInt(name.length), 0);
      lengths.writeBigUInt64BE(BigInt(bytes.byteLength), 8);
      hash.update(lengths).update(name).update(bytes);
    },
    digest: () => hash.digest('hex'),
  };
}
