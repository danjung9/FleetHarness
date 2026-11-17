import type { AppState, FleetAPI } from '../shared/types';
export const workerURL = (import.meta.env.VITE_APPYARD_WORKER_URL as string | undefined)?.replace(/\/$/, '');
export const workerTokenKey = 'appyard-worker-token';
export async function workerCall(method: string, args: unknown[] = [], token = sessionStorage.getItem(workerTokenKey) ?? '') {
  const response = await fetch(`${workerURL}/api/rpc`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ method, args }) });
  const body = await response.json();
  if (response.status === 401) window.dispatchEvent(new Event('appyard-worker-unauthorized'));
  if (!response.ok) throw new Error(body.error || 'The build worker is unavailable.');
  return body.result;
}
function subscribe(callback: (state: AppState) => void) {
  const controller = new AbortController();
  void (async () => {
    while (!controller.signal.aborted) {
      try {
        const response = await fetch(`${workerURL}/api/events`, { headers: { Authorization: `Bearer ${sessionStorage.getItem(workerTokenKey) ?? ''}` }, signal: controller.signal });
        if (!response.ok || !response.body) throw new Error('Worker connection failed.');
        const reader = response.body.getReader(), decoder = new TextDecoder(); let buffer = '';
        for (;;) {
          const next = await reader.read(); if (next.done) break;
          buffer += decoder.decode(next.value, { stream: true });
          let end: number;
          while ((end = buffer.indexOf('\n\n')) >= 0) {
            const block = buffer.slice(0,end); buffer = buffer.slice(end+2);
            const data = block.split('\n').find(line => line.startsWith('data:'))?.slice(5).trim();
            if (data) callback(JSON.parse(data));
          }
        }
      } catch { /* Reconnect with a complete state snapshot. */ }
      if (!controller.signal.aborted) await new Promise<void>(resolve => { const timer = setTimeout(resolve, 2000); controller.signal.addEventListener('abort', () => { clearTimeout(timer); resolve(); }, { once: true }); });
    }
  })();
  return () => controller.abort();
}
async function download(method: string, args: unknown[]) {
  const route = await workerCall(method,args) as string;
  const response = await fetch(`${workerURL}${route}`, { headers: { Authorization: `Bearer ${sessionStorage.getItem(workerTokenKey) ?? ''}` } });
  if (!response.ok) throw new Error('The download expired. Export the project again.');
  const blob = URL.createObjectURL(await response.blob()), anchor = document.createElement('a');
  anchor.href = blob; anchor.download = 'appyard-source.zip'; anchor.click(); setTimeout(() => URL.revokeObjectURL(blob), 30000);
  return 'Source bundle downloaded';
}
export const workerAPI = new Proxy({ onState: subscribe }, { get(target, method: string) { if (method === 'then') return undefined; return method === 'onState' ? target.onState : (...args: unknown[]) => method === 'exportProject' ? download(method,args) : workerCall(method,args); } }) as FleetAPI;
