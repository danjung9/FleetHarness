import type { AppState, FleetAPI, NewProject, Project } from '../shared/types';
import { stageDefinitions, starters } from '../shared/types';
import { normalizeProjectInput } from '../shared/project-input';
import { getChallenge } from '../harness/catalog';
import { isHosted } from './hosted-config';
import { hostedClient } from './hosted-api';
export { isHosted } from './hosted-config';
export const isDesktop = !!window.fleetHarness;
function makeProject(input: NewProject): Project {
  const normalized = normalizeProjectInput(input);
  return { ...normalized, sourceChallenge: normalized.challengeId ? getChallenge(normalized.challengeId, browserState?.norfolkCatalog?.challenges) : undefined,
    id: crypto.randomUUID(), status: 'draft', stages: structuredClone(stageDefinitions),
    logs: [], feedback: '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
}
const empty = (): AppState => ({ version: 1, settings: { provider: '', model: '', rememberKey: false }, projects: starters.map(makeProject) });
let browserState: AppState;
if (!isHosted) {
  try { browserState = JSON.parse(localStorage.getItem('fleet-browser-preview') || 'null') || empty(); } catch { browserState = empty(); }
}
const listeners = new Set<(state: AppState) => void>();
function save() {
  localStorage.setItem('fleet-browser-preview', JSON.stringify(browserState));
  for (const fn of listeners) fn(structuredClone(browserState));
}
const desktopOnly = async (): Promise<never> => { throw new Error('Open the AppYard desktop app to run coding agents and access local artifacts.'); };
export const api: FleetAPI = window.fleetHarness || (isHosted ? hostedClient.api : {
  bootstrap: async () => ({ state: structuredClone(browserState), models: [], storagePath: 'Browser preview — local to this browser', credentialStatus: 'Desktop app required', runtime: 'Browser preview' }),
  refreshNorfolkCatalog: desktopOnly,
  createProject: async input => { const p = makeProject(input); browserState.projects.unshift(p); save(); return p; },
  updateProject: async (id, input) => {
    const p = browserState.projects.find(p => p.id === id)!;
    const normalized = normalizeProjectInput(input);
    const sourceChallenge = normalized.challengeId ? p.sourceChallenge?.id === normalized.challengeId ? p.sourceChallenge : getChallenge(normalized.challengeId, browserState.norfolkCatalog?.challenges) : undefined;
    Object.assign(p, normalized, { sourceChallenge }); p.systemDesign = undefined; p.phasePlan = undefined; p.globalTools = undefined; save(); return p;
  },
  startRun: desktopOnly, stopRun: desktopOnly, approve: desktopOnly, exportProject: desktopOnly, downloadExecutable: desktopOnly, openWorkspace: desktopOnly,
  artifacts: async () => [], readArtifact: desktopOnly, preview: async () => null, saveSettings: desktopOnly,
  connectChatGPT: desktopOnly, cancelChatGPTLogin: desktopOnly, disconnectChatGPT: desktopOnly, refreshChatGPT: desktopOnly,
  onState: fn => { listeners.add(fn); return () => { listeners.delete(fn); }; }
});
