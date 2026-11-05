import { useState } from 'react';
import { ArrowRight, Download, Pause, Play, ShieldCheck } from 'lucide-react';
import type { Project, View } from '../shared/types';
import type { TestReport as HostedTestReport } from '../worker/runtime/shared/types';
import { reportPassed } from '../worker/runtime/shared/verification';
import { api } from './api';
import { QualityEvidence } from './QualityEvidence';

type Action = (work: () => Promise<unknown>, success?: string) => Promise<boolean>;
export function HostedJourney({ project, view, busy, configured, resuming, navigate, start, resume, stop }: {
  project: Project; view: View; busy: boolean; configured: boolean; resuming: boolean;
  navigate: (view: View) => void; start: () => void; resume: () => void; stop: () => void;
}) {
  const steps = [['requirements', 'Brief'], ['factory', 'Build'], ['evidence', 'Review'], ['delivery', 'Deliver']] as const;
  const running = project.status === 'running', pausing = project.status === 'pausing';
  const canResume = project.canResume && !running && !pausing;
  const message = running ? 'Building in a cloud sandbox. You can close this page or sign out.'
    : pausing ? 'Saving a durable checkpoint before pausing.'
    : canResume ? 'Your checkpoint is saved. Resume continues with the original model.'
    : project.approvedAt ? 'Approved for prototype delivery.'
    : project.report ? 'Inspect the app and its verification evidence before approval.'
    : 'Your brief is saved to your account.';
  return <section className="journey-header" aria-label="Build progress"><div className="journey-context">
    <nav className="journey-steps" aria-label="Project journey">{steps.map(([target, label], index) => <div className="journey-step" key={target}>
      <button aria-pressed={view === target} className={view === target ? 'is-viewed' : ''} onClick={() => navigate(target)}><span className="journey-index">{index + 1}</span>{label}</button>
    </div>)}</nav><p className="journey-message" role="status">{message}</p>
  </div><div className="journey-action">{running || pausing
    ? <button className="secondary" disabled={busy || pausing} onClick={stop}><Pause size={15}/>{pausing ? 'Saving checkpoint…' : 'Pause build'}</button>
    : canResume ? <button className="primary" disabled={busy || resuming} onClick={() => configured ? resume() : navigate('settings')}><Play size={15}/>{resuming ? 'Resuming…' : configured ? 'Resume build' : 'Connect model to resume'}</button>
    : project.report ? <button className="primary" onClick={() => navigate(project.approvedAt ? 'delivery' : 'evidence')}>{project.approvedAt ? 'View delivery' : 'Review build'}<ArrowRight size={15}/></button>
    : <button className="primary" disabled={busy} onClick={() => configured ? start() : navigate('settings')}><Play size={15}/>{configured ? 'Start build' : 'Connect model'}</button>}
  </div></section>;
}

export function HostedReview({ project, busy, action, onPreview }: { project: Project; busy: boolean; action: Action; onPreview: () => void }) {
  const [feedback, setFeedback] = useState(project.feedback || '');
  const [reviewed, setReviewed] = useState(false), [shareUrl, setShareUrl] = useState('');
  const legacyReport = !project.report?.quality || project.report.quality.schemaVersion === 1;
  const passed = legacyReport && reportPassed(project.report as HostedTestReport | undefined, project.qualityVersion === 1);
  return <div className="page evidence-page"><div className="page-heading"><div><h1>Review & delivery</h1><p>Inspect the hosted build and its independently verified evidence.</p></div><button className="secondary" onClick={onPreview}>Open preview</button></div>
    {!project.report ? <p className="muted">Test evidence appears after verification. Builds and checkpoints remain saved to your account.</p> : <>
      <section className="evidence-summary"><h2>{passed ? 'Automated checks passed' : 'Verification needs attention'}</h2><p>{project.report.passed} tests passed · {project.report.failed} failed · {project.report.skipped} skipped</p></section>
      <details className="output-details"><summary>Test runner output</summary><pre>{project.report.output}</pre></details>
      <QualityEvidence report={project.report.quality}/>
      <section className="review-form"><div><h2>Human review</h2><p>Try the app and note its limitations before approving this prototype.</p><ul>{project.criteria.map((criterion, index) => <li key={index}>{criterion}</li>)}</ul></div><div>
        <label>Review notes<textarea rows={5} maxLength={8000} value={feedback} disabled={!!project.approvedAt} onChange={event => setFeedback(event.target.value)}/></label>
        {!project.approvedAt && <label className="checkbox"><input type="checkbox" checked={reviewed} onChange={event => setReviewed(event.target.checked)}/>I inspected the application, test evidence, and limitations.</label>}
        {project.approvedAt ? <p className="approval-note"><ShieldCheck size={17}/>Approved for prototype delivery</p> : <button className="primary full-width" disabled={!passed || !reviewed || feedback.trim().length < 10 || busy || ['running', 'pausing'].includes(project.status)} onClick={() => void action(() => api.approve(project.id, feedback), 'Prototype approved for delivery.')}><ShieldCheck size={16}/>Approve prototype</button>}
        <button className="secondary full-width" disabled={!project.approvedAt || busy} onClick={() => void action(() => api.exportProject(project.id), 'Source and evidence ZIP downloaded.')}><Download size={16}/>Download source & evidence ZIP</button>
        {api.shareProject && <button className="secondary full-width" disabled={!project.approvedAt || busy} onClick={() => void action(async () => setShareUrl(await api.shareProject!(project.id)))}>Create result link</button>}
        {shareUrl && <p><a href={shareUrl} target="_blank" rel="noreferrer">Open shared app</a></p>}
      </div></section>
    </>}
  </div>;
}
