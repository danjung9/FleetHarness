import { useEffect, useId, useRef, useState, type FormEvent, type RefObject } from 'react';
import { ArrowDown, ArrowUp, Check, ChevronRight, MessageSquare, Pause, Square, X } from 'lucide-react';
import type { FleetAPI, NewProject, Project } from '../shared/types';
import type { ClarificationAnswer, ClarificationQuestion, ConversationAction } from '../shared/conversation';
import { conversationRestartMessage } from '../shared/desktop-api';
import { migrateConversationDrafts, readConversationDraft, saveConversationDraft } from '../shared/conversation-drafts';
import './conversation.css';

const messageLimit = 8_000;
const answerLimit = 8_000;
const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error)).replace(/^Error invoking remote method '[^']+': Error: /, '');
const draftKey = (projectId: string, questionId?: string) => `appyard:conversation:${projectId}:${questionId ? `answer:${questionId}` : 'draft'}`;
try { migrateConversationDrafts(localStorage, sessionStorage); } catch { /* Storage access may be disabled. */ }
function readDraft(key: string) { try { return readConversationDraft(key, localStorage, sessionStorage); } catch { return ''; } }
function saveDraft(key: string, value: string) { try { saveConversationDraft(key, value, localStorage, sessionStorage); } catch { /* In-memory editing still works when browser storage is unavailable. */ } }
interface SubmittedDraft { text: string; previousMessageId: string }
function readSubmission(key: string): SubmittedDraft | null {
  try { const value = JSON.parse(readDraft(key) || 'null'); return value && typeof value.text === 'string' && typeof value.previousMessageId === 'string' ? value : null; } catch { return null; }
}

function readAnswerDraft(key: string, question: ClarificationQuestion): ClarificationAnswer {
  const stored = readDraft(key);
  try {
    const value = JSON.parse(stored);
    if (value?.version === 1 && typeof value.text === 'string' && Array.isArray(value.selectedOptions) && value.selectedOptions.every((option: unknown) => typeof option === 'string')) {
      const options = question.answerType === 'text' ? [] : question.options ?? [];
      const selected = options.filter(option => value.selectedOptions.includes(option));
      return { text: value.text, selectedOptions: question.answerType === 'multiple_choice' ? selected : selected.slice(0, 1) };
    }
  } catch { /* Older drafts contain the answer text directly. */ }
  return question.options?.includes(stored) && question.answerType !== 'text'
    ? { selectedOptions: [stored], text: '' }
    : { selectedOptions: [], text: stored };
}

export function pendingClarifications(project: Project) {
  return (project.conversation?.questions ?? []).filter(question => question.status === 'pending' && question.runId === project.runId && project.status === 'running');
}

export function ConversationToggle({ project, open, onClick, buttonRef }: {
  project: Project; open: boolean; onClick: () => void; buttonRef: RefObject<HTMLButtonElement | null>;
}) {
  const count = pendingClarifications(project).length;
  return <button ref={buttonRef} type="button" className={'secondary conversation-toggle' + (count ? ' needs-answer' : '')} aria-expanded={open}
    aria-controls={'project-conversation-' + project.id} aria-label={`Project lead${count ? `, ${count} question${count === 1 ? '' : 's'} awaiting your answer` : ''}`} onClick={onClick}>
    <MessageSquare size={16} aria-hidden="true"/><span>Project lead</span>{count > 0 && <span className="conversation-count" aria-hidden="true">{count}</span>}
  </button>;
}

export function ClarificationNotice({ project, onOpen }: { project: Project; onOpen: () => void }) {
  const questions = pendingClarifications(project);
  if (!questions.length) return null;
  return <div className="conversation-waiting" role="status"><Pause size={16} aria-hidden="true"/><p><strong>{questions[0].phase === 'research' ? 'Research' : 'Planning'} is waiting for your answer.</strong><span>The build continues after you answer in Project lead.</span></p><button type="button" className="text-button" onClick={onOpen}>Answer question <ChevronRight size={15}/></button></div>;
}

