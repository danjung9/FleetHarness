import type { LogEntry, RunStatus, StageId } from './types.js';

export const stageNames: Record<StageId, string> = {
  intake: 'Intake', research: 'Research', plan: 'Plan', build: 'Build', verify: 'Verify', review: 'Review', deliver: 'Delivery'
};
export type ActivityStatus = 'running' | 'complete' | 'failed' | 'interrupted' | 'unavailable';
export interface ActivityItem {
  id: string; stage: StageId; time: string; kind: 'message' | 'tool' | 'info' | 'error';
  text: string; records: LogEntry[]; name?: string; target?: string;
  input?: string; output?: string; status?: ActivityStatus; durationMs?: number;
}

export function parseJSON(text: string): unknown {
  try { return JSON.parse(text); } catch { return undefined; }
}
export function humanize(value: string) {
  const words = value.replace(/^fleet_/, '').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}
export function toolLabel(name = '') {
  return ({ read: 'Read file', write: 'Write file', edit: 'Edit file', bash: 'Run command', grep: 'Search contents', find: 'Find files', ls: 'List files' } as Record<string, string>)[name] || humanize(name);
}
function toolEvent(log: LogEntry) {
  const newline = log.text.indexOf('\n');
  const header = newline < 0 ? log.text : log.text.slice(0, newline);
  const payload = newline < 0 ? '' : log.text.slice(newline + 1);
  if (log.tool) return { ...log.tool, payload };
  if (log.kind !== 'tool' && log.kind !== 'error') return;
  const match = /^([\w.-]+)(?: (completed|failed))?$/.exec(header);
  if (!match || (log.kind === 'error' && match[2] !== 'failed')) return;
  return { name: match[1], phase: match[2] === 'failed' ? 'error' as const : match[2] ? 'complete' as const : 'start' as const, payload, callId: undefined, target: undefined };
}

/** Preserve old persisted logs while correlating new calls by their SDK identity. */
export function buildActivity(logs: LogEntry[], runStatus: RunStatus, activeStage?: StageId): ActivityItem[] {
  const items: ActivityItem[] = [];
  const pending = new Map<string, ActivityItem[]>();
  for (const log of logs) {
    const event = toolEvent(log);
    if (!event) {
      items.push({ id: log.id, stage: log.stage, time: log.time, kind: log.kind === 'text' ? 'message' : log.kind === 'error' ? 'error' : 'info', text: log.text, records: [log] });
      continue;
    }
    const key = `${log.stage}:${event.callId ? 'id:' + event.callId : 'legacy:' + event.name}`;
    const open = pending.get(key) || [];
    if (event.phase === 'start') {
      const args = parseJSON(event.payload) as Record<string, unknown> | null | undefined;
      const target = event.target ?? args?.path ?? args?.file_path ?? args?.command ?? args?.query ?? args?.pattern;
      const item: ActivityItem = {
        id: log.id, stage: log.stage, time: log.time, kind: 'tool', name: event.name, text: toolLabel(event.name),
        target: typeof target === 'string' ? target : undefined, input: event.payload, records: [log],
        status: runStatus === 'running' && (!activeStage || activeStage === log.stage) ? 'running' : runStatus === 'stopped' || runStatus === 'failed' ? 'interrupted' : 'unavailable'
      };
      open.push(item); pending.set(key, open); items.push(item);
    } else {
      // Without call IDs, only pair an unambiguous legacy start. Never invent a match.
      const item = open.length === 1 ? open.pop() : undefined;
      if (item) {
        item.status = event.phase === 'error' ? 'failed' : 'complete';
        item.output = event.payload; item.records.push(log);
        const duration = Date.parse(log.time) - Date.parse(item.time);
        if (Number.isFinite(duration) && duration >= 0) item.durationMs = duration;
      } else {
        items.push({ id: log.id, stage: log.stage, time: log.time, kind: 'tool', name: event.name, text: toolLabel(event.name),
          output: event.payload, status: event.phase === 'error' ? 'failed' : 'complete', records: [log] });
      }
    }
  }
  return items;
}

/** Decode Pi text blocks without exposing image/base64 payloads as prose. */
export function resultText(output: string): string {
  const result = parseJSON(output);
  if (result && typeof result === 'object' && 'content' in result && Array.isArray(result.content)) {
    return result.content.map((block: unknown) => {
      if (!block || typeof block !== 'object') return '';
      if ('text' in block && typeof block.text === 'string') return block.text;
      return 'type' in block && typeof block.type === 'string' ? `[${humanize(block.type)} output — inspect original record]` : '';
    }).filter(Boolean).join('\n\n');
  }
  return typeof result === 'string' ? result : output;
}

export function durationLabel(ms: number) {
  if (ms < 1000) return '<1s';
  if (ms < 60000) return `${(ms / 1000).toFixed(ms < 10000 ? 1 : 0)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor(ms % 60000 / 1000)}s`;
}
