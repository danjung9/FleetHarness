import { contextBridge, ipcRenderer } from 'electron';
import type { AppState, NewProject, Settings } from '../shared/types.js';
import type { ClarificationAnswer } from '../shared/conversation.js';
contextBridge.exposeInMainWorld('fleetHarness', {
  sendMessage: (id: string, text: string) => ipcRenderer.invoke('fleet:conversation:send', id, text),
  cancelMessage: (id: string) => ipcRenderer.invoke('fleet:conversation:cancel', id),
  answerClarification: (id: string, questionId: string, answer: string | ClarificationAnswer) => ipcRenderer.invoke('fleet:conversation:answer', id, questionId, answer),
  applyConversationAction: (id: string, actionId: string) => ipcRenderer.invoke('fleet:conversation:apply', id, actionId),
  dismissConversationAction: (id: string, actionId: string) => ipcRenderer.invoke('fleet:conversation:dismiss', id, actionId),
  bootstrap: () => ipcRenderer.invoke('fleet:bootstrap'),
  refreshNorfolkCatalog: () => ipcRenderer.invoke('fleet:norfolk:refresh'),
  createProject: (input: NewProject) => ipcRenderer.invoke('fleet:create', input),
  updateProject: (id: string, input: NewProject) => ipcRenderer.invoke('fleet:update', id, input),
  startRun: (id: string) => ipcRenderer.invoke('fleet:start', id),
  resumeRun: (id: string) => ipcRenderer.invoke('fleet:resume', id),
  stopRun: (id: string) => ipcRenderer.invoke('fleet:stop', id),
  approve: (id: string, feedback: string) => ipcRenderer.invoke('fleet:approve', id, feedback),
  exportProject: (id: string) => ipcRenderer.invoke('fleet:export', id),
  downloadExecutable: (id: string) => ipcRenderer.invoke('fleet:download-executable', id),
  artifacts: (id: string) => ipcRenderer.invoke('fleet:artifacts', id),
  readArtifact: (id: string, file: string) => ipcRenderer.invoke('fleet:read', id, file),
  preview: (id: string) => ipcRenderer.invoke('fleet:preview', id),
  openWorkspace: (id: string) => ipcRenderer.invoke('fleet:open', id),
  setDeveloperMode: (enabled: boolean) => ipcRenderer.invoke('fleet:developer-mode', enabled),
  saveSettings: (settings: Settings, apiKey?: string) => ipcRenderer.invoke('fleet:settings', settings, apiKey),
  connectChatGPT: (accountId?: string) => ipcRenderer.invoke('fleet:chatgpt:connect', accountId),
  selectChatGPTAccount: (accountId: string) => ipcRenderer.invoke('fleet:chatgpt:select', accountId),
  reopenChatGPTLogin: () => ipcRenderer.invoke('fleet:chatgpt:reopen'),
  manageChatGPTUsage: () => ipcRenderer.invoke('fleet:chatgpt:usage'),
  connectCodexKey: (apiKey: string) => ipcRenderer.invoke('fleet:codex:connect-key', apiKey),
  cancelChatGPTLogin: () => ipcRenderer.invoke('fleet:chatgpt:cancel'),
  disconnectChatGPT: () => ipcRenderer.invoke('fleet:chatgpt:disconnect'),
  refreshChatGPT: () => ipcRenderer.invoke('fleet:chatgpt:refresh'),
  onState: (callback: (state: AppState) => void) => {
    const listener = (_event: unknown, state: AppState) => callback(state);
    ipcRenderer.on('fleet:state', listener); return () => ipcRenderer.removeListener('fleet:state', listener);
  }
});
