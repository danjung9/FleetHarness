import { useId } from 'react';
import { ArrowRight } from 'lucide-react';
import type { Bootstrap, FleetAPI } from '../shared/types';
import { resolveReasoningEffort, supportedReasoningEfforts } from '../shared/reasoning';
import { experimentRunning } from '../shared/journey';
import { ReasoningBar } from './ReasoningBar';
import './model-selector.css';

type Action = (task: () => Promise<unknown>, success?: string) => Promise<boolean>;

export function ModelSelector({ data, api, busy, action, updated, desktop, openSettings, compact = false }: {
  data: Bootstrap; api: FleetAPI; busy: boolean; action: Action;
  updated: (value: Bootstrap) => void; desktop: boolean; openSettings: () => void; compact?: boolean;
}) {
  const id = useId();
  const settings = data.state.settings;
  const backend = settings.backend ?? (settings.provider ? 'pi' : 'opencode');
  const models = data.models.filter(model => (model.backend ?? 'pi') === backend);
  const selected = models.find(model => model.provider === settings.provider && model.id === settings.model);
  const running = data.state.projects.some(project => project.status === 'running' || experimentRunning(project.experiment) || project.conversation?.status === 'responding');
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


  return <div className="model-controls"><div className="model-selector">
    <label className={compact ? 'sr-only' : undefined} htmlFor={id} title={`Model account${settings.provider ? ` · ${settings.provider}` : ''}`}>
      Build model{settings.provider && <span> · {settings.provider.startsWith('opencode') ? 'Hosted models' : settings.provider}</span>}{running && <span> · In use</span>}
    </label>
    <div className="model-selector-control">
      <button id={id} type="button" className="model-connect-button" aria-label="Build model" aria-describedby={compact ? undefined : `${id}-hint`} disabled={busy || running} onClick={openSettings}>
        <span>{selected?.name || settings.model || 'Connect a model'}</span><ArrowRight size={14} aria-hidden="true"/>
      </button>
    </div>
    {!compact && <span id={`${id}-hint`} className="model-selector-hint">{description}</span>}
  </div>{!compact && <ReasoningBar levels={levels} value={effort} disabled={busy || running || !desktop || !selected?.configured} hint={reasoningHint}
    onChange={next => action(async () => { updated(await api.saveSettings({ ...settings, reasoningEffort: next })); })}/>}</div>;
}
