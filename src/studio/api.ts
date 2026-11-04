import type { AppState, FleetAPI, NewProject, Project } from '../../shared/types';
import { stageDefinitions } from '../../shared/types';

export const isDesktop = Boolean(window.fleetHarness);
const key = 'fleetharness-studio-preview-v1';
let state: AppState = { version: 1, projects: [], settings: { provider: '', model: '', rememberKey: false } };
if (!isDesktop) {
  try { const saved = JSON.parse(localStorage.getItem(key) || 'null'); if (saved?.version === 1 && Array.isArray(saved.projects)) state = saved; } catch { /* Start with an empty preview. */ }
}
const listeners = new Set<(value: AppState) => void>();
function save(next: AppState) {
  localStorage.setItem(key, JSON.stringify(next));
  state = next;
  listeners.forEach(fn => fn(structuredClone(state)));
}
function makeProject(input: NewProject): Project {
  return { ...input, id: crypto.randomUUID(), status: 'draft', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), stages: structuredClone(stageDefinitions), logs: [], feedback: '' };
}
const desktopOnly = async (): Promise<never> => { throw new Error('Run npm run studio to generate software with the desktop build engines. Your browser brief stays saved here.'); };
export const api: FleetAPI = window.fleetHarness || {
  bootstrap: async () => ({ state: structuredClone(state), models: [], storagePath: 'This browser · separate Studio storage', credentialStatus: 'Browser preview', runtime: 'Browser preview' }),
  createProject: async input => { const p = makeProject(input); save({ ...state, projects: [p, ...state.projects] }); return structuredClone(p); },
  updateProject: async (id, input) => {
    const old = state.projects.find(p => p.id === id); if (!old) throw new Error('This build could not be found.');
    const p: Project = { ...old, ...input, status: 'draft', updatedAt: new Date().toISOString(), stages: structuredClone(stageDefinitions), report: undefined, approvedAt: undefined, exportedTo: undefined, error: undefined, systemDesign: undefined, phasePlan: undefined, globalTools: undefined };
    save({ ...state, projects: state.projects.map(item => item.id === id ? p : item) }); return structuredClone(p);
  },
  startRun: desktopOnly, stopRun: desktopOnly, approve: desktopOnly, exportProject: desktopOnly,
  openWorkspace: desktopOnly, readArtifact: desktopOnly, saveSettings: desktopOnly,
  artifacts: async () => [], preview: async () => null,
  connectChatGPT: desktopOnly, cancelChatGPTLogin: desktopOnly, disconnectChatGPT: desktopOnly, refreshChatGPT: desktopOnly,
  onState: fn => { listeners.add(fn); return () => { listeners.delete(fn); }; }
};