function QuestionForm({ projectId, question, api, desktop, busy, onBusy }: { projectId: string; question: ClarificationQuestion; api: FleetAPI; desktop: boolean; busy: boolean; onBusy: (busy: boolean) => void }) {
  const answerId = useId();
  const key = draftKey(projectId, question.id);
  const answerType = question.answerType ?? (question.options?.length ? 'single_choice' : 'text');
  const hasChoices = answerType !== 'text';
  const multiple = answerType === 'multiple_choice';
  const [answer, setAnswer] = useState(() => readAnswerDraft(key, question));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const disabled = !desktop || submitting || busy;
  const hasAnswer = answer.selectedOptions.length > 0 || Boolean(answer.text.trim());
  function edit(value: ClarificationAnswer) {
    setAnswer(value); setError('');
    saveDraft(key, value.selectedOptions.length || value.text ? JSON.stringify({ version: 1, ...value }) : '');
  }
  function choose(option: string, checked: boolean) {
    const selected = multiple
      ? (checked ? [...answer.selectedOptions, option] : answer.selectedOptions.filter(value => value !== option))
      : [option];
    edit({ ...answer, selectedOptions: (question.options ?? []).filter(value => selected.includes(value)) });
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (disabled || !hasAnswer) return;
    setSubmitting(true); onBusy(true); setError('');
    try { await api.answerClarification(projectId, question.id, { ...answer, text: answer.text.trim() }); saveDraft(key, ''); }
    catch (error) { setError(errorText(error)); }
    finally { setSubmitting(false); onBusy(false); }
  }
  return <form className="conversation-question" onSubmit={event => void submit(event)} aria-labelledby={answerId + '-title'} aria-busy={submitting}>
    <h3 id={answerId + '-title'}>{question.question}</h3>
    {question.context && <p>{question.context}</p>}
    {question.recommendation && <p className="conversation-recommendation"><strong>Suggested approach</strong>{question.recommendation}</p>}
    {hasChoices && <fieldset className="conversation-options" disabled={disabled}>
      <legend>{multiple ? 'Select all that apply' : 'Choose one option'}</legend>
      {question.options?.map(option => <label key={option}>
        <input type={multiple ? 'checkbox' : 'radio'} name={answerId + '-choice'} checked={answer.selectedOptions.includes(option)} onChange={event => choose(option, event.target.checked)}/>
        <span>{option}</span>
      </label>)}
      {answer.selectedOptions.length > 0 && <button type="button" className="text-button conversation-clear-selection" onClick={() => edit({ ...answer, selectedOptions: [] })}>Clear {multiple ? 'selections' : 'selection'}</button>}
    </fieldset>}
    <div className="conversation-answer-field">
      <label htmlFor={answerId}>{hasChoices ? 'Additional details or your own answer' : 'Your answer'}</label>
      <textarea id={answerId} rows={3} maxLength={answerLimit} value={answer.text} disabled={disabled} onChange={event => edit({ ...answer, text: event.target.value })} aria-describedby={hasChoices ? answerId + '-hint' : undefined} placeholder={hasChoices ? 'Add context, or suggest another approach…' : 'Write the details the agent should use…'}/>
    </div>
    {hasChoices && <p className="conversation-input-hint" id={answerId + '-hint'}>Optional when you select an option. You can also answer in your own words.</p>}
    {error && <p className="conversation-error" role="alert">{error} Your answer is saved here; try again.</p>}
    <button className="primary" type="submit" disabled={disabled || !hasAnswer}>{submitting ? 'Sending answer…' : 'Send answer & continue'}<ChevronRight size={15}/></button>
    <p className="conversation-answer-note">{question.phase === 'research' ? 'Research' : 'Planning'} resumes once every question is answered.</p>
  </form>;
}

const briefFields: { key: keyof NewProject; label: string }[] = [
  { key: 'title', label: 'Challenge title' }, { key: 'description', label: 'Problem statement' },
  { key: 'inputs', label: 'Inputs' }, { key: 'outputs', label: 'Outputs' }, { key: 'criteria', label: 'Evaluation criteria' },
  { key: 'resources', label: 'Resources' }, { key: 'links', label: 'Links' }, { key: 'dataInputs', label: 'Data & inputs' }, { key: 'challengeId', label: 'Source challenge' }
];
function fieldText(value: unknown) {
  if (value === undefined || value === null || value === '') return '';
  if (Array.isArray(value)) return value.every(item => typeof item === 'string') ? value.join('\n') : JSON.stringify(value, null, 2);
  return String(value);
}

