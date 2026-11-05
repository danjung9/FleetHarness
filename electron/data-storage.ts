import { constants, promises as fs, type Dirent, type Stats } from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import type { Store } from './storage.js';
import { stageDefinitions, type Project } from '../shared/types.js';
import type { StorageFile, StorageItem, StorageKind, StorageOverview, StoragePreview, StorageTrashItem } from '../shared/data-storage.js';

/** These identities come from the host learning database, never from renderer paths. */
export interface StorageCandidateOwner {
  projectId: string; workspace?: string; scopedProjectId?: string; experimentId?: string; name?: string; protected?: boolean;
}
export interface DataStorageOptions {
  store: Store;
  isActive(projectId: string): boolean;
  /** Reserve this project before awaiting preview shutdown; release in the returned callback. */
  beforeMutation(projectId: string): Promise<void | (() => void)>;
  changed(): void;
  candidateProjects?(): StorageCandidateOwner[];
}
interface Item extends StorageItem { relative: string; stamp: string }
interface TrashRecord extends StorageTrashItem {
  version: 1; original: string; itemRelative: string; itemKind: StorageKind;
  phase: 'prepared' | 'ready' | 'restored' | 'deleting';
}
interface CreatedEntry { relative: string; stat: Stats }
class StorageRootChangedError extends Error {
  constructor() { super('AppYard’s storage folder moved or was replaced. Restart the app after restoring its original location. No further files were changed.'); }
}
interface WalkResult { bytes: number; fileCount: number; updatedAt: number; links: number; special: number; incomplete: boolean; revision: string }
interface Inventory { items: Item[]; records: TrashRecord[]; warnings: Set<string>; key: string }
const missing = (error: unknown) => (error as NodeJS.ErrnoException).code === 'ENOENT';
const within = (parent: string, child: string) => child === parent || child.startsWith(parent + path.sep);
const uuidPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const itemId = (relative: string) => createHash('sha256').update('appyard-storage-v1\0' + relative).digest('hex');
const textLimit = 1024 * 1024;
const imageLimit = 8 * 1024 * 1024;
const measurementFreshness = 2_000;
const measurementConcurrency = 16;

/** Logical file bytes include dependency folders. Symbolic links are never followed. */
export class DataStorageService {
  private root = '';
  private configuredRoot = '';
  private rootAncestors: { path: string; dev: number; ino: number; linkTarget?: string }[] = [];
  private pending: Promise<unknown> = Promise.resolve();
  private initializing?: Promise<void>;
  private recoveryWarnings: string[] = [];
  private measurements = new Map<string, WalkResult>();
  private trashMeasurements = new Map<string, number>();
  private measuredTotals?: { trashBytes: number; otherBytes: number; measuredAt: string; completedAt: number; key: string; warnings: string[] };
  private measuring?: Promise<void>;
  private measurementGeneration = 0;
  private measurementStale = true;
  private measurementError?: string;
  private mutating = false;
  constructor(readonly options: DataStorageOptions) {}

