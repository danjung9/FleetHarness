interface DraftStorage {
  readonly length: number;
  key(index: number): string | null;
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** Move existing open-window drafts before an Electron restart discards sessionStorage. */
export function migrateConversationDrafts(persistent: DraftStorage, session: DraftStorage) {
  try {
    const keys = Array.from({ length: session.length }, (_, index) => session.key(index)).filter((key): key is string => !!key?.startsWith('appyard:conversation:'));
    for (const key of keys) {
      const value = session.getItem(key);
      if (value !== null) { persistent.setItem(key, value); session.removeItem(key); }
    }
  } catch { /* A blocked or full persistent store leaves the original draft intact. */ }
}

export function readConversationDraft(key: string, persistent: DraftStorage, session: DraftStorage): string {
  try { const value = session.getItem(key); if (value !== null) return value; } catch { /* This window's storage may be blocked. */ }
  try { return persistent.getItem(key) ?? ''; } catch { return ''; }
}

export function saveConversationDraft(key: string, value: string, persistent: DraftStorage, session: DraftStorage) {
  try {
    if (value) persistent.setItem(key, value); else persistent.removeItem(key);
    session.removeItem(key);
  } catch {
    try { if (value) session.setItem(key, value); else session.removeItem(key); } catch { /* In-memory editing still works. */ }
  }
}
