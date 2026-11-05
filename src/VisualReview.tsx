import { useEffect, useState } from 'react';
import { CheckCircle2, ChevronRight, Clock3, ImageOff, Maximize2, Minimize2, Monitor, Smartphone, XCircle } from 'lucide-react';
import type { RunStatus } from '../shared/types';
import { isVisualReviewReport, type VisualCapture, type VisualReview as ReviewRecord, type VisualReviewReport, type VisualReviewSession, type VisualReviewStatus } from '../shared/visual-review';
import { api } from './api';
import './visual-review.css';

const stages = { build: 'Build review', verify: 'Verification review' };
const viewports = { desktop: 'Desktop', narrow: 'Narrow' };
const date = (value: string) => new Date(value).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

function ReviewStatus({ status }: { status: VisualReviewStatus }) {
  const Icon = status === 'passed' ? CheckCircle2 : status === 'failed' ? XCircle : Clock3;
  return <span className={'visual-status ' + status}><Icon size={14} aria-hidden="true"/>{status === 'passed' ? 'Recorded' : status === 'failed' ? 'Blocked' : 'Pending'}</span>;
}

function CaptureImage({ projectId, capture, label }: { projectId: string; capture: VisualCapture; label: string }) {
  const [source, setSource] = useState('');
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    let current = true;
    setSource(''); setError('');
    void api.visualReviewImage(projectId, capture.id).then(value => {
      if (!value.startsWith('data:image/png;base64,')) throw new Error('The saved screenshot could not be displayed.');
      if (current) setSource(value);
    }).catch(reason => { if (current) setError(reason instanceof Error ? reason.message : 'The saved screenshot could not be loaded.'); });
    return () => { current = false; };
  }, [projectId, capture.id, capture.screenshotHash, retry]);
  return <figure className={'visual-capture ' + capture.viewport + (expanded ? ' expanded' : '')}>
    {error ? <div className="visual-image-error" role="status"><ImageOff size={22} aria-hidden="true"/><strong>Screenshot unavailable</strong><p>{error}</p><button type="button" className="text-button" onClick={() => setRetry(value => value + 1)}>Retry screenshot</button></div>
      : source ? <button type="button" className="visual-image-button" aria-expanded={expanded} aria-label={`${expanded ? 'Reduce' : 'Expand'} ${label.toLowerCase()} screenshot`} onClick={() => setExpanded(value => !value)}>
        <img src={source} alt={`${label}, captured ${date(capture.capturedAt)}`} onError={() => setError('The saved PNG could not be decoded. Retry the screenshot or open the source folder to inspect it.')}/>
        <span>{expanded ? <Minimize2 size={13} aria-hidden="true"/> : <Maximize2 size={13} aria-hidden="true"/>}{expanded ? 'Reduce image' : 'Expand image'}</span>
      </button> : <div className="visual-image-loading" role="status">Loading saved screenshot…</div>}
    <figcaption><time dateTime={capture.capturedAt}>{date(capture.capturedAt)}</time><span>Source {capture.filesHash.slice(0, 8)}</span></figcaption>
  </figure>;
}

function ReviewEntry({ projectId, record, report }: { projectId: string; record: ReviewRecord; report: VisualReviewReport }) {
  const capture = report.captures.find(item => item.id === record.captureId);
  const label = `${viewports[record.viewport]} ${record.round === 'initial' ? 'initial review' : 'recheck'}`;
  return <article className="visual-review-entry" aria-label={label}>
    <h4>{record.round === 'initial' ? 'Initial review' : 'Recheck'}</h4>
    {capture ? <CaptureImage projectId={projectId} capture={capture} label={label}/> : <p className="visual-record-error">The screenshot record is missing.</p>}
    <dl className="visual-comparison"><div><dt>Expected</dt><dd>{record.expected}</dd></div><div><dt>Observed</dt><dd>{record.observed}</dd></div></dl>
    {record.findings.length > 0 ? <div className="visual-findings"><h5>Findings</h5><ul>{record.findings.map(finding => {
      const resolved = report.reviews.some(review => review.resolutions.some(item => item.findingId === finding.id));
      return <li key={finding.id}><span className={resolved ? 'visual-finding-resolved' : 'visual-finding-open'}>{resolved ? <CheckCircle2 size={13} aria-hidden="true"/> : <XCircle size={13} aria-hidden="true"/>}{resolved ? 'Resolved in recheck' : 'Open'}</span><p>{finding.description}</p></li>;
    })}</ul></div> : <p className="visual-no-findings">No findings recorded in this review.</p>}
    {record.resolutions.length > 0 && <div className="visual-resolutions"><h5>Fixes checked</h5><ul>{record.resolutions.map(resolution => {
      const finding = report.reviews.flatMap(review => review.findings).find(item => item.id === resolution.findingId);
      return <li key={resolution.findingId}>{finding && <p className="visual-original-finding">{finding.description}</p>}<p>{resolution.change}</p></li>;
    })}</ul></div>}
  </article>;
}

