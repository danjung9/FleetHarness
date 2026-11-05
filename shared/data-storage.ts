export type StorageKind = 'build' | 'candidate' | 'sessions';
export interface StorageItem {
  id: string;
  kind: StorageKind;
  projectId: string;
  projectTitle: string;
  name: string;
  runId?: string;
  bytes: number;
  fileCount: number;
  /** False until this folder's first background measurement completes. */
  measured?: boolean;
  /** Changes when any file's metadata changes, including nested files. */
  revision?: string;
  updatedAt: string;
  current: boolean;
  active: boolean;
  canTrash: boolean;
  blockedReason?: string;
}
export interface StorageProject {
  id: string; title: string; archived: boolean; active: boolean;
  bytes: number; buildCount: number;
}
export interface StorageTrashItem {
  id: string; name: string; projectId: string; projectTitle: string;
  kind: StorageKind | 'file'; bytes: number; deletedAt: string;
}
export interface StorageOverview {
  items: StorageItem[]; projects: StorageProject[]; trash: StorageTrashItem[];
  totalBytes: number; trashBytes: number; otherBytes: number;
  warnings: string[];
  scanning?: boolean;
  measuredAt?: string;
}
export interface StorageFile {
  path: string; size: number; updatedAt: string;
  revision?: string;
  category: 'source' | 'data' | 'evidence' | 'logs' | 'dependencies' | 'other';
}
export interface StoragePreview {
  kind: 'text' | 'image' | 'binary'; text?: string; url?: string; message?: string;
}
export interface DataStorageAPI {
  storageOverview(options?: { background?: boolean; refresh?: boolean }): Promise<StorageOverview>;
  storageFiles(itemId: string): Promise<StorageFile[]>;
  storageReadFile(itemId: string, file: string): Promise<StoragePreview>;
  storageOpen(itemId: string, file?: string): Promise<void>;
  storageExport(itemId: string, file?: string): Promise<string | null>;
  storageTrash(itemId: string, file?: string): Promise<StorageTrashItem>;
  storageRestore(trashId: string): Promise<void>;
  storageDeleteForever(trashId: string): Promise<void>;
  storageArchiveProject(projectId: string, archived: boolean): Promise<void>;
}
export const storageMethodNames = ['storageOverview', 'storageFiles', 'storageReadFile', 'storageOpen', 'storageExport', 'storageTrash', 'storageRestore', 'storageDeleteForever', 'storageArchiveProject'] as const;
