/** Host-created writable service state, retained across process restarts. Never deployment source. */
export const runtimeDataDirectory = '.runtime-data';

/** Names omitted at every depth from the verified source and exported bundle. */
export const artifactInventoryExclusions = ['node_modules', '.git', '.pi', '.DS_Store', runtimeDataDirectory] as const;
const excludedRuntimeSegments = new Set<string>(artifactInventoryExclusions.map(name => name.toLowerCase()));

/** Match complete portable path segments, including aliases on case-insensitive filesystems. */
export function isRuntimeDataPath(file: string) {
  return file.split(/[\\/]/).some(segment => segment.toLowerCase() === runtimeDataDirectory);
}

/** Root artifacts rewritten by the host after verification, outside the source digest. */
const hostWrittenArtifacts = new Set(['test-report.json', 'review.json', 'delivery.md']);

/** Applies to new plans and saved manifests at execution and delivery boundaries. */
export function assertRuntimeSourceFiles(files: unknown): asserts files is string[] {
  if (!Array.isArray(files) || !files.length || files.some(file => typeof file !== 'string')) {
    throw new Error('Runtime files must be a nonempty array of source file paths.');
  }
  for (const file of files) {
    if (isRuntimeDataPath(file)) {
      throw new Error(`Runtime files cannot include reserved writable state directory ${file}. Keep deployment source outside ${runtimeDataDirectory}/; create mutable application data there at runtime.`);
    }
    // Runtime dependencies must be present in both the approved source digest
    // and its export. Also reject case aliases on case-insensitive filesystems
    // and Windows separators in saved manifests checked directly at export.
    if (file.split(/[\\/]/).some((segment: string) => excludedRuntimeSegments.has(segment.toLowerCase()))) {
      throw new Error(`Runtime file ${file} is excluded from the artifact inventory and verified export. Move application code or data to an included path and create a new plan.`);
    }
    // Match root names only: data/review.json is ordinary application data.
    // A directory at a reserved root path would also prevent host publication.
    // Case-insensitive reservations also protect case-insensitive filesystems.
    if (hostWrittenArtifacts.has(file.split('/')[0].toLowerCase())) {
      throw new Error(`Runtime files cannot include host-written artifact ${file}. Move application data to a separate file and create a new plan.`);
    }
  }
  // A declared source file cannot also be a directory for another file. Build
  // the complete index first so the check does not depend on manifest order.
  // Saved manifests can reach this boundary without the portable-path parser.
  const names = new Map<string, string>();
  for (const file of files) {
    const name = file.replaceAll('\\', '/').toLowerCase();
    const previous = names.get(name);
    if (previous !== undefined) {
      throw new Error(`Runtime files cannot contain case-insensitive path collisions: ${previous} and ${file}. Declare each source file once and create a new plan.`);
    }
    names.set(name, file);
  }
  for (const [name, file] of names) {
    for (let slash = name.indexOf('/'); slash !== -1; slash = name.indexOf('/', slash + 1)) {
      const ancestor = names.get(name.slice(0, slash));
      if (ancestor !== undefined) {
        throw new Error(`Runtime file path conflict: ${ancestor} is also a parent directory of ${file}. Declare only files with distinct paths and create a new plan.`);
      }
    }
  }
}
