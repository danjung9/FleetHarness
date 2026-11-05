import { useEffect, useId, useState } from 'react';
import { CheckCircle2, ClipboardCheck, Code2, Download, ShieldCheck, XCircle } from 'lucide-react';
import type { Project } from '../shared/types';
import { reportPassed } from '../shared/verification';
import { api, isDesktop } from './api';
import { ExecutableDownload } from './ExecutableDownload';
import { QualityEvidence } from './QualityEvidence';
import './review-flow.css';

type Action = (work: () => Promise<unknown>, success?: string) => Promise<boolean>;
type ReviewProps = { project: Project; busy: boolean; action: Action; onPreview: () => void; onApproved: () => void };
type DeliveryProps = { project: Project; busy: boolean; action: Action; onReview: () => void };
type ReviewDraft = { feedback: string; reviewed: boolean };
const reviewDrafts = new Map<string, ReviewDraft>();
const draftKey = (project: Project) => `appyard-review:${project.id}:${project.runId || 'unstarted'}`;
const date = (value: string) => new Date(value).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

function readDraft(key: string, project: Project): ReviewDraft {
  const inMemory = reviewDrafts.get(key);
  if (inMemory) return inMemory;
  try {
    const saved: unknown = JSON.parse(sessionStorage.getItem(key) || 'null');
    if (saved && typeof saved === 'object' && 'feedback' in saved && 'reviewed' in saved
      && typeof saved.feedback === 'string' && saved.feedback.length <= 10000 && typeof saved.reviewed === 'boolean') {
      return { feedback: saved.feedback, reviewed: saved.reviewed };
    }
  } catch { /* Keep the in-memory draft if session storage is unavailable. */ }
  return { feedback: project.approvedAt ? project.feedback : '', reviewed: false };
}

export function ReviewWorkspace(props: ReviewProps) {
  return <ReviewContent key={draftKey(props.project)} {...props}/>;
}

function ReviewContent({ project, busy, action, onPreview, onApproved }: ReviewProps) {
  const key = draftKey(project);
  const [draft, setDraft] = useState(() => readDraft(key, project));
  const [approving, setApproving] = useState(false);
  const [approvalSubmitted, setApprovalSubmitted] = useState(false);
  const noteId = useId();
  const gateId = useId();
  const report = project.report;
  const passed = reportPassed(report, project.qualityVersion !== undefined);
  const unverified = report?.quality?.criteria.filter(criterion => criterion.status === 'unverified').length || 0;
  const approved = !!project.approvedAt;

  useEffect(() => {
    if (approved) {
      reviewDrafts.delete(key);
      try { sessionStorage.removeItem(key); } catch { /* Storage may be disabled. */ }
      return;
    }
    reviewDrafts.set(key, draft);
    try { sessionStorage.setItem(key, JSON.stringify(draft)); } catch { /* The draft remains available during this session. */ }
  }, [key, draft, approved]);

  useEffect(() => {
    if (approvalSubmitted && approved) onApproved();
  }, [approvalSubmitted, approved, onApproved]);

  const unmetCondition = project.status === 'running' ? 'Wait for this build to finish before approving.'
    : !isDesktop ? 'Open this challenge in the AppYard desktop app to approve it.'
      : !passed || !project.workspace ? 'Resolve failed or missing checks with a new build before approval.'
        : draft.feedback.trim().length < 10 ? 'Add at least 10 characters describing what you checked and any limitations.'
          : !draft.reviewed ? 'Confirm that you inspected the app, test evidence, and limitations.' : '';

  async function approve() {
    if (busy || approving || approved || unmetCondition) return;
    setApproving(true);
    const success = await action(() => api.approve(project.id, draft.feedback), 'Prototype approved for delivery.');
    if (success) setApprovalSubmitted(true);
    else setApproving(false);
  }

  return <div className="page review-workspace">
    <div className="review-content">
      <div className="page-heading"><div><h1>Review</h1><p>{approved ? 'Your review is recorded for this build.' : 'Try the app and inspect its evidence before approving the prototype.'}</p></div></div>
      {!report ? <div className="review-empty"><ClipboardCheck size={26}/><h2>No test evidence yet</h2><p>{project.status === 'running' ? 'The build is still running. Review will be ready after verification.' : 'Test results appear after a build reaches verification.'}</p></div> : <ol className="review-steps">
        <li>
          <div className="review-step-heading"><div><h2>Try the app</h2><p>Use the main workflow and check the result against your brief.</p></div><button className="secondary" onClick={onPreview}><Code2 size={16}/>Open preview</button></div>
        </li>
        <li>
          <h2>Check evidence and limitations</h2>
          <div className={'review-check-result ' + (passed ? 'passed' : 'failed')}>
            {passed ? <CheckCircle2 size={18}/> : <XCircle size={18}/>}
            <p><strong>{passed ? 'Automated checks passed' : 'Verification needs attention'}</strong><span>Node tests: {report.passed} passed · {report.failed} failed · {report.skipped} skipped{report.quality && <> · Browser journeys: {report.quality.journeys.filter(journey => journey.status === 'passed').length}/{report.quality.journeys.length} passed</>}</span></p>
          </div>
          <details className="review-evidence" open={!passed}>
            <summary>Inspect test evidence{unverified > 0 && <span className="review-unverified"> · {unverified} {unverified === 1 ? 'requirement' : 'requirements'} unverified</span>}</summary>
            <div className="review-evidence-content">
              <QualityEvidence report={report.quality}/>
              {!report.quality && <div className="review-criteria"><h3>Check against your brief</h3><ul>{project.criteria.map((criterion, index) => <li key={index}>{criterion}</li>)}</ul></div>}
              <details className="output-details" open={!passed}><summary>Test runner output <span>Exit {report.exitCode ?? 'terminated'}</span></summary><code>{report.command}</code><pre>{report.output}</pre></details>
              <p className="review-report-time">Verified {date(report.time)} · {(report.durationMs / 1000).toFixed(2)}s</p>
            </div>
          </details>
          <p className="review-limitations"><strong>Operational readiness is unverified.</strong> Synthetic tests and prototype review do not validate production integrations, security accreditation, or field performance.</p>
        </li>
        <li>
          <h2>{approved ? 'Review recorded' : 'Record your review'}</h2>
          {approved ? <><p className="review-recorded-notes">{project.feedback}</p><p className="approval-note"><ShieldCheck size={17}/>Approved for prototype delivery · {date(project.approvedAt!)}</p></> : <>
            <label htmlFor={noteId}>Review notes</label>
            <textarea id={noteId} rows={3} maxLength={10000} value={draft.feedback} disabled={approving} onChange={event => setDraft(current => ({ ...current, feedback: event.target.value }))} placeholder="What did you try? What worked, and what still needs domain validation?"/>
            <label className="checkbox"><input type="checkbox" checked={draft.reviewed} disabled={approving} onChange={event => setDraft(current => ({ ...current, reviewed: event.target.checked }))}/>I inspected the application, test evidence, and limitations.</label>
            <div className="review-decision"><button className="primary" disabled={busy || approving || !!unmetCondition} aria-describedby={unmetCondition ? gateId : undefined} onClick={() => void approve()}><ShieldCheck size={16}/>{approving ? 'Approving…' : 'Approve prototype'}</button>{unmetCondition && <p id={gateId}>{unmetCondition}</p>}</div>
          </>}
        </li>
      </ol>}
    </div>
  </div>;
}

