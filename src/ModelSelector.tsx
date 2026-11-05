import { codexGoalActive } from '../shared/codex-goal';
import { useId } from 'react';
import { ChevronDown } from 'lucide-react';
import type { AgentModel, Bootstrap, FleetAPI } from '../shared/types';
import { resolveReasoningEffort, supportedReasoningEfforts } from '../shared/reasoning';
import { experimentRunning } from '../shared/journey';
import { ReasoningBar } from './ReasoningBar';
import './model-selector.css';

type Action = (task: () => Promise<unknown>, success?: string) => Promise<boolean>;
const modelValue = (model: { provider: string; id: string }) => JSON.stringify([model.provider, model.id]);

export function ModelSelector({ data, api, busy, action, updated, desktop, openSettings }: {
  data: Bootstrap; api: FleetAPI; busy: boolean; action: Action;
  updated: (value: Bootstrap) => void; desktop: boolean; openSettings: () => void;
}) {
  const id = useId();
  const settings = data.state.settings;
  const backend = settings.backend ?? (settings.provider ? 'pi' : 'codex');
  const models = data.models.filter(model => (model.backend ?? 'pi') === backend);
  const selected = models.find(model => model.provider === settings.provider && model.id === settings.model);
  const connected = models.filter(model => model.configured);
  const providers = [...new Set(connected.map(model => model.provider))];
  const value = settings.model ? modelValue({ provider: settings.provider, id: settings.model }) : '';
  const running = data.state.projects.some(project => project.status === 'running' || codexGoalActive(project.codexGoal) || experimentRunning(project.experiment) || project.conversation?.status === 'responding');
  const levels = supportedReasoningEfforts(selected);
  const effort = resolveReasoningEffort(selected, settings.reasoningEffort);
  const reasoningHint = running ? 'Wait for active work to finish before changing reasoning effort.'
    : !desktop ? 'Open the desktop app to adjust reasoning effort.'
    : !selected?.configured ? 'Connect a model to adjust reasoning effort.'
    : levels.length < 2 ? 'This model does not offer adjustable reasoning effort.'
    : 'Lower effort favors speed. Higher effort allows more thinking and can use more tokens. Applies when you start or resume work.';
  const description = running ? 'Stop active builds to change models.'
    : !desktop ? 'Open the desktop app to connect a model.'
    : selected?.configured ? 'Used for new builds. Completed builds keep their recorded model.'
    : 'Connect a provider in model settings to run builds.';

  function choose(model: AgentModel) {
    if (!desktop || busy || running || modelValue(model) === value) return;
    void action(async () => {
      updated(await api.saveSettings({ ...settings, backend, provider: model.provider, model: model.id,
        reasoningEffort: settings.reasoningEffort === undefined ? undefined : resolveReasoningEffort(model, settings.reasoningEffort) }));
    }, `Model changed to ${model.name}.`);
  }

  return <div className="model-controls"><div className="model-selector">
    <label htmlFor={id} title={`Model account${settings.provider ? ` · ${settings.provider}` : ''}`}>
      Build model{settings.provider && <span> · {settings.provider}</span>}{running && <span> · In use</span>}
    </label>
    <div className="model-selector-control">
      <select id={id} aria-label="Build model" aria-describedby={`${id}-hint`} value={value}
        disabled={busy || running} title={`${selected?.name || settings.model || 'Choose a model'}${settings.model ? ` (${settings.provider}/${settings.model})` : ''}. ${description}`}
        onChange={event => {
          if (event.target.value === 'settings') { openSettings(); return; }
          const model = connected.find(model => modelValue(model) === event.target.value);
          if (model) choose(model);
        }}>
        {!settings.model && <option value="" disabled>Choose a model</option>}
        {settings.model && !selected?.configured && <option value={value} disabled>{selected?.name || settings.model} · not connected</option>}
        {providers.map(provider => <optgroup key={provider} label={provider}>
          {connected.filter(model => model.provider === provider).map(model => <option key={model.id} value={modelValue(model)}>{model.name}</option>)}
        </optgroup>)}
        <option value="settings">{backend === 'pi' ? 'Connect a provider…' : 'Model settings…'}</option>
      </select>
      <ChevronDown className="model-selector-chevron" size={14} strokeWidth={1.75} aria-hidden="true"/>
    </div>
    <span id={`${id}-hint`} className="model-selector-hint">{description}</span>
  </div><ReasoningBar levels={levels} value={effort} disabled={busy || running || !desktop || !selected?.configured} hint={reasoningHint}
    onChange={next => action(async () => { updated(await api.saveSettings({ ...settings, reasoningEffort: next })); })}/></div>;
}