function ProposedAction({ action, project, api, desktop, configured, onApplied, busy, onBusy }: {
  action: ConversationAction; project: Project; api: FleetAPI; desktop: boolean; configured: boolean; onApplied: (action: ConversationAction) => void; busy: boolean; onBusy: (busy: boolean) => void;
}) {
  const [pending, setPending] = useState<'apply' | 'dismiss' | null>(null);
  const [error, setError] = useState('');
  const running = project.status === 'running';
  const changes = action.brief ? briefFields.filter(field => Object.hasOwn(action.brief!, field.key)).map(field => ({ ...field, before: fieldText(project[field.key]), after: fieldText(action.brief![field.key]) })).filter(field => field.before !== field.after) : [];
  async function act(kind: 'apply' | 'dismiss') {
    if (pending || busy) return;
    setPending(kind); onBusy(true); setError('');
    try {
      if (kind === 'dismiss') await api.dismissConversationAction(project.id, action.id);
      else { await api.applyConversationAction(project.id, action.id); onApplied(action); }
    } catch (error) { setError(errorText(error)); }
    finally { setPending(null); onBusy(false); }
  }
  const label = action.type === 'stop' ? 'Stop build' : action.type === 'start' ? 'Start fresh build' : running ? 'Stop, update & rebuild' : 'Update brief & build';
  return <section className="conversation-action" aria-label={'Proposed action: ' + action.title}>
    <div className="conversation-action-heading"><span>Proposed action</span><span>Awaiting your choice</span></div>
    <h3>{action.title}</h3><p>{action.reason}</p>
    {action.type === 'revise' && action.brief && <details className="conversation-brief-changes" open><summary>Review brief changes <span>{changes.length} {changes.length === 1 ? 'field' : 'fields'}</span><ChevronRight size={15}/></summary><div>{changes.length ? changes.map(change => <section className="conversation-brief-field" key={change.key}><h4>{change.label}</h4><div><span>Current</span><pre>{change.before || '(Empty)'}</pre></div><div><span>Proposed</span><pre>{change.after || '(Empty)'}</pre></div></section>) : <p>The proposed brief matches the current brief.</p>}</div></details>}
    <p className="conversation-action-impact">{action.type === 'stop' ? 'Stops the current build and keeps its saved files.' : action.type === 'start' ? 'Starts a fresh build from the saved brief. Earlier run folders are kept.' : `${running ? 'Stops the current build, updates the brief, and starts fresh.' : 'Updates the brief and starts a fresh build.'} Applying this clears the current test results and delivery approval. Earlier run folders are kept.`}</p>
    {action.type !== 'stop' && <p className="conversation-action-disclosure">Build agents can edit files and run shell commands on this Mac. Your configured model provider receives the brief and tool context.</p>}
    {error && <p className="conversation-error" role="alert">{error}</p>}
    <div className="conversation-action-buttons"><button className="secondary" type="button" disabled={!desktop || !!pending || busy} onClick={() => void act('dismiss')}>{pending === 'dismiss' ? 'Dismissing…' : 'Dismiss'}</button><button className="primary" type="button" disabled={!desktop || !!pending || busy || (action.type !== 'stop' && !configured)} onClick={() => void act('apply')}>{pending === 'apply' ? 'Applying…' : label}</button></div>
    {!configured && action.type !== 'stop' && desktop && <p className="conversation-answer-note">Connect a model in Settings to apply this action.</p>}
  </section>;
}

