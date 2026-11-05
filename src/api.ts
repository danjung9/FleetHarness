import type { AppState, FleetAPI, NewProject, Project } from '../shared/types';
import { stageDefinitions, starters } from '../shared/types';
import { normalizeProjectInput } from '../shared/project-input';
import { getChallenge } from '../harness/catalog';
import { withDesktopCompatibility } from '../shared/desktop-api';
export const isDesktop = !!window.fleetHarness;
function makeProject(input: NewProject): Project {
  const normalized = normalizeProjectInput(input);
  return { ...normalized, sourceChallenge: normalized.challengeId ? getChallenge(normalized.challengeId, browserState?.norfolkCatalog?.challenges) : undefined,
    id: crypto.randomUUID(), status: 'draft', stages: structuredClone(stageDefinitions),
    logs: [], feedback: '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
}
const empty = (): AppState => ({ version: 1, settings: { provider: '', model: '', rememberKey: false, developerMode: false }, projects: starters.map(makeProject) });
let browserState: AppState;
try { browserState = JSON.parse(localStorage.getItem('fleet-browser-preview') || 'null') || empty(); } catch { browserState = empty(); }
browserState.settings.developerMode = browserState.settings.developerMode === true;
const listeners = new Set<(state: AppState) => void>();
function save(nextState: AppState) {
  localStorage.setItem('fleet-browser-preview', JSON.stringify(nextState));
  browserState = nextState;
  for (const fn of listeners) fn(structuredClone(browserState));
}
const desktopOnly = async (): Promise<never> => { throw new Error('Open the AppYard desktop app to run coding agents and access local artifacts.'); };
export const api: FleetAPI = window.fleetHarness ? withDesktopCompatibility(window.fleetHarness) : {
  sendMessage: desktopOnly,
  cancelMessage: desktopOnly,
  answerClarification: desktopOnly,
  applyConversationAction: desktopOnly,
  dismissConversationAction: desktopOnly,
  bootstrap: async () => ({ state: structuredClone(browserState), models: [], storagePath: 'Browser preview — local to this browser', credentialStatus: 'Desktop app required', runtime: 'Browser preview' }),
  refreshNorfolkCatalog: desktopOnly,
  createProject: async input => { const p = makeProject(input); save({ ...browserState, projects: [p, ...browserState.projects] }); return p; },
  updateProject: async (id, input) => {
    const nextState = structuredClone(browserState);
    const p = nextState.projects.find(p => p.id === id);
    if (!p) throw new Error('Challenge not found.');
    const normalized = normalizeProjectInput(input);
    const sourceChallenge = normalized.challengeId ? p.sourceChallenge?.id === normalized.challengeId ? p.sourceChallenge : getChallenge(normalized.challengeId, browserState.norfolkCatalog?.challenges) : undefined;
    Object.assign(p, normalized, { sourceChallenge, updatedAt: new Date().toISOString() });
    p.status = 'draft'; p.report = undefined; p.approvedAt = undefined; p.exportedTo = undefined; p.executable = undefined; p.error = undefined;
    p.systemDesign = undefined; p.phasePlan = undefined; p.globalTools = undefined;
    p.stages.forEach(stage => { stage.status = stage.id === 'intake' ? 'complete' : 'queued'; });
    save(nextState); return p;
  },
  startRun: desktopOnly, stopRun: desktopOnly, approve: desktopOnly, requestChanges: desktopOnly, exportProject: desktopOnly, downloadExecutable: desktopOnly, openWorkspace: desktopOnly,
  artifacts: async () => [], readArtifact: desktopOnly, preview: async () => null, saveSettings: desktopOnly,
  setDeveloperMode: async enabled => {
    if (typeof enabled !== 'boolean') throw new Error('Developer mode must be enabled or disabled.');
    const nextState = { ...browserState, settings: { ...browserState.settings, developerMode: enabled } };
    localStorage.setItem('fleet-browser-preview', JSON.stringify(nextState));
    browserState = nextState;
    for (const fn of listeners) fn(structuredClone(browserState));
    return api.bootstrap();
  },
  connectChatGPT: desktopOnly, cancelChatGPTLogin: desktopOnly, disconnectChatGPT: desktopOnly, refreshChatGPT: desktopOnly,
  selectChatGPTAccount: desktopOnly, reopenChatGPTLogin: desktopOnly, manageChatGPTUsage: desktopOnly,
  onState: fn => { listeners.add(fn); return () => { listeners.delete(fn); }; }
};