export function DeliveryWorkspace(props: DeliveryProps) {
  return <DeliveryContent key={draftKey(props.project)} {...props}/>;
}

function DeliveryContent({ project, busy, action, onReview }: DeliveryProps) {
  const [notice, setNotice] = useState<{ text: string; failed: boolean } | null>(null);
  const packaging = project.executable?.status === 'packaging';
  const approved = !!project.approvedAt;
  const savedApp = project.executable?.status === 'ready' && !!project.executable.savedTo;

  async function deliver(work: () => Promise<unknown>, kind: 'download' | 'export') {
    setNotice(null);
    const success = await action(async () => {
      const result = await work();
      if (result === null) setNotice({ text: kind === 'download' ? 'Download cancelled. No new app was saved.' : 'Export cancelled. No new source bundle was saved.', failed: false });
      return result;
    });
    if (!success) setNotice({ text: kind === 'download' ? 'The app download did not complete. Try again.' : 'The source and evidence export did not complete. Try again.', failed: true });
    return success;
  }

  return <div className="page delivery-workspace"><div className="delivery-content">
    <div className="page-heading"><div><h1>Deliver</h1><p>{approved ? 'Save the approved prototype to your computer.' : 'Approve your prototype before downloading it.'}</p></div></div>
    {!approved ? <div className="review-empty"><ShieldCheck size={26}/><h2>{project.report ? 'Review comes first' : 'Nothing to deliver yet'}</h2><p>{project.report ? 'Try the app and record your review to make this build available for download.' : 'Build and review an app before downloading it.'}</p><button className="secondary" onClick={onReview}>Go to review</button></div> : <>
      <section className="delivery-app" aria-labelledby="delivery-app-heading">
        <h2 id="delivery-app-heading">{savedApp ? 'Your app is saved' : 'Your prototype is approved'}</h2>
        <p className="delivery-approved">Approved {date(project.approvedAt!)}<button className="text-button" onClick={onReview}>View review</button></p>
        {isDesktop ? <ExecutableDownload project={project} api={api} busy={busy} action={work => deliver(work, project.runtimeProfile && project.runtimeProfile !== 'browser' ? 'export' : 'download')} buttonClassName="primary"/> : <p className="muted">Open this challenge in the AppYard desktop app to save it.</p>}
      </section>
      <section className="delivery-source" aria-labelledby="delivery-source-heading">
        <div><h2 id="delivery-source-heading">Source and evidence</h2><p>Export the app source, test results, and your review for inspection or further development.</p></div>
        <button className="secondary" disabled={!isDesktop || busy || packaging || project.status === 'running'} onClick={() => void deliver(() => api.exportProject(project.id), 'export')}><Download size={16}/>Export source & evidence</button>
        {project.exportedTo && <p className="delivery-saved-path" role="status">Source and evidence saved to <span>{project.exportedTo}</span></p>}
      </section>
      {notice && <p className={'delivery-notice' + (notice.failed ? ' failed' : '')} role={notice.failed ? 'alert' : 'status'}>{notice.text}</p>}
    </>}
  </div></div>;
}