function SessionEvidence({ projectId, session, report, attempt }: { projectId: string; session: VisualReviewSession; report: VisualReviewReport; attempt: number }) {
  const [open, setOpen] = useState(session.id === report.activeSessionId);
  const reviews = report.reviews.filter(review => review.sessionId === session.id).sort((a, b) => a.sequence - b.sequence);
  return <details className="visual-session" open={open} onToggle={event => setOpen(event.currentTarget.open)}>
    <summary><ChevronRight className="visual-session-chevron" size={15} aria-hidden="true"/><strong>{stages[session.stage]}{attempt > 1 ? ` · Attempt ${attempt}` : ''}</strong><ReviewStatus status={session.status}/><span className="visual-session-count">{reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}</span></summary>
    {open && <div className="visual-session-body">
      {session.errors.length > 0 && <ul className="visual-review-errors">{session.errors.map((error, index) => <li key={index}>{error}</li>)}</ul>}
      {(['desktop', 'narrow'] as const).map(viewport => {
        const viewportReviews = reviews.filter(review => review.viewport === viewport);
        const pending = report.captures.filter(capture => capture.sessionId === session.id && capture.viewport === viewport && !reviews.some(review => review.captureId === capture.id)).sort((a, b) => b.sequence - a.sequence)[0];
        const Icon = viewport === 'desktop' ? Monitor : Smartphone;
        return <section className="visual-viewport" key={viewport} aria-label={`${stages[session.stage]} ${viewports[viewport].toLowerCase()}`}>
          <h3><Icon size={16} aria-hidden="true"/>{viewports[viewport]}<span>{viewport === 'desktop' ? '1280 × 800' : '390 × 844'}</span></h3>
          {viewportReviews.length > 0 && <div className="visual-review-grid">{viewportReviews.map(record => <ReviewEntry key={record.id} projectId={projectId} record={record} report={report}/>)}</div>}
          {!viewportReviews.length && !pending && <p className="visual-awaiting">Waiting for a saved screenshot and the agent’s comparison.</p>}
          {pending && <details className="visual-pending-capture"><summary>Latest capture awaiting review</summary><CaptureImage projectId={projectId} capture={pending} label={`${viewports[viewport]} pending review`}/></details>}
        </section>;
      })}
    </div>}
  </details>;
}

export function VisualReview({ projectId, report, runtimeProfile, runStatus }: { projectId: string; report?: VisualReviewReport; runtimeProfile?: 'browser' | 'service' | 'cli'; runStatus?: RunStatus }) {
  if (!report && !runtimeProfile) return null;
  if (runtimeProfile === 'cli') return <section className="visual-review" aria-label="Visual review"><h2>Visual review</h2><p className="visual-review-note">Not required for a command-line application.</p></section>;
  if (report && !isVisualReviewReport(report)) return <section className="visual-review" aria-label="Visual review"><h2>Visual review</h2><p className="visual-record-error">The saved visual review record is incomplete. Resume verification to capture and review the current application.</p></section>;
  const status = report?.status ?? 'pending';
  return <section className="visual-review" aria-label="Visual review">
    <div className="visual-review-heading"><h2>Visual review</h2><ReviewStatus status={status}/></div>
    <p className="visual-review-note">Saved screenshots and the agent’s comparison with the expected result. The host checks these records and their source version; the observations are the agent’s assessment.</p>
    {!report ? <p className="visual-awaiting">{runStatus === 'running' ? 'Screenshots and review notes will appear here as the agents inspect the app.' : 'No visual review was recorded for this build.'}</p> : <>
      <div className="visual-stage-statuses">{(['build', 'verify'] as const).map(stage => {
        const latest = report.sessions.filter(session => session.stage === stage).at(-1);
        return <div key={stage}><span>{stages[stage]}</span><ReviewStatus status={latest?.status ?? 'pending'}/></div>;
      })}</div>
      {report.sessions.map(session => <SessionEvidence key={session.id} projectId={projectId} session={session} report={report} attempt={report.sessions.filter(item => item.stage === session.stage).findIndex(item => item.id === session.id) + 1}/>)}
    </>}
  </section>;
}
