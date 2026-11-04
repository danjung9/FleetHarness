import type { AppState, FleetAPI, NewProject, Project } from '../../shared/types';
import { stageDefinitions } from '../../shared/types';
import { validateBrief } from './brief';

export const isDesktop = Boolean(window.fleetHarness);
const key = 'fleetharness-workbench-v1';
let state: AppState = { version: 1, projects: [], settings: { provider: '', model: '', rememberKey: false } };
if (!isDesktop) {
  try {
    const saved = JSON.parse(localStorage.getItem(key) || 'null');
    if (saved?.version === 1 && Array.isArray(saved.projects) && saved.settings) state = saved;
  } catch { /* Storage access errors are surfaced when saving. */ }
}
const listeners = new Set<(value: AppState) => void>();
function save(next: AppState) {
  try { localStorage.setItem(key, JSON.stringify(next)); }
  catch { throw new Error('Your browser could not save this brief. Download a copy, or enable local storage and try again.'); }
  state = next;
  listeners.forEach(fn => fn(structuredClone(state)));
}
function checked(input: NewProject) { const error = validateBrief(input); if (error) throw new Error(error); return { ...input, title: input.title.trim(), description: input.description.trim(), criteria: input.criteria.map(c => c.trim()) }; }
const desktopOnly = async (): Promise<never> => { throw new Error('Open Workbench on desktop with npm run workbench to run agents and inspect local artifacts.'); };
export const api: FleetAPI = window.fleetHarness || {
  bootstrap: async () => ({ state: structuredClone(state), models: [], storagePath: 'This browser · Workbench storage', credentialStatus: 'Desktop connection required', runtime: 'Browser preview' }),
  createProject: async input => {
    const now = new Date().toISOString();
    const p: Project = { ...checked(input), id: crypto.randomUUID(), createdAt: now, updatedAt: now, status: 'draft', stages: structuredClone(stageDefinitions), logs: [], feedback: '' };
    save({ ...state, projects: [p, ...state.projects] }); return structuredClone(p);
  },
  updateProject: async (id, input) => {
    const old = state.projects.find(p => p.id === id);
    if (!old) throw new Error('This build could not be found. Return to My builds and select it again.');
    if (old.status === 'running') throw new Error('Stop the build before editing its brief.');
    const p: Project = { ...old, ...checked(input), status: 'draft', updatedAt: new Date().toISOString(), stages: structuredClone(stageDefinitions), report: undefined, approvedAt: undefined, exportedTo: undefined, error: undefined, systemDesign: undefined, phasePlan: undefined, globalTools: undefined, feedback: '' };
    save({ ...state, projects: state.projects.map(item => item.id === id ? p : item) }); return structuredClone(p);
  },
  startRun: desktopOnly, stopRun: desktopOnly, approve: desktopOnly, exportProject: desktopOnly, downloadExecutable: desktopOnly,
  openWorkspace: desktopOnly, readArtifact: desktopOnly, saveSettings: desktopOnly,
  artifacts: async () => [], preview: async () => null,
  connectChatGPT: desktopOnly, cancelChatGPTLogin: desktopOnly, disconnectChatGPT: desktopOnly, refreshChatGPT: desktopOnly,
  onState: fn => { listeners.add(fn); return () => { listeners.delete(fn); }; }
};
