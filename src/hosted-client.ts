import type { AppState, Bootstrap, FleetAPI } from '../shared/types';

interface HostedClientOptions {
  getAccess: () => Promise<{ token: string; userId: string } | null>;
  fetch?: typeof fetch;
  download?: (blob: Blob, filename: string) => void;
  onUnauthorized?: () => void;
  pollInterval?: number;
}

function downloadFile(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = filename; document.body.append(link);
  link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export function createHostedClient(options: HostedClientOptions) {
  const transport = options.fetch ?? fetch;
  const controllers = new Set<AbortController>();
  const listeners = new Set<(state: AppState) => void>();
  const connectionListeners = new Set<(message: string) => void>();
  let userId: string | null = null, epoch = 0, sequence = 0, published = 0;
  let latestBootstrap: Bootstrap | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let connectionMessage = '';

  function connection(message: string) {
    connectionMessage = message;
    for (const listener of connectionListeners) listener(message);
  }
  function cancelled() { return new DOMException('This account session has ended.', 'AbortError'); }
  function assertSession(startEpoch: number) { if (startEpoch !== epoch || !userId) throw cancelled(); }
  async function request<T>(path: string, init: RequestInit = {}, format: 'json' | 'blob' = 'json'): Promise<T> {
    const startEpoch = epoch;
    if (!userId) throw cancelled();
    const controller = new AbortController(); controllers.add(controller);
    try {
      const access = await options.getAccess();
      assertSession(startEpoch);
      if (!access || access.userId !== userId) throw cancelled();
      const headers = new Headers(init.headers);
      headers.set('Authorization', `Bearer ${access.token}`);
      if (init.body) headers.set('Content-Type', 'application/json');
      const response = await transport(`/api${path}`, { ...init, headers, signal: controller.signal, cache: 'no-store', credentials: 'omit' });
      assertSession(startEpoch);
      if (!response.ok) {
        const body = await response.json().catch(() => null) as { error?: string; message?: string } | null;
        assertSession(startEpoch);
        if (response.status === 401) options.onUnauthorized?.();
        throw new Error(body?.error || body?.message || `Request failed (${response.status}). Please try again.`);
      }
      const value = format === 'blob' ? await response.blob() : await response.text().then(text => text ? JSON.parse(text) : undefined);
      assertSession(startEpoch);
      return value as T;
    } finally { controllers.delete(controller); }
  }
  function publish(bootstrap: Bootstrap, id: number) {
    if (id < published) return;
    published = id; latestBootstrap = bootstrap; connection('');
    for (const listener of listeners) listener(bootstrap.state);
  }
  async function bootstrap() {
    const startEpoch = epoch;
    const id = ++sequence;
    const data = await request<Bootstrap>('/bootstrap');
    assertSession(startEpoch);
    publish(data, id);
    return latestBootstrap ?? data;
  }
  function schedule() {
    clearTimeout(timer);
    if (!userId || !listeners.size) return;
    const scheduledEpoch = epoch;
    timer = setTimeout(async () => {
      try { await bootstrap(); }
      catch (error) {
        if (scheduledEpoch === epoch && !(error instanceof DOMException && error.name === 'AbortError')) {
          connection('Progress updates are disconnected. Builds may still be running; reconnecting automatically.');
        }
      } finally { if (scheduledEpoch === epoch) schedule(); }
    }, options.pollInterval ?? 2500);
  }
  async function mutate<T>(path: string, body?: unknown, method = 'POST') {
    const startEpoch = epoch;
    const result = await request<T>(path, { method, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    assertSession(startEpoch);
    // Do not retry a successful mutation if its follow-up read temporarily fails.
    try { await bootstrap(); } catch { /* The polling loop retries the read. */ }
    assertSession(startEpoch);
    return result;
  }
  const projectPath = (id: string) => `/projects/${encodeURIComponent(id)}`;
  const unavailable = async (): Promise<never> => { throw new Error('This action is available in the desktop app.'); };
  const api: FleetAPI = {
    bootstrap,
    sendMessage: unavailable, cancelMessage: unavailable, answerClarification: unavailable,
    applyConversationAction: unavailable, dismissConversationAction: unavailable, requestChanges: unavailable,
    selectChatGPTAccount: unavailable, reopenChatGPTLogin: unavailable, manageChatGPTUsage: unavailable,
    visualReviewImage: unavailable,
    refreshNorfolkCatalog: () => mutate('/catalog/refresh'),
    createProject: input => mutate('/projects', input),
    updateProject: (id, input) => mutate(projectPath(id), input, 'PATCH'),
    startRun: id => mutate(`${projectPath(id)}/start`),
    stopRun: id => mutate(`${projectPath(id)}/pause`),
    resumeRun: id => mutate(`${projectPath(id)}/resume`),
    approve: (id, feedback) => mutate(`${projectPath(id)}/approve`, { feedback }),
    artifacts: id => request(`${projectPath(id)}/artifacts`),
    readArtifact: (id, path) => request(`${projectPath(id)}/artifact?path=${encodeURIComponent(path)}`),
    preview: async id => (await request<{ url: string | null }>(`${projectPath(id)}/preview`)).url,
    shareProject: async id => (await request<{ url: string }>(`${projectPath(id)}/share`, { method: 'POST' })).url,
    exportProject: async id => {
      const startEpoch = epoch;
      const blob = await request<Blob>(`${projectPath(id)}/export`, {}, 'blob');
      assertSession(startEpoch);
      const filename = `appyard-${id.replace(/[^a-zA-Z0-9-]/g, '')}.zip`;
      (options.download ?? downloadFile)(blob, filename);
      return filename;
    },
    downloadExecutable: unavailable,
    openWorkspace: unavailable,
    saveSettings: async (settings, apiKey) => {
      const startEpoch = epoch;
      const id = ++sequence;
      const result = await request<Bootstrap>('/settings', { method: 'POST', body: JSON.stringify({ settings, ...(apiKey ? { apiKey } : {}) }) });
      assertSession(startEpoch);
      publish(result, id); return result;
    },
    removeKey: async () => {
      const startEpoch = epoch;
      const id = ++sequence;
      const result = await request<Bootstrap>('/settings/key', { method: 'DELETE' });
      assertSession(startEpoch);
      publish(result, id); return result;
    },
    connectChatGPT: unavailable, cancelChatGPTLogin: unavailable, disconnectChatGPT: unavailable, refreshChatGPT: unavailable,
    onState: listener => {
      listeners.add(listener); schedule();
      return () => { listeners.delete(listener); if (!listeners.size) clearTimeout(timer); };
    }
  };
  return {
    api,
    setUserId(next: string | null) {
      if (next === userId) return;
      epoch++; userId = next; published = 0; latestBootstrap = undefined;
      clearTimeout(timer);
      for (const controller of controllers) controller.abort();
      controllers.clear(); listeners.clear(); connection('');
    },
    subscribeConnection(listener: (message: string) => void) {
      connectionListeners.add(listener); listener(connectionMessage);
      return () => { connectionListeners.delete(listener); };
    }
  };
}