  init(): Promise<void> {
    this.initializing ??= this.initialize();
    return this.initializing;
  }
  private async initialize() {
    this.configuredRoot = path.resolve(this.options.store.root);
    this.root = await fs.realpath(this.configuredRoot);
    const rootStat = await fs.lstat(this.root);
    if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) throw new Error('Storage requires an ordinary app data folder.');
    // Store.save still uses its configured pathname. Pin any pre-existing alias
    // and each lexical ancestor as well as the canonical data directory.
    for (const base of new Set([this.root, this.configuredRoot])) {
      let ancestor = base;
      for (;;) {
        if (!this.rootAncestors.some(entry => entry.path === ancestor)) {
          const stat = await fs.lstat(ancestor);
          if (!stat.isDirectory() && !stat.isSymbolicLink()) throw new StorageRootChangedError();
          this.rootAncestors.push({ path: ancestor, dev: stat.dev, ino: stat.ino,
            ...(stat.isSymbolicLink() ? { linkTarget: await fs.readlink(ancestor) } : {}) });
        }
        const parent = path.dirname(ancestor); if (parent === ancestor) break; ancestor = parent;
      }
    }
    await this.mkdir('storage-trash');
    const { records, warnings } = await this.readTrash();
    this.recoveryWarnings = warnings;
    for (const record of records) {
      try {
        const payload = await this.exists(`storage-trash/${record.id}/payload`);
        const original = await this.exists(record.original);
        if (record.phase === 'deleting' || record.phase === 'restored') {
          // Only an explicitly confirmed deletion can enter this phase.
          await this.removeTrashPayload(record.id);
          await this.removeRecord(record.id);
        } else if (payload) {
          if (record.phase === 'prepared') {
            await this.invalidate(record.projectId, record.itemRelative, record.itemKind, record.original === record.itemRelative);
            await this.writeRecord({ ...record, phase: 'ready' });
          }
        } else if (original) {
          // A crash before the move, or after restore, leaves no trashed bytes.
          await this.removeRecord(record.id);
        } else {
          this.recoveryWarnings.push(`A trash record for “${record.name}” has no recoverable files. Its record was preserved.`);
        }
      } catch (error) {
        if (error instanceof StorageRootChangedError) throw error;
        this.recoveryWarnings.push(`“${record.name}” could not be recovered automatically. Its saved files were preserved.`);
      }
    }
  }
  private validRelative(relative: unknown): asserts relative is string {
    if (typeof relative !== 'string' || !relative || relative.includes('\0') || relative.includes('\\') || path.posix.isAbsolute(relative)
      || relative.split('/').some(part => !part || part === '.' || part === '..')) throw new Error('Choose a file inside its storage folder.');
  }
  private absolute(relative: string) {
    this.validRelative(relative);
    return path.join(this.root, ...relative.split('/'));
  }
  /** Pin the trusted root and its ancestors, rather than trusting its pathname after init. */
  private async assertRoot() {
    if (path.resolve(this.options.store.root) !== this.configuredRoot) throw new StorageRootChangedError();
    try { if (await fs.realpath(this.configuredRoot) !== this.root) throw new StorageRootChangedError(); }
    catch { throw new StorageRootChangedError(); }
    for (const ancestor of this.rootAncestors) {
      let stat: Stats;
      try { stat = await fs.lstat(ancestor.path); } catch { throw new StorageRootChangedError(); }
      if (stat.dev !== ancestor.dev || stat.ino !== ancestor.ino) throw new StorageRootChangedError();
      if (ancestor.linkTarget !== undefined) {
        try { if (!stat.isSymbolicLink() || await fs.readlink(ancestor.path) !== ancestor.linkTarget) throw new StorageRootChangedError(); }
        catch { throw new StorageRootChangedError(); }
      } else if (!stat.isDirectory() || stat.isSymbolicLink()) throw new StorageRootChangedError();
    }
  }
  /** Reject every symlink ancestor, including a folder swapped after discovery. */
  private async guard(relative: string, allowMissing = false): Promise<string> {
    this.validRelative(relative);
    await this.assertRoot();
    let current = this.root;
    for (const part of relative.split('/')) {
      current = path.join(current, part);
      try {
        const stat = await fs.lstat(current);
        if (stat.isSymbolicLink()) throw new Error('Linked files and folders cannot be managed here.');
      } catch (error) { if (allowMissing && missing(error)) { await this.assertRoot(); return this.absolute(relative); } throw error; }
    }
    await this.assertRoot();
    return current;
  }
  private async exists(relative: string) {
    try { await this.guard(relative); return true; } catch (error) { if (missing(error)) return false; throw error; }
  }
  private async mkdir(relative: string) {
    this.validRelative(relative);
    let current = '';
    for (const part of relative.split('/')) {
      current = current ? `${current}/${part}` : part;
      try { await fs.mkdir(await this.guard(current, true), { mode: 0o700 }); }
      catch (error) { if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error; }
      const target = await this.guard(current), stat = await fs.lstat(target);
      if (!stat.isDirectory()) throw new Error('A storage folder was replaced by a file.');
    }
  }
  private managedItem(relative: string, kind: StorageKind) {
    const parts = relative.split('/');
    if (kind === 'sessions') return (parts.length === 2 && parts[0] === 'sessions')
      || (parts.length === 3 && parts[0] === 'learning' && parts[1] === 'sessions');
    return (parts.length === 3 && parts[0] === 'workspaces')
      || (parts.length === 4 && parts[0] === 'learning' && parts[1] === 'workspaces')
      || (parts.length === 4 && parts[0] === 'experiments' && parts[2] === 'candidates')
      || (parts.length === 5 && parts[0] === 'learning' && parts[1] === 'experiments' && parts[3] === 'candidates');
  }
  private workspaceRelative(workspace: string | undefined) {
    if (!workspace) return undefined;
    const relative = path.relative(path.resolve(this.options.store.root), path.resolve(workspace));
    if (!relative || relative.startsWith('..' + path.sep) || path.isAbsolute(relative)) return undefined;
    return relative.split(path.sep).join('/');
  }
  private async directories(relative: string, warnings: Set<string>) {
    try {
      const target = await this.guard(relative);
      const entries = await fs.readdir(target, { withFileTypes: true });
      if (entries.some(entry => entry.isSymbolicLink())) warnings.add('Symbolic links are excluded from browsing and cleanup. Their targets are never counted or followed.');
      return entries.filter(entry => entry.isDirectory() && !entry.isSymbolicLink()).map(entry => entry.name).sort();
    } catch (error) {
      if (error instanceof StorageRootChangedError) throw error;
      if (!missing(error)) warnings.add(`Could not inspect ${relative}. Its files are preserved and may be missing from the inventory.`);
      return [];
    }
  }
  private async discover(warnings = new Set<string>()): Promise<Item[]> {
    const projects = this.options.store.state.projects;
    const owners = this.options.candidateProjects?.() ?? [];
    const items: Item[] = [];
    const add = async (relative: string, kind: StorageKind, scopedProjectId: string, runId?: string, experimentId?: string) => {
      try {
        const target = await this.guard(relative), stat = await fs.lstat(target);
        if (!stat.isDirectory()) return;
        const owner = owners.find(owner => this.workspaceRelative(owner.workspace) === relative)
          ?? owners.find(owner => owner.scopedProjectId === scopedProjectId)
          ?? (experimentId ? owners.find(owner => owner.experimentId === experimentId) : undefined);
        const currentProject = projects.find(project => this.workspaceRelative(project.workspace) === relative);
        const projectId = currentProject?.id ?? owner?.projectId ?? scopedProjectId;
        const project = projects.find(project => project.id === projectId);
        const current = !!currentProject;
        const active = this.options.isActive(projectId);
        const frozen = owner?.protected === true || (current && !!currentProject?.report?.quality?.experiment);
        const blockedReason = active ? 'Wait for this project’s active work to finish before removing files.'
          : current && !!currentProject?.report?.quality?.experiment ? 'This is the selected experiment build. Start a new build before removing this saved delivery evidence.'
          : frozen ? 'This build is part of saved experiment evidence. Forget this project’s history using Manage learning in Data & storage before removing it.' : undefined;
        items.push({ id: itemId(relative), relative, stamp: `${stat.dev}:${stat.ino}:${stat.mtimeMs}:${stat.ctimeMs}`, kind, projectId, projectTitle: project?.title ?? 'Unassigned data',
          name: kind === 'sessions' ? 'Agent sessions' : owner?.name ?? (kind === 'candidate' ? `Experiment build ${runId ?? scopedProjectId}` : `Build ${runId}`),
          runId, bytes: 0, fileCount: 0, updatedAt: stat.mtime.toISOString(), current, active, canTrash: !blockedReason, blockedReason });
      } catch (error) { if (error instanceof StorageRootChangedError) throw error; if (!missing(error)) warnings.add(`Could not inspect ${relative}. Its files were preserved.`); }
    };
    for (const base of ['workspaces', 'learning/workspaces']) {
      for (const project of await this.directories(base, warnings)) {
        for (const run of await this.directories(`${base}/${project}`, warnings)) {
          await add(`${base}/${project}/${run}`, base.startsWith('learning/') ? 'candidate' : 'build', project, run);
        }
      }
    }
    for (const base of ['sessions', 'learning/sessions']) {
      for (const project of await this.directories(base, warnings)) await add(`${base}/${project}`, 'sessions', project);
    }
    // Also recognize the earlier experiment/candidates layout if it exists.
    for (const base of ['experiments', 'learning/experiments']) {
      for (const experiment of await this.directories(base, warnings)) {
        for (const candidate of await this.directories(`${base}/${experiment}/candidates`, warnings)) {
          await add(`${base}/${experiment}/candidates/${candidate}`, 'candidate', candidate, undefined, experiment);
        }
      }
    }
    for (const project of projects) {
      if (project.workspace && !items.some(item => item.current && item.projectId === project.id)) {
        warnings.add(`“${project.title}” references a build outside the available managed folders. Open it from the project’s Files view if it still exists.`);
      }
    }
    return items;
  }
  private async walk(relative: string, visitor?: (relative: string, stat: Stats) => void,
    excluded: ReadonlySet<string> = new Set(), concurrency = 1, cancelled?: () => boolean): Promise<WalkResult> {
    const result: WalkResult = { bytes: 0, fileCount: 0, updatedAt: 0, links: 0, special: 0, incomplete: false, revision: '' };
    const revision = createHash('sha256');
    const pending = [relative];
    while (pending.length) {
      if (cancelled?.()) { result.incomplete = true; break; }
      // Read-only inventory can overlap filesystem requests without weakening
      // the root and symlink checks. Mutations retain sequential traversal.
      const batch = pending.splice(-concurrency).filter(current => !excluded.has(current));
      const entries = await Promise.all(batch.map(async current => {
        try {
          await this.assertRoot();
          const target = current ? await this.guard(current) : this.root;
          const stat = await fs.lstat(target);
          const children: Dirent[] = stat.isDirectory() ? await fs.readdir(target, { withFileTypes: true }) : [];
          return { current, stat, children };
        } catch (error) {
          if (error instanceof StorageRootChangedError) throw error;
          return { current, stat: undefined, children: [] };
        }
      }));
      for (const { current, stat, children } of entries) {
        if (!stat) { result.incomplete = true; revision.update(JSON.stringify([current, 'unavailable'])); continue; }
        // Include every entry, rather than just the newest timestamp: older
        // nested edits, same-size writes, renames and deletions change revision.
        revision.update(JSON.stringify([current, stat.mode, stat.size, stat.mtimeMs, stat.ctimeMs]));
        result.updatedAt = Math.max(result.updatedAt, stat.mtimeMs);
        if (stat.isFile()) {
          result.bytes += stat.size; result.fileCount++;
          visitor?.(current, stat);
        } else if (stat.isDirectory()) {
          for (const entry of children.sort((a, b) => a.name.localeCompare(b.name))) {
            if (entry.isSymbolicLink()) { result.links++; revision.update(JSON.stringify([current, entry.name, 'link'])); continue; }
            pending.push(current ? `${current}/${entry.name}` : entry.name);
          }
        } else { result.special++; }
      }
    }
    result.revision = revision.digest('hex');
    return result;
  }
  private walkWarnings(result: WalkResult, warnings: Set<string>) {
    if (result.links) warnings.add('Symbolic links are excluded from browsing and cleanup. Their targets are never counted or followed.');
    if (result.special) warnings.add('Special filesystem entries are excluded from file totals.');
    if (result.incomplete) warnings.add('Some files could not be read or changed during scanning. Storage totals may be incomplete; refresh when active work finishes.');
  }
  private async inventory(): Promise<Inventory> {
    const warnings = new Set(this.recoveryWarnings);
    const items = await this.discover(warnings);
    const trash = await this.readTrash();
    trash.warnings.forEach(warning => warnings.add(warning));
    const records: TrashRecord[] = [];
    for (const record of trash.records) {
      if (record.phase !== 'deleting' && await this.exists(`storage-trash/${record.id}/payload`)) records.push(record);
    }
    const key = JSON.stringify([items.map(item => [item.id, item.stamp]).sort(), records.map(record => [record.id, record.bytes, record.phase]).sort()]);
    return { items, records, warnings, key };
  }
  private async measure(inventory: Inventory, generation: number) {
    const warnings = new Set<string>();
    const cancelled = () => generation !== this.measurementGeneration;
    if (cancelled()) return;
    for (const item of inventory.items) {
      const size = await this.walk(item.relative, undefined, undefined, measurementConcurrency, cancelled);
      this.walkWarnings(size, warnings);
      if (cancelled()) return;
      // Publish completed folders while the remaining inventory is measured.
      this.measurements.set(item.relative, size);
    }
    const trashMeasurements = new Map<string, number>();
    // Count each payload as part of the trash traversal; do not scan it twice.
    const trashSize = await this.walk('storage-trash', (relative, stat) => {
      const parts = relative.split('/');
      if (parts[2] === 'payload') trashMeasurements.set(parts[1], (trashMeasurements.get(parts[1]) ?? 0) + stat.size);
    }, undefined, measurementConcurrency, cancelled);
    if (cancelled()) return;
    const other = await this.walk('', undefined, new Set([...inventory.items.map(item => item.relative), 'storage-trash']), measurementConcurrency, cancelled);
    if (cancelled()) return;
    this.walkWarnings(trashSize, warnings);
    // Chromium owns normal lock/socket links in app data; these are neither
    // user-managed files nor a reason to flag a healthy build folder.
    this.walkWarnings({ ...other, links: 0, special: 0 }, warnings);
    this.trashMeasurements = trashMeasurements;
    const available = new Set(inventory.items.map(item => item.relative));
    for (const relative of this.measurements.keys()) if (!available.has(relative)) this.measurements.delete(relative);
    this.measuredTotals = { trashBytes: trashSize.bytes, otherBytes: other.bytes, measuredAt: new Date().toISOString(),
      completedAt: Date.now(), key: inventory.key, warnings: [...warnings] };
    this.measurementStale = false;
    this.measurementError = undefined;
  }
  private startMeasurement(inventory: Inventory, generation: number) {
    if (this.measuring) return this.measuring;
    const measuring = this.measure(inventory, generation).catch(error => {
      this.measurementError = error instanceof Error ? error.message : 'Storage could not be measured. Refresh to try again.';
      this.measurementStale = true;
      throw error;
    }).finally(() => { if (this.measuring === measuring) this.measuring = undefined; });
    this.measuring = measuring;
    return measuring;
  }
  private overview(inventory: Inventory, scanning: boolean): StorageOverview {
    const warnings = new Set([...inventory.warnings, ...this.measuredTotals?.warnings ?? []]);
    if (this.measurementError) warnings.add(this.measurementError);
    const items = inventory.items.map(({ relative, stamp: _stamp, ...item }) => {
      const size = this.measurements.get(relative);
      return { ...item, measured: !!size, ...(size ? { bytes: size.bytes, fileCount: size.fileCount,
        updatedAt: size.updatedAt ? new Date(size.updatedAt).toISOString() : item.updatedAt, revision: size.revision } : {}) };
    });
    const trash = inventory.records.map(record => this.publicTrash({ ...record, bytes: this.trashMeasurements.get(record.id) ?? record.bytes }));
    const trashBytes = this.measuredTotals?.trashBytes ?? trash.reduce((sum, record) => sum + record.bytes, 0);
    const otherBytes = this.measuredTotals?.otherBytes ?? 0;
    const totalBytes = items.reduce((sum, item) => sum + item.bytes, 0) + trashBytes + otherBytes;
    const projects = this.options.store.state.projects.map(project => ({ id: project.id, title: project.title, archived: !!project.archivedAt,
      active: this.options.isActive(project.id), bytes: items.filter(item => item.projectId === project.id).reduce((sum, item) => sum + item.bytes, 0),
      buildCount: items.filter(item => item.projectId === project.id && item.kind !== 'sessions').length }));
    return { items: items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), projects,
      trash: trash.sort((a, b) => b.deletedAt.localeCompare(a.deletedAt)), totalBytes, trashBytes, otherBytes,
      warnings: [...warnings], scanning, measuredAt: this.measuredTotals?.measuredAt };
  }
  async storageOverview(options: { background?: boolean; refresh?: boolean } = {}): Promise<StorageOverview> {
    await this.init();
    await this.assertRoot();
    if (!options.background) {
      // Explicit complete inventories keep their original semantics. Wait out
      // any shared background work before taking a fresh inventory.
      for (;;) {
        await this.measuring?.catch(() => {});
        const generation = this.measurementGeneration;
        const inventory = await this.inventory();
        // Another request may have started measuring during shallow discovery.
        // Keep complete and background callers on the same scan queue.
        if (this.measuring || generation !== this.measurementGeneration) continue;
        await this.startMeasurement(inventory, generation);
        if (generation === this.measurementGeneration) return this.overview(inventory, false);
      }
    }
    const inventory = await this.inventory();
    const stale = options.refresh || this.measurementStale || this.measuredTotals?.key !== inventory.key
      || Date.now() - (this.measuredTotals?.completedAt ?? 0) >= measurementFreshness;
    if (stale && !this.measuring && !this.mutating) {
      // A failed scan is reported in the next snapshot; background callers do
      // not wait for it or leave an unhandled rejection in the main process.
      void this.startMeasurement(inventory, this.measurementGeneration).catch(() => {});
    }
    return this.overview(inventory, !!this.measuring || this.mutating);
  }
  private async resolveItem(id: string) {
    await this.init();
    await this.assertRoot();
    if (typeof id !== 'string' || !/^[a-f0-9]{64}$/.test(id)) throw new Error('Choose an available storage item.');
    const item = (await this.discover()).find(item => item.id === id);
    if (!item) throw new Error('This storage item is no longer available. Refresh the list.');
    await this.guard(item.relative);
    return item;
  }
  private fileRelative(item: Item, file?: string) {
    if (file === undefined) return item.relative;
    this.validRelative(file);
    return `${item.relative}/${file}`;
  }
  private async ordinaryFile(relative: string, allowHardlinks = false) {
    const target = await this.guard(relative);
    const handle = await fs.open(target, constants.O_RDONLY | constants.O_NOFOLLOW);
    try {
      await this.guard(relative);
      const stat = await handle.stat();
      if (!stat.isFile() || (!allowHardlinks && stat.nlink !== 1)) throw new Error('Choose an ordinary file that is not linked to another location.');
      return { handle, stat };
    } catch (error) { await handle.close(); throw error; }
  }
  async resolveTarget(itemId: string, file?: string) {
    const item = await this.resolveItem(itemId), relative = this.fileRelative(item, file);
    const target = await this.guard(relative), stat = await fs.lstat(target);
    if (file !== undefined && (!stat.isFile() || stat.nlink !== 1)) throw new Error('Choose an ordinary file from this folder.');
    return { path: target, name: path.basename(target), directory: stat.isDirectory(), projectId: item.projectId };
  }
  async storageFiles(itemId: string): Promise<StorageFile[]> {
    const item = await this.resolveItem(itemId), files: StorageFile[] = [];
    const result = await this.walk(item.relative, (relative, stat) => {
      const file = relative.slice(item.relative.length + 1);
      files.push({ path: file, size: stat.size, updatedAt: stat.mtime.toISOString(), category: this.category(file),
        revision: createHash('sha256').update(JSON.stringify([file, stat.dev, stat.ino, stat.size, stat.mtimeMs, stat.ctimeMs])).digest('hex') });
    }, undefined, measurementConcurrency);
    if (result.incomplete) throw new Error('Some files changed or could not be read. Refresh the folder and try again.');
    return files.sort((a, b) => a.path.localeCompare(b.path));
  }
  private category(file: string): StorageFile['category'] {
    if (/(^|\/)(node_modules|\.venv|venv|vendor|__pycache__)(\/|$)/.test(file)) return 'dependencies';
    if (/(^|\/)(\.quality-evidence|screenshots|test-results|playwright-report)(\/|$)|(?:test-report|review)\.json$|\.(png|jpe?g|webp|gif)$/i.test(file)) return 'evidence';
    if (/\.(log|jsonl)$|(^|\/)logs(\/|$)/i.test(file)) return 'logs';
    if (/(^|\/)(data|inputs)(\/|$)|\.(csv|tsv|sqlite|db|parquet|xlsx?)$/i.test(file)) return 'data';
    if (/\.(?:[cm]?[jt]sx?|py|html?|css|scss|json|md|txt|yaml|yml|toml|sh|sql|rs|go|java|c|h|cpp)$/i.test(file)) return 'source';
    return 'other';
  }
  async storageReadFile(itemId: string, file: string): Promise<StoragePreview> {
    const item = await this.resolveItem(itemId), relative = this.fileRelative(item, file);
    const { handle, stat } = await this.ordinaryFile(relative);
    try {
      const mime = ({ '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp' } as Record<string, string>)[path.extname(file).toLowerCase()];
      if (stat.size > (mime ? imageLimit : textLimit)) return { kind: 'binary', message: 'This file is too large to preview. Open it in its folder or export a copy.' };
      const bytes = await handle.readFile();
      if (bytes.length > (mime ? imageLimit : textLimit)) return { kind: 'binary', message: 'This file grew while opening it. Refresh to try again.' };
      if (mime) return { kind: 'image', url: `data:${mime};base64,${bytes.toString('base64')}` };
      if (bytes.includes(0)) return { kind: 'binary', message: 'Preview is unavailable for this file type. Open it in its folder or export a copy.' };
      try { return { kind: 'text', text: new TextDecoder('utf-8', { fatal: true }).decode(bytes) }; }
      catch { return { kind: 'binary', message: 'Preview is unavailable for this file type. Open it in its folder or export a copy.' }; }
    } finally { await handle.close(); }
  }
  private serialize<T>(operation: () => Promise<T>): Promise<T> {
    const pending = this.pending.catch(() => {}).then(async () => {
      this.mutating = true;
      this.measurementGeneration++;
      try { return await operation(); }
      finally {
        // Partial failures can also move or restore bytes. Never let an older
        // in-flight scan replace the post-mutation inventory.
        this.measurementGeneration++;
        this.measurementStale = true;
        this.mutating = false;
      }
    });
    this.pending = pending;
    return pending;
  }
  private async reserved<T>(projectId: string, operation: () => Promise<T>) {
    if (this.options.isActive(projectId)) throw new Error('Wait for this project’s active work to finish before changing its storage.');
    const release = await this.options.beforeMutation(projectId);
    try { return await operation(); } finally { release?.(); }
  }
  private publicTrash(record: StorageTrashItem): StorageTrashItem {
    return { id: record.id, name: record.name, projectId: record.projectId, projectTitle: record.projectTitle,
      kind: record.kind, bytes: record.bytes, deletedAt: record.deletedAt };
  }
  private parseRecord(value: unknown, id: string): TrashRecord {
    const record = value as TrashRecord;
    if (!record || record.version !== 1 || record.id !== id || !uuidPattern.test(id)
      || !['prepared', 'ready', 'restored', 'deleting'].includes(record.phase) || !['build', 'candidate', 'sessions'].includes(record.itemKind)
      || !['build', 'candidate', 'sessions', 'file'].includes(record.kind) || typeof record.projectId !== 'string'
      || typeof record.projectTitle !== 'string' || typeof record.name !== 'string' || !Number.isFinite(record.bytes) || record.bytes < 0
      || !Number.isFinite(Date.parse(record.deletedAt))) throw new Error('Invalid trash record.');
    this.validRelative(record.original); this.validRelative(record.itemRelative);
    if (!this.managedItem(record.itemRelative, record.itemKind) || !within(record.itemRelative, record.original)
      || (record.kind !== 'file' && record.original !== record.itemRelative)
      || (record.kind === 'file' && record.original === record.itemRelative)) throw new Error('Invalid trash location.');
    return record;
  }
  private async readRecord(id: string): Promise<TrashRecord> {
    if (typeof id !== 'string' || !uuidPattern.test(id)) throw new Error('Choose an available item in Trash.');
    const { handle, stat } = await this.ordinaryFile(`storage-trash/${id}/manifest.json`);
    try {
      if (stat.size > 64 * 1024) throw new Error('The trash record is too large. Its files were preserved.');
      return this.parseRecord(JSON.parse(await handle.readFile('utf8')), id);
    } finally { await handle.close(); }
  }
  private async readTrash() {
    const warnings = new Set<string>(), records: TrashRecord[] = [];
    for (const id of await this.directories('storage-trash', warnings)) {
      try { records.push(await this.readRecord(id)); }
      catch (error) { if (error instanceof StorageRootChangedError) throw error; warnings.add('Some Trash records could not be read. Their files are preserved and included in storage totals.'); }
    }
    return { records, warnings: [...warnings] };
  }
  private async writeRecord(record: TrashRecord) {
    this.parseRecord(record, record.id);
    const directory = `storage-trash/${record.id}`;
    await this.mkdir(directory);
    const temporary = `${directory}/manifest-${randomUUID()}.tmp`;
    const target = `${directory}/manifest.json`;
    await this.guard(target, true);
    try {
      await fs.writeFile(await this.guard(temporary, true), JSON.stringify(record, null, 2), { mode: 0o600, flag: 'wx' });
      await fs.rename(await this.guard(temporary), await this.guard(target, true));
    } finally { await fs.rm(await this.guard(temporary, true), { force: true }); }
  }
  private async removeRecord(id: string) {
    // Called only after the payload has moved out or has been explicitly deleted.
    const directory = await this.guard(`storage-trash/${id}`);
    if (await this.exists(`storage-trash/${id}/payload`)) throw new Error('Trash files must be restored or explicitly deleted before removing their record.');
    await this.guard(`storage-trash/${id}`);
    await fs.rm(directory, { recursive: true, force: true });
  }
  private async removeTrashPayload(id: string) {
    const relative = `storage-trash/${id}/payload`;
    if (await this.exists(relative)) await fs.rm(await this.guard(relative), { recursive: true, force: true });
  }
  private restoreProject(project: Project, snapshot: Project) {
    for (const key of Object.keys(project)) delete (project as unknown as Record<string, unknown>)[key];
    Object.assign(project, snapshot);
  }
  private sameEntry(a: Stats, b: Stats) { return a.dev === b.dev && a.ino === b.ino && a.mode === b.mode; }
  /** Check created directory identities before every restore write, including child writes. */
  private async restoreDestination(relative: string, created: CreatedEntry[]) {
    await this.guard(path.posix.dirname(relative));
    for (const entry of created) {
      if (!entry.stat.isDirectory() || !within(entry.relative, path.posix.dirname(relative))) continue;
      const stat = await fs.lstat(await this.guard(entry.relative));
      if (!this.sameEntry(stat, entry.stat)) throw new Error('A restore folder changed while copying. The complete original remains in Trash.');
    }
    return this.absolute(relative);
  }
  private async sourceEntry(relative: string) {
    await this.guard(path.posix.dirname(relative));
    const target = this.absolute(relative), stat = await fs.lstat(target);
    await this.assertRoot();
    return { target, stat };
  }
  /** Every creation is exclusive. Keep the original payload intact until state commits. */
  private async restoreEntry(source: string, destination: string, created: CreatedEntry[]): Promise<void> {
    const original = await this.sourceEntry(source);
    const target = await this.restoreDestination(destination, created);
    if (original.stat.isSymbolicLink()) {
      const link = await fs.readlink(original.target);
      await this.restoreDestination(destination, created);
      await fs.symlink(link, target);
      created.push({ relative: destination, stat: await fs.lstat(target) });
    } else if (original.stat.isDirectory()) {
      await fs.mkdir(target, { mode: 0o700 });
      const entry = { relative: destination, stat: await fs.lstat(await this.guard(destination)) };
      created.push(entry);
      for (const child of await fs.readdir(await this.guard(source))) await this.restoreEntry(`${source}/${child}`, `${destination}/${child}`, created);
      await this.restoreDestination(`${destination}/.restore-check`, created);
      await fs.chmod(await this.guard(destination), original.stat.mode & 0o777);
      entry.stat = await fs.lstat(await this.guard(destination));
    } else if (original.stat.isFile()) {
      await this.copyFile(source, target, { allowHardlinks: true,
        beforeCreate: () => this.restoreDestination(destination, created).then(() => {}),
        created: stat => { created.push({ relative: destination, stat }); },
        updated: stat => { const entry = created.find(entry => entry.relative === destination); if (entry) entry.stat = stat; },
      });
    } else throw new Error('This folder contains a special filesystem entry. The complete original remains in Trash.');
  }
  private async cleanupCreated(created: CreatedEntry[]) {
    for (const entry of [...created].reverse()) {
      // A file can be edited before our final stat snapshot is captured. Without
      // an atomic compare-and-unlink primitive, preserve every nonempty output.
      if (!entry.stat.isDirectory()) continue;
      try {
        await this.guard(path.posix.dirname(entry.relative));
        const target = this.absolute(entry.relative), current = await fs.lstat(target);
        if (!this.sameEntry(current, entry.stat)) continue;
        // rmdir cannot remove an editor's newly created children.
        if (current.isDirectory()) await fs.rmdir(target);
      } catch { /* Preserve anything changed or no longer safely addressable. Trash is intact. */ }
    }
  }
  private async invalidate(projectId: string, itemRelative: string, kind: StorageKind, whole: boolean, persist = true) {
    const project = this.options.store.state.projects.find(project => project.id === projectId);
    if (!project) return;
    const current = this.workspaceRelative(project.workspace) === itemRelative;
    if (!current && kind !== 'sessions') return;
    const snapshot = structuredClone(project);
    if (kind === 'sessions') delete project.resumeStage;
    else {
      delete project.report; delete project.visualReview; delete project.approvedAt; delete project.exportedTo;
      delete project.verification; delete project.approval;
      delete project.executable; delete project.resumeStage; delete project.executionFailure;
      project.status = whole ? 'draft' : 'stopped';
      project.error = whole ? undefined : 'Build files changed in Data & storage. Start a new build to create fresh verification evidence.';
      if (whole) {
        delete project.workspace; delete project.runId; delete project.runtimeProfile; delete project.systemDesign;
        delete project.processScope; delete project.runCheckpoint;
        delete project.phasePlan; delete project.globalTools; delete project.qualityVersion;
        project.stages = structuredClone(stageDefinitions); project.logs = [];
      } else for (const stage of project.stages) if (['verify', 'review', 'deliver'].includes(stage.id)) stage.status = 'queued';
    }
    project.updatedAt = new Date().toISOString();
    if (!persist) return;
    try { await this.assertRoot(); await this.options.store.save(); }
    catch (error) { this.restoreProject(project, snapshot); throw error; }
  }
  async storageTrash(id: string, file?: string): Promise<StorageTrashItem> {
    return this.serialize(async () => {
      const item = await this.resolveItem(id);
      if (!item.canTrash) throw new Error(item.blockedReason);
      return this.reserved(item.projectId, async () => {
        const original = this.fileRelative(item, file), target = await this.guard(original), stat = await fs.lstat(target);
        if (file !== undefined && (!stat.isFile() || stat.nlink !== 1)) throw new Error('Choose an ordinary file from this build.');
        const size = await this.walk(original);
        if (size.incomplete) throw new Error('These files changed or could not be inspected. Refresh and try again.');
        const record: TrashRecord = { version: 1, id: randomUUID(), name: file ?? item.name, projectId: item.projectId,
          projectTitle: item.projectTitle, kind: file === undefined ? item.kind : 'file', bytes: size.bytes,
          deletedAt: new Date().toISOString(), original, itemRelative: item.relative, itemKind: item.kind, phase: 'prepared' };
        await this.writeRecord(record);
        const payload = `storage-trash/${record.id}/payload`;
        try {
          await fs.rename(await this.guard(original), this.absolute(payload));
          await this.invalidate(item.projectId, item.relative, item.kind, file === undefined);
        } catch (error) {
          if (await this.exists(payload) && !await this.exists(original)) {
            const created: CreatedEntry[] = [];
            try { await this.restoreEntry(payload, original, created); await this.removeTrashPayload(record.id); }
            catch { await this.cleanupCreated(created); }
          }
          if (await this.exists(payload)) {
            // An editor may have recreated the original while save/rollback failed.
            // Preserve both versions and never put an obsolete approval back on screen.
            await this.invalidate(item.projectId, item.relative, item.kind, file === undefined, false);
            this.options.changed();
          }
          if (!await this.exists(payload)) await this.removeRecord(record.id);
          throw error;
        }
        // State and bytes are committed even if subsequent journal bookkeeping fails.
        this.options.changed();
        // A ready-write failure is recoverable from the durable prepared record.
        try { await this.writeRecord({ ...record, phase: 'ready' }); }
        catch (error) { throw new Error(`Files moved to Trash, but the final record could not be saved. Refresh to see the current files. ${error instanceof Error ? error.message : ''}`); }
        return this.publicTrash(record);
      });
    });
  }
  async storageRestore(id: string): Promise<void> {
    return this.serialize(async () => {
      await this.init();
      const record = await this.readRecord(id);
      if (record.phase === 'deleting' || record.phase === 'restored') throw new Error('This item has already been restored or is being permanently deleted.');
      return this.reserved(record.projectId, async () => {
        const payload = `storage-trash/${id}/payload`;
        await this.guard(payload);
        if (await this.exists(record.original)) throw new Error('A file or folder already exists at the original location. Rename or move it before restoring. Nothing was overwritten.');
        if (record.kind === 'file' && !await this.exists(record.itemRelative)) throw new Error('Restore this file’s build or session folder first, then restore the file.');
        const parent = path.posix.dirname(record.original);
        await this.mkdir(parent);
        const created: CreatedEntry[] = [];
        try {
          await this.restoreEntry(payload, record.original, created);
          await this.invalidate(record.projectId, record.itemRelative, record.itemKind, false);
        } catch (error) {
          // The complete payload remains in Trash. Preserve copied files too:
          // an editor could have changed them before our final stat snapshot.
          await this.cleanupCreated(created);
          if ((error as NodeJS.ErrnoException).code === 'EEXIST') throw new Error('A file or folder already exists at the original location. Rename or move it before restoring. Nothing was overwritten.');
          throw new Error(`Restore did not finish. Copied files were kept in place and the complete original remains in Trash. ${error instanceof Error ? error.message : ''}`);
        }
        this.options.changed();
        try {
          await this.writeRecord({ ...record, phase: 'restored' });
          await this.removeTrashPayload(id);
          await this.removeRecord(id);
        } catch (error) { throw new Error(`Files were restored, but Trash cleanup did not finish. Refresh to see the current files. ${error instanceof Error ? error.message : ''}`); }
      });
    });
  }
  async storageDeleteForever(id: string): Promise<void> {
    return this.serialize(async () => {
      await this.init();
      const record = await this.readRecord(id);
      return this.reserved(record.projectId, async () => {
        await this.writeRecord({ ...record, phase: 'deleting' });
        await this.removeTrashPayload(id);
        this.options.changed();
        await this.removeRecord(id);
      });
    });
  }
  async storageArchiveProject(projectId: string, archived: boolean): Promise<void> {
    return this.serialize(async () => {
      await this.init();
      if (typeof projectId !== 'string' || typeof archived !== 'boolean') throw new Error('Choose a project and archive action.');
      const project = this.options.store.project(projectId);
      return this.reserved(projectId, async () => {
        const snapshot = structuredClone(project);
        if (archived) project.archivedAt = new Date().toISOString(); else delete project.archivedAt;
        project.updatedAt = new Date().toISOString();
        try { await this.assertRoot(); await this.options.store.save(); } catch (error) { this.restoreProject(project, snapshot); throw error; }
        this.options.changed();
      });
    });
  }
  async exportTo(id: string, destination: string, file?: string): Promise<string> {
    return this.serialize(async () => {
      const item = await this.resolveItem(id);
      return this.reserved(item.projectId, async () => {
        if (typeof destination !== 'string' || !path.isAbsolute(destination)) throw new Error('Choose a destination folder or file.');
        const sourceRelative = this.fileRelative(item, file), source = await this.guard(sourceRelative);
        const parent = await fs.realpath(file === undefined ? destination : path.dirname(destination));
        const parentStat = await fs.lstat(parent);
        if (!parentStat.isDirectory()) throw new Error('Choose a destination folder.');
        const filename = file === undefined ? `${item.projectTitle}-${item.runId ?? item.kind}`.replace(/[^\p{L}\p{N}._-]+/gu, '-').slice(0, 120) || 'AppYard-files' : path.basename(destination);
        let target = path.join(parent, filename);
        if (within(this.root, target) || within(target, this.root) || within(source, target) || within(target, source)) throw new Error('Export to a folder outside AppYard’s managed storage.');
        if (file === undefined) {
          for (let suffix = 0; ; suffix++) {
            target = path.join(parent, filename + (suffix ? `-${suffix + 1}` : ''));
            try { await fs.mkdir(target, { mode: 0o700 }); break; }
            catch (error) { if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error; }
          }
          try { await this.copyDirectory(sourceRelative, target); }
          catch (error) { throw new Error(`Export did not finish. Any partial copy was kept at ${target}. ${error instanceof Error ? error.message : ''}`); }
        } else {
          try { await this.copyFile(sourceRelative, target); }
          catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'EEXIST') throw new Error('A file already exists at that destination. Choose a new name; nothing was overwritten.');
            throw new Error(`Export did not finish. Any partial copy was kept at ${target}. ${error instanceof Error ? error.message : ''}`);
          }
        }
        return target;
      });
    });
  }
  private async copyDirectory(relative: string, destination: string) {
    const source = await this.guard(relative);
    for (const entry of await fs.readdir(source, { withFileTypes: true })) {
      if (entry.isSymbolicLink()) continue;
      const child = `${relative}/${entry.name}`, target = path.join(destination, entry.name);
      if (entry.isDirectory()) { await fs.mkdir(target, { mode: 0o700 }); await this.copyDirectory(child, target); }
      else if (entry.isFile()) {
        await this.copyFile(child, target);
      }
    }
  }
  private async copyFile(relative: string, destination: string, options: { allowHardlinks?: boolean; beforeCreate?(): Promise<void>;
    created?(stat: Stats): void; updated?(stat: Stats): void } = {}) {
    const source = await this.ordinaryFile(relative, options.allowHardlinks);
    let output: Awaited<ReturnType<typeof fs.open>> | undefined;
    let outputStat: Stats | undefined;
    try {
      await this.assertRoot(); await options.beforeCreate?.();
      output = await fs.open(destination, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
      outputStat = await output.stat(); options.created?.(outputStat);
      const buffer = Buffer.alloc(128 * 1024);
      for (;;) {
        await this.assertRoot();
        const { bytesRead } = await source.handle.read(buffer, 0, buffer.length, null);
        if (!bytesRead) break;
        let offset = 0;
        while (offset < bytesRead) {
          const { bytesWritten } = await output.write(buffer, offset, bytesRead - offset, null);
          if (!bytesWritten) throw new Error('The destination could not accept the exported file.');
          offset += bytesWritten;
        }
        outputStat = await output.stat(); options.updated?.(outputStat);
      }
      await output.chmod(source.stat.mode & 0o777);
      outputStat = await output.stat(); options.updated?.(outputStat);
    } finally { await source.handle.close(); await output?.close(); }
  }
}
