// The shared connector interface. Secrets never leave the main process.
export type ConnectorKind = 'war-data-platform' | 'maven-smart-system' | 'gmail' | 'google-calendar' | 'google-drive' | 'outlook' | 'outlook-calendar' | 'onedrive' | 'custom-api';
export interface ContextItem {
  id: string; title: string; kind: 'email' | 'event' | 'file' | 'record';
  when?: string; from?: string; body: string; sourceUrl?: string;
}
export interface FetchOptions { sinceDays?: number; query?: string; folder?: string; maxItems: number; maxBytes: number; signal: AbortSignal }
export interface SecretStore {
  get(name: string): Promise<string | undefined>;
  set(name: string, value: string): Promise<void>;
  remove(name: string): Promise<void>;
}
/** How a connector talks to the person during sign-in. Plain words only. */
export interface ConnectUi {
  openBrowser(url: string): Promise<void>;
  showCode(code: string, url: string): void;
  ask(question: { id: string; label: string; secret?: boolean; options?: { id: string; label: string }[] }): Promise<string>;
}
export interface ConnectorAdapter {
  kind: ConnectorKind;
  label: string;
  /** One plain sentence, for example: "Reads your email. It cannot send, change or delete anything." */
  plainSummary: string;
  /** False when a person still has to set something up, such as a client ID. The card then explains and offers sample data. */
  available(): boolean;
  connect(secrets: SecretStore, ui: ConnectUi, signal: AbortSignal): Promise<{ accountLabel: string }>;
  fetch(secrets: SecretStore, options: FetchOptions): Promise<ContextItem[]>;
  disconnect(secrets: SecretStore): Promise<void>;
}
