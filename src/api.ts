import type { AppState, FleetAPI, NewProject, Project } from '../shared/types';
import { stageDefinitions, starters } from '../shared/types';
export const isDesktop = !!window.fleetHarness;
function makeProject(input: NewProject): Project {
  return { ...input, id: crypto.randomUUID(), status: 'draft', stages: structuredClone(stageDefinitions),
    logs: [], feedback: '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
}
const empty = (): AppState => ({ version: 1, settings: { provider: '', model: '', rememberKey: false }, projects: starters.map(makeProject) });
let browserState: AppState;
try { browserState = JSON.parse(localStorage.getItem('fleet-browser-preview') || 'null') || empty(); } catch { browserState = empty(); }
const listeners = new Set<(state: AppState) => void>();
function save() {
  localStorage.setItem('fleet-browser-preview', JSON.stringify(browserState));
  for (const fn of listeners) fn(structuredClone(browserState));
}
const desktopOnly = async (): Promise<never> => { throw new Error('Open the FleetHarness desktop app to run Pi agents and access local artifacts.'); };
export const api: FleetAPI = window.fleetHarness || {
  bootstrap: async () => ({ state: structuredClone(browserState), models: [], storagePath: 'Browser preview — local to this browser', credentialStatus: 'Desktop app required for Pi', runtime: 'Browser preview' }),
  createProject: async input => { const p = makeProject(input); browserState.projects.unshift(p); save(); return p; },
  updateProject: async (id, input) => { const p = browserState.projects.find(p => p.id === id)!; Object.assign(p, input); p.systemDesign = undefined; save(); return p; },
  startRun: desktopOnly, stopRun: desktopOnly, approve: desktopOnly, exportProject: desktopOnly, openWorkspace: desktopOnly,
  artifacts: async () => [], readArtifact: desktopOnly, preview: async () => null, saveSettings: desktopOnly,
  onState: fn => { listeners.add(fn); return () => { listeners.delete(fn); }; }
};
