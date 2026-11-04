import { useEffect, useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, Check, Download, ShieldCheck } from 'lucide-react';
import type { NewProject, Project } from '../../shared/types';
import { api } from './api';
import { cleanBrief, downloadBrief, validateBrief } from './brief';
import type { Work } from './ui';

export function BriefEditor({ initial, project, busy, work, navigate, saved }: { initial: NewProject; project?: Project; busy: boolean; work: Work; navigate: (path: string) => void; saved: (p: Project) => void }) {
  const draftKey = 'fleetharness-workbench-draft-' + (project?.id || initial.challengeId || 'new');
  const [draft, setDraft] = useState(() => {
    try { const value = JSON.parse(localStorage.getItem(draftKey) || 'null'); if (value && typeof value.title === 'string' && typeof value.description === 'string' && typeof value.criteriaText === 'string') return value as { title: string; description: string; criteriaText: string }; } catch { /* Keep the supplied request when storage is unavailable. */ }
    return { title: initial.title, description: initial.description, criteriaText: initial.criteria.join('\n') };
  });
  const [message, setMessage] = useState(''), [error, setError] = useState('');
  const locked = project?.status === 'running';
  useEffect(() => {
    const timer = setTimeout(() => { try { localStorage.setItem(draftKey, JSON.stringify(draft)); setMessage('Draft saved on this device'); } catch { setMessage('Draft could not be saved automatically. Download a copy to keep it.'); } }, 350);
    return () => clearTimeout(timer);
  }, [draft, draftKey]);
  const value: NewProject = { ...initial, title: draft.title, description: draft.description, criteria: draft.criteriaText.split('\n').map(s => s.trim()).filter(Boolean) };
  async function submit(e: FormEvent) {
    e.preventDefault(); const invalid = validateBrief(value); setError(invalid || '');
    if (invalid) { requestAnimationFrame(() => document.getElementById('wb-form-error')?.focus()); return; }
    await work(async () => {
      const p = project ? await api.updateProject(project.id, cleanBrief(value)) : await api.createProject(cleanBrief(value));
      try { localStorage.removeItem(draftKey); } catch { /* The request itself is already saved. */ }
      saved(p);
    }, 'Your request is saved.');
  }
  return <div className="wb-page wb-editor"><button className="wb-back" onClick={() => navigate(project ? 'build/' + project.id : 'catalog' + (initial.challengeId ? '/' + initial.challengeId : ''))}><ArrowLeft size={15}/>{project ? 'Back to your tool' : 'Back to challenges'}</button><div className="wb-page-heading"><div><h1>{project ? 'Make the request fit your needs.' : 'Tell us what gets in your way.'}</h1><p>You know the job. Describe what would make it easier. No technical brief needed.</p></div></div>
    <form className="wb-editor-layout" onSubmit={submit}><div className="wb-editor-fields">
      {locked && <div className="wb-alert" role="alert">Tool creation is in progress. Stop it before changing the request.</div>}
      {error && <p id="wb-form-error" tabIndex={-1} className="wb-alert" role="alert">{error}</p>}
      <section><label htmlFor="wb-title">Give your tool a name</label><p id="wb-title-hint">Something you and your team will recognize.</p><input id="wb-title" aria-describedby="wb-title-hint" required maxLength={120} disabled={locked} value={draft.title} placeholder="For example, a training schedule that avoids clashes" onChange={e => setDraft({ ...draft, title: e.target.value })}/></section>
      <section><label htmlFor="wb-description">What’s the problem?</label><p id="wb-description-hint">Who is affected? What do you do today? Include the information you have and any constraints, like working offline.</p><textarea id="wb-description" aria-describedby="wb-description-hint" required minLength={20} maxLength={16000} rows={9} disabled={locked} value={draft.description} placeholder="We spend hours comparing training schedules by hand. We need to see when people or equipment are double-booked…" onChange={e => setDraft({ ...draft, description: e.target.value })}/></section>
      <section><label htmlFor="wb-criteria">How will you know it works?</label><p id="wb-criteria-hint">Write one thing it needs to do per line. These become the checks for your tool.</p><textarea id="wb-criteria" aria-describedby="wb-criteria-hint" required rows={5} disabled={locked} value={draft.criteriaText} placeholder={'Show when the same person is booked twice.\nExplain which assignments conflict.\nLet me download the updated schedule.'} onChange={e => setDraft({ ...draft, criteriaText: e.target.value })}/></section>
    </div><aside className="wb-editor-aside"><h2>A clear problem is enough to start.</h2><p>You can refine the request before creating your tool.</p><ol className="wb-next-steps"><li><span>1</span><div><strong>Describe the need</strong><p>Your situation, in your own words.</p></div></li><li><span>2</span><div><strong>We create and check it</strong><p>Follow the progress in your workspace.</p></div></li><li><span>3</span><div><strong>You try it and decide</strong><p>Review the result before downloading.</p></div></li></ol><button className="wb-button primary full" type="submit" disabled={busy || locked}>{busy ? 'Saving request…' : 'Save request'}<ArrowRight size={16}/></button><button type="button" className="wb-button full" onClick={() => downloadBrief(value)}><Download size={16}/>Download request</button><p className="wb-draft-status" role="status"><Check size={14}/>{message || 'Editing your request'}</p><div className="wb-privacy-note"><ShieldCheck size={17}/><p>Use synthetic or approved sample data. This workspace creates prototypes; it does not certify them for operational use.</p></div>{project?.workspace && <p className="wb-muted">Saving a changed request resets its checks and approval. Create the updated tool to check it again.</p>}</aside></form>
  </div>;
}
