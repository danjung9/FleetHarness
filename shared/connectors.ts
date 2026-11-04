import type { ConnectorKind, ContextItem } from '../electron/connectors/types.js';
export type { ConnectorKind, ContextItem };
export interface ConnectedDataSelection { id: string; digest: string; includeInApp: boolean }
export interface ConnectorFilters { sinceDays?: number; query?: string; folder?: string }
export interface ConnectorPreview {
  id: string; kind: ConnectorKind; label: string; sample: boolean; digest: string;
  items: ContextItem[]; excluded: number; redacted: number; limited: number;
}
export interface ConnectorCard {
  kind: ConnectorKind; label: string; summary: string; available: boolean;
  connection?: Omit<ConnectorPreview, 'items'> & { count: number };
}
export interface ConnectorsAPI {
  list(): Promise<ConnectorCard[]>;
  preview(kind: ConnectorKind, filters: ConnectorFilters): Promise<ConnectorPreview>;
  use(id: string, digest: string): Promise<void>;
  cancel(kind: ConnectorKind): Promise<void>;
  disconnect(id: string): Promise<void>;
}
export function validateSelections(value: unknown): ConnectedDataSelection[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 7) throw new Error('The selected data is not valid. Choose it again in your brief.');
  const seen = new Set<string>();
  return value.map(item => {
    if (!item || typeof item.id !== 'string' || !/^[a-f0-9-]{36}$/.test(item.id) || typeof item.digest !== 'string' || !/^[a-f0-9]{64}$/.test(item.digest) || typeof item.includeInApp !== 'boolean' || seen.has(item.id)) throw new Error('The selected data is not valid. Choose it again in your brief.');
    seen.add(item.id); return { id: item.id, digest: item.digest, includeInApp: item.includeInApp };
  });
}