export function ProjectConversation({ project, open, focusRequest, onClose, api, desktop, configured, restartRequired, openSettings, onApplied }: {
  project: Project; open: boolean; focusRequest: number; onClose: () => void; api: FleetAPI; desktop: boolean; configured: boolean; restartRequired: boolean; openSettings: () => void; onApplied: (action: ConversationAction) => void;
}) {
  const headingId = useId();
  const composerId = useId();
  const scrollRef = useRef<HTMLDivElement>(null);
  const questionRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const followingRef = useRef(true);
  const previousQuestionsRef = useRef<string[]>([]);
  const [draft, setDraft] = useState(() => readDraft(draftKey(project.id)));
  const submissionKey = draftKey(project.id) + ':submitted';
  const [submission, setSubmission] = useState<SubmittedDraft | null>(() => readSubmission(submissionKey));
  const [sending, setSending] = useState(false);
  const [mutationBusy, setMutationBusy] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState('');
  const [dismissedError, setDismissedError] = useState('');
  const [newMessages, setNewMessages] = useState(false);
  const conversation = project.conversation;
  const questions = pendingClarifications(project);
  const questionRevision = questions.map(question => question.id).join('|');
  const messages = conversation?.messages ?? [];
  const proposals = (conversation?.actions ?? []).filter(action => action.status === 'proposed');
  const responding = sending || conversation?.status === 'responding';
  const failure = restartRequired ? '' : error || (conversation?.error !== dismissedError ? conversation?.error : '');
  const messageRevision = messages.map(message => message.id + ':' + message.status + ':' + message.text.length).join('|');
  function edit(value: string) { setDraft(value); saveDraft(draftKey(project.id), value); }
  function latest() {
    const scroll = scrollRef.current;
    if (scroll) scroll.scrollTop = scroll.scrollHeight;
    followingRef.current = true; setNewMessages(false);
  }
  function focusQuestion() {
    scrollRef.current?.scrollTo({ top: 0 }); followingRef.current = false;
    questionRef.current?.focus({ preventScroll: true });
  }
  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      if (questions.length) focusQuestion();
      else { latest(); if (desktop && configured) composerRef.current?.focus({ preventScroll: true }); else headingRef.current?.focus({ preventScroll: true }); }
    });
    return () => cancelAnimationFrame(frame);
  }, [open, focusRequest]);
  useEffect(() => {
    const previous = previousQuestionsRef.current;
    const current = questions.map(question => question.id);
    previousQuestionsRef.current = current;
    if (!open || !previous.some(id => !current.includes(id)) || document.activeElement !== document.body) return;
    const frame = requestAnimationFrame(() => {
      if (document.activeElement !== document.body) return;
      if (questions.length) focusQuestion();
      else if (desktop && configured) composerRef.current?.focus({ preventScroll: true });
      else headingRef.current?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [open, questionRevision]);
  useEffect(() => {
    if (!open) return;
    if (followingRef.current) latest();
    else setNewMessages(true);
  }, [messageRevision, proposals.length]);
  useEffect(() => {
    if (!submission || sending || conversation?.status !== 'idle') return;
    const priorIndex = messages.findIndex(message => message.id === submission.previousMessageId);
    const attemptMessages = messages.slice(priorIndex + 1);
    const sent = attemptMessages.some(message => message.role === 'user' && message.text === submission.text.trim());
    const reply = [...attemptMessages].reverse().find(message => message.role === 'assistant');
    if (!sent || (!reply && !conversation.error)) return;
    if (!conversation.error && reply?.status === 'complete') {
      setDraft(current => { if (current !== submission.text) return current; saveDraft(draftKey(project.id), ''); return ''; });
    }
    setSubmission(null); saveDraft(submissionKey, '');
  }, [conversation?.status, conversation?.error, messageRevision, submission, sending]);
  async function send(event: FormEvent) {
    event.preventDefault();
    if (!desktop || !configured || restartRequired || responding || !draft.trim()) return;
    const submitted = draft;
    const attempt = { text: submitted, previousMessageId: messages.at(-1)?.id ?? '' };
    setSubmission(attempt); saveDraft(submissionKey, JSON.stringify(attempt));
    setSending(true); setError(''); setDismissedError(''); followingRef.current = true;
    try {
      await api.sendMessage(project.id, submitted.trim());
    } catch (error) { setError(errorText(error)); setSubmission(null); saveDraft(submissionKey, ''); }
    finally { setSending(false); }
  }
  async function cancel() {
    if (cancelling) return;
    setSubmission(null); saveDraft(submissionKey, '');
    setCancelling(true); setError('');
    try { await api.cancelMessage(project.id); }
    catch (error) { setError(errorText(error)); }
    finally { setCancelling(false); }
  }
  if (!open) return null;
  return <aside className="conversation-panel" id={'project-conversation-' + project.id} aria-labelledby={headingId} onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); onClose(); } }}>
    <header className="conversation-panel-heading"><div><h2 id={headingId} ref={headingRef} tabIndex={-1}><MessageSquare size={19} aria-hidden="true"/>Project lead</h2><p>{project.title}</p></div><button type="button" className="icon-button" aria-label="Close project lead" onClick={onClose}><X size={18}/></button></header>
    {questions.length > 0 && <button className="conversation-pending-link" type="button" onClick={focusQuestion}><Pause size={14}/>{questions.length === 1 ? 'A question is waiting for your answer' : `${questions.length} questions are waiting for your answer`}<ArrowUp size={14}/></button>}
    <div className="conversation-scroll" ref={scrollRef} onScroll={event => { const node = event.currentTarget; followingRef.current = node.scrollHeight - node.scrollTop - node.clientHeight < 48; if (followingRef.current) setNewMessages(false); }}>
      {questions.length > 0 && <div ref={questionRef} className="conversation-questions" tabIndex={-1} aria-label="Questions awaiting your answer">{questions.map(question => <QuestionForm key={question.id} projectId={project.id} question={question} api={api} desktop={desktop && !restartRequired} busy={mutationBusy} onBusy={setMutationBusy}/>)}</div>}
      {!messages.length && <div className="conversation-intro"><h3>Shape the work together.</h3><p>Refine your brief, ask about progress, or propose a new direction. This conversation stays with the project across builds.</p><p>During research and planning, the agents will ask here when they need a decision from you.</p>{desktop && configured && <button type="button" className="conversation-starter" onClick={() => { edit('Help me clarify this brief before building. What decisions should we settle?'); composerRef.current?.focus(); }}>Help me clarify the brief <ChevronRight size={15}/></button>}</div>}
      {!!messages.length && <div className="conversation-transcript" role="log" aria-label="Project conversation" aria-live="off">{messages.map(message => <article className={'conversation-message ' + message.role} key={message.id}><div className="conversation-message-meta"><strong>{message.role === 'user' ? 'You' : message.role === 'assistant' ? 'Project lead' : 'Project update'}</strong><time dateTime={message.createdAt}>{new Date(message.createdAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</time>{message.phase && <span>{message.phase === 'research' ? 'Research' : 'Planning'}</span>}</div><p>{message.text || (message.status === 'streaming' ? 'Thinking…' : '')}</p>{message.status === 'error' && <span className="conversation-message-error">Response interrupted. You can try again.</span>}</article>)}</div>}
      {(conversation?.questions ?? []).filter(question => question.status !== 'pending').length > 0 && <details className="conversation-answered"><summary>Earlier questions <span>{conversation!.questions.filter(question => question.status !== 'pending').length}</span></summary>{conversation!.questions.filter(question => question.status !== 'pending').map(question => <div key={question.id}><p><strong>{question.question}</strong></p><p>{question.status === 'answered' ? question.answer : 'This question was closed when its build ended.'}</p><span>{question.phase === 'research' ? 'Research' : 'Planning'} · {question.status === 'answered' ? 'Answered' : 'Closed'}</span></div>)}</details>}
      {proposals.map(action => <ProposedAction key={action.id} action={action} project={project} api={api} desktop={desktop && !restartRequired} configured={configured} onApplied={onApplied} busy={mutationBusy} onBusy={setMutationBusy}/>)}
      {(conversation?.actions ?? []).filter(action => action.status === 'applied').map(action => <div className="conversation-action-result" key={action.id}><Check size={14}/><span>{action.title} · Applied</span></div>)}
    </div>
    {newMessages && <button type="button" className="conversation-jump" onClick={latest}>Latest messages <ArrowDown size={14}/></button>}
    <div className="conversation-composer-area">
      {!desktop ? <p className="conversation-unavailable">Open the AppYard desktop app to talk to Project lead and answer research or planning questions.</p> : restartRequired ? <p className="conversation-unavailable" role="status">{conversationRestartMessage}</p> : !configured ? <div className="conversation-unavailable"><p>Connect a model to talk to Project lead.</p><button type="button" className="text-button" onClick={openSettings}>Open model settings <ChevronRight size={14}/></button></div> : null}
      {failure && <div className="conversation-error" role="alert"><p>{failure}<span>Your unsent draft is kept below.</span></p><button className="icon-button" type="button" aria-label="Dismiss conversation error" onClick={() => { setError(''); setDismissedError(conversation?.error ?? ''); }}><X size={14}/></button></div>}
      <form className="conversation-composer" onSubmit={event => void send(event)}><label htmlFor={composerId}>Message Project lead</label><textarea ref={composerRef} id={composerId} rows={3} maxLength={messageLimit} value={draft} disabled={!desktop || !configured} onChange={event => edit(event.target.value)} placeholder="Ask a question or describe a change…" onKeyDown={event => { if (event.key === 'Enter' && (event.metaKey || event.ctrlKey) && !event.nativeEvent.isComposing) { event.preventDefault(); void send(event); } }}/><div className="conversation-composer-footer"><span role="status" aria-live="polite">{restartRequired ? 'Restart app to enable chat.' : responding ? 'Project lead is responding…' : 'Runs when you send a message.'}</span>{responding ? <button className="secondary" type="button" disabled={cancelling || restartRequired} onClick={() => void cancel()}><Square size={13}/>{cancelling ? 'Cancelling…' : 'Cancel reply'}</button> : <button className="primary" type="submit" disabled={!desktop || !configured || restartRequired || !draft.trim()} title="Send message (⌘/Ctrl+Enter)">Send <ArrowUp size={15}/></button>}</div></form>
    </div>
  </aside>;
}
