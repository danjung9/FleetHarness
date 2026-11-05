import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { Archive, ArchiveRestore, ArrowLeft, ArrowRight, CheckCircle2, ChevronRight, Download, File, FileCode2, FolderOpen, HardDrive, Info, LockKeyhole, RefreshCw, Search, Trash2, Undo2, X } from 'lucide-react';
import type { Project } from '../shared/types';
import type { StorageFile, StorageItem, StoragePreview, StorageTrashItem } from '../shared/data-storage';
import { api, isDesktop } from './api';
import { IconButton } from './IconButton';
import { useStorageOverview } from './useStorageOverview';
import './data-storage.css';

type Tab = 'builds' | 'projects' | 'trash';
type Confirmation = { kind: 'trash'; item: StorageItem; file?: StorageFile } | { kind: 'delete'; item: StorageTrashItem };
type Notice = { message: string; undoId?: string };
type Action = (work: () => Promise<void>, message?: string) => Promise<boolean>;
const categories: Record<StorageFile['category'], string> = { source: 'Source', data: 'Data', evidence: 'Evidence', logs: 'Logs', dependencies: 'Dependencies', other: 'Other' };
const kinds = { build: 'Build', candidate: 'Candidate', sessions: 'Agent sessions', file: 'File' };
const filesPerPage = 200;
const formatDate = (value: string) => new Date(value).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error)).replace(/^Error invoking remote method '[^']+': Error: /, '');
function bytes(value: number) {
  if (value === 0) return '0 B';
  const unit = Math.min(Math.floor(Math.log(Math.max(value, 1)) / Math.log(1024)), 4);
  return `${new Intl.NumberFormat(undefined, { maximumFractionDigits: unit ? 1 : 0 }).format(value / 1024 ** unit)} ${['B', 'KB', 'MB', 'GB', 'TB'][unit]}`;
}
function Empty({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return <div className="storage-empty"><h2>{title}</h2><p>{children}</p>{action}</div>;
}
function ItemStatus({ item }: { item: StorageItem }) {
  return <div className="storage-status">
    {item.active && <span className="badge active"><LockKeyhole size={12} aria-hidden="true"/>In use</span>}
    <span className={'badge ' + (item.current ? 'complete' : '')}>{item.kind === 'sessions' ? 'Sessions' : item.current ? 'Current' : item.kind === 'candidate' ? 'Candidate' : 'Previous'}</span>
  </div>;
}
function ConfirmDialog({ confirmation, busy, error, close, confirm }: { confirmation: Confirmation; busy: boolean; error: string; close: () => void; confirm: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const cancelButton = useRef<HTMLButtonElement>(null);
  const headingId = useId(), descriptionId = useId(), itemId = useId(), projectId = useId();
  const permanent = confirmation.kind === 'delete';
  const name = confirmation.kind === 'trash' ? confirmation.file?.path ?? confirmation.item.name : confirmation.item.name;
  useEffect(() => {
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = ref.current;
    dialog?.showModal();
    cancelButton.current?.focus({ preventScroll: true });
    return () => {
      dialog?.close();
      requestAnimationFrame(() => {
        const target = trigger?.isConnected ? trigger : document.querySelector<HTMLElement>('.storage-back, .storage-tabs button[aria-selected="true"]');
        target?.focus({ preventScroll: true });
      });
    };
  }, []);
  return <dialog ref={ref} className="dialog storage-confirm" aria-labelledby={headingId} aria-describedby={`${itemId} ${projectId} ${descriptionId}`} onCancel={event => { event.preventDefault(); if (!busy) close(); }}>
    <div className="dialog-inner">
      <div className="dialog-heading"><h2 id={headingId}>{permanent ? 'Delete permanently?' : 'Move to Trash?'}</h2><button type="button" className="icon-button" aria-label="Close dialog" disabled={busy} onClick={close}><X size={18}/></button></div>
      <p id={itemId} className="storage-confirm-name">{name}</p>
      <p id={projectId}>Project: {confirmation.item.projectTitle}</p>
      <p id={descriptionId}>{permanent ? `This permanently removes ${bytes(confirmation.item.bytes)} from this Mac. You cannot undo this deletion.` : 'You can restore this item from AppYard Trash. It will continue to use disk space until you delete it permanently.'}</p>
      {confirmation.kind === 'trash' && confirmation.item.current && <p className="storage-confirm-warning"><Info size={17} aria-hidden="true"/><span>This changes the current build. Its approval and verification will be cleared. Start a new build before approving or exporting it.</span></p>}
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="dialog-actions"><button ref={cancelButton} type="button" className="secondary" disabled={busy} onClick={close} autoFocus>Cancel</button><button type="button" className="secondary storage-danger" disabled={busy} onClick={confirm}><Trash2 size={15} aria-hidden="true"/>{busy ? (permanent ? 'Deleting…' : 'Moving…') : permanent ? 'Delete permanently' : 'Move to Trash'}</button></div>
    </div>
  </dialog>;
}

function FileBrowser({ item, revision, busy, action, back, requestTrash, onOpenProject, onExport, projectArchived, projectAvailable }: { item: StorageItem; revision: number; busy: boolean; action: Action; back: () => void; requestTrash: (file?: StorageFile) => void; onOpenProject: () => void; onExport: (file?: string) => Promise<void>; projectArchived: boolean; projectAvailable: boolean }) {
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [selected, setSelected] = useState('');
  const [focusedPath, setFocusedPath] = useState('');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<StorageFile['category'] | 'all'>('all');
  const [pageIndex, setPageIndex] = useState(0);
  const [loading, setLoading] = useState(true), [loadError, setLoadError] = useState(''), [retry, setRetry] = useState(0);
  const [preview, setPreview] = useState<StoragePreview | null>(null), [previewError, setPreviewError] = useState(''), [previewLoading, setPreviewLoading] = useState(false), [previewRetry, setPreviewRetry] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null), entries = useRef<HTMLDivElement>(null);
  const fileButtons = useRef(new Map<string, HTMLButtonElement>()), pendingFileFocus = useRef('');
  const previewPath = useRef('');
  const file = files.find(entry => entry.path === selected);
  const contentsVersion = item.revision ?? item.updatedAt;
  const keyboardHintId = useId();
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, []);
  useEffect(() => {
    let current = true;
    setLoading(true); setLoadError('');
    void api.storageFiles(item.id).then(next => {
      if (!current) return;
      setFiles(next); setSelected(path => next.some(file => file.path === path) ? path : '');
    }).catch(error => { if (current) setLoadError(errorText(error)); }).finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [item.id, contentsVersion, revision, retry]);
  useEffect(() => {
    let current = true;
    if (previewPath.current !== selected) setPreview(null);
    setPreviewError(''); setPreviewLoading(!!selected);
    if (selected) void api.storageReadFile(item.id, selected).then(value => {
      if (current) { previewPath.current = selected; setPreview(value); }
    }).catch(error => { if (current) setPreviewError(errorText(error)); }).finally(() => { if (current) setPreviewLoading(false); });
    return () => { current = false; };
  }, [item.id, selected, file?.revision, file?.updatedAt, file?.size, revision, previewRetry]);
  const matches = useMemo(() => {
    const search = query.toLocaleLowerCase();
    return files.filter(file => file.path.toLocaleLowerCase().includes(search) && (category === 'all' || file.category === category));
  }, [files, query, category]);
  const pageCount = Math.max(1, Math.ceil(matches.length / filesPerPage));
  const currentPage = Math.min(pageIndex, pageCount - 1);
  const pageStart = currentPage * filesPerPage;
  const visibleFiles = matches.slice(pageStart, pageStart + filesPerPage);
  const tabStop = visibleFiles.some(entry => entry.path === focusedPath) ? focusedPath : visibleFiles.some(entry => entry.path === selected) ? selected : visibleFiles[0]?.path;
  useEffect(() => { setPageIndex(0); }, [item.id, query, category]);
  useEffect(() => { setPageIndex(value => Math.min(value, pageCount - 1)); }, [pageCount]);
  useEffect(() => { entries.current?.scrollTo({ top: 0 }); }, [currentPage, query, category]);
  useEffect(() => {
    const target = fileButtons.current.get(pendingFileFocus.current);
    if (!target) return;
    pendingFileFocus.current = '';
    target.focus({ preventScroll: true });
    target.scrollIntoView({ block: 'nearest' });
  }, [currentPage, focusedPath, matches]);
  function moveFileFocus(path: string, key: string) {
    const index = matches.findIndex(entry => entry.path === path);
    const nextIndex = key === 'ArrowDown' ? Math.min(index + 1, matches.length - 1) : key === 'ArrowUp' ? Math.max(0, index - 1) : key === 'Home' ? 0 : key === 'End' ? matches.length - 1 : -1;
    const next = matches[nextIndex];
    if (!next) return false;
    if (next.path === path) { setSelected(next.path); return true; }
    pendingFileFocus.current = next.path;
    setPageIndex(Math.floor(nextIndex / filesPerPage));
    setFocusedPath(next.path); setSelected(next.path);
    return true;
  }
  return <section className="storage-detail" aria-label="Browse stored files">
    <button type="button" className="text-button storage-back" onClick={back}><ArrowLeft size={15} aria-hidden="true"/>Back to storage</button>
    <div className="storage-detail-heading">
      <div className="storage-detail-title"><h1 ref={heading} tabIndex={-1}>{item.name}</h1><p>{item.projectTitle}{projectArchived ? ' · Archived project' : !projectAvailable ? ' · Project record unavailable' : ''}</p><div className="storage-detail-meta"><ItemStatus item={item}/><span>{item.measured === false ? 'Calculating size…' : `${bytes(item.bytes)} · ${item.fileCount.toLocaleString()} files`}</span><button type="button" className="text-button" disabled={projectArchived || !projectAvailable} title={!projectAvailable ? 'The project record is unavailable. You can still manage its saved files.' : projectArchived ? 'Unarchive this project in Projects before opening it.' : undefined} onClick={onOpenProject}>Open project <ArrowRight size={13} aria-hidden="true"/></button></div></div>
      <div className="storage-heading-actions"><button type="button" className="secondary" aria-label={`Open ${item.name} folder in ${item.projectTitle}`} disabled={busy} onClick={() => void action(() => api.storageOpen(item.id))}><FolderOpen size={15} aria-hidden="true"/>Open folder</button><button type="button" className="secondary" disabled={busy} onClick={() => void onExport()}><Download size={15} aria-hidden="true"/>Export {item.kind === 'build' ? 'build' : 'folder'}</button><button type="button" className="secondary storage-danger" aria-label={`Delete ${item.kind === 'build' ? 'build' : 'folder'}: ${item.name} from ${item.projectTitle}`} disabled={busy || !item.canTrash} title={item.blockedReason} onClick={() => requestTrash()}><Trash2 size={15} aria-hidden="true"/>Delete {item.kind === 'build' ? 'build' : 'folder'}</button></div>
    </div>
    {!item.canTrash && <p className="storage-protection"><LockKeyhole size={14} aria-hidden="true"/>{item.blockedReason || 'This folder is in use. Stop the active work before moving it or its files to Trash.'}</p>}
    {loadError && <div className="storage-load-error" role="alert"><strong>Files could not be refreshed.</strong><p>{loadError}</p><button type="button" className="secondary" onClick={() => setRetry(value => value + 1)}><RefreshCw size={14}/>Retry files</button></div>}
    <>
      <div className="storage-file-toolbar"><label className="storage-search"><Search size={16} aria-hidden="true"/><input aria-label="Search files" placeholder="Find a file by name or path" value={query} onChange={event => setQuery(event.target.value)}/>{query && <button type="button" className="storage-clear" aria-label="Clear file search" onClick={() => setQuery('')}><X size={14}/></button>}</label><select aria-label="Filter files by type" value={category} onChange={event => setCategory(event.target.value as typeof category)}><option value="all">All file types</option>{Object.entries(categories).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><span className="storage-result-count" role="status">{loading ? 'Loading files…' : `${matches.length.toLocaleString()} of ${files.length.toLocaleString()} files`}</span></div>
      <div className="storage-file-browser" aria-busy={loading}>
        <div className="storage-file-list" aria-label="Files">
          <div className="storage-file-entries" ref={entries} role="group" aria-label="Files" aria-describedby={keyboardHintId}>
            {loading && !files.length ? <p className="storage-inline-empty" role="status">Reading this folder…</p> : matches.length ? visibleFiles.map(entry => <button type="button" key={entry.path} ref={element => { if (element) fileButtons.current.set(entry.path, element); else fileButtons.current.delete(entry.path); }} aria-label={`Preview ${entry.path}`} aria-pressed={selected === entry.path} tabIndex={tabStop === entry.path ? 0 : -1} className={selected === entry.path ? 'selected' : ''} onFocus={() => setFocusedPath(entry.path)} onClick={() => setSelected(entry.path)} onKeyDown={event => { if (!event.altKey && !event.ctrlKey && !event.metaKey && moveFileFocus(entry.path, event.key)) event.preventDefault(); }}><FileCode2 size={15} aria-hidden="true"/><span>{entry.path}<small>{categories[entry.category]} · {bytes(entry.size)}</small></span></button>) : <div className="storage-inline-empty"><p>{files.length ? 'No files match these filters.' : 'This folder is empty.'}</p>{files.length > 0 && <button type="button" className="text-button" onClick={() => { setQuery(''); setCategory('all'); }}>Clear file filters</button>}</div>}
          </div>
          <p id={keyboardHintId} className="storage-file-keyboard-hint">Arrow keys, Home & End browse files. Tab leaves this list.</p>
          {pageCount > 1 && <div className="storage-file-pagination" aria-label="File pages"><span role="status">{(pageStart + 1).toLocaleString()}–{Math.min(pageStart + filesPerPage, matches.length).toLocaleString()} of {matches.length.toLocaleString()} files</span><div><button type="button" className="secondary" aria-label="Previous file page" disabled={currentPage === 0} onClick={() => setPageIndex(value => Math.max(0, value - 1))}><ArrowLeft size={13} aria-hidden="true"/>Previous</button><button type="button" className="secondary" aria-label="Next file page" disabled={currentPage >= pageCount - 1} onClick={() => setPageIndex(value => Math.min(pageCount - 1, value + 1))}>Next<ArrowRight size={13} aria-hidden="true"/></button></div></div>}
        </div>
        <section className="storage-file-preview" aria-label="File preview" aria-busy={previewLoading}>
          {file ? <><div className="storage-preview-heading"><h2>{file.path}</h2><p>{bytes(file.size)} · Updated {formatDate(file.updatedAt)}</p><div className="storage-preview-actions"><button type="button" className="text-button" disabled={busy} onClick={() => void action(() => api.storageOpen(item.id, file.path))}><FolderOpen size={14} aria-hidden="true"/>Reveal file</button><button type="button" className="text-button" disabled={busy} onClick={() => void onExport(file.path)}><Download size={14} aria-hidden="true"/>Export file</button><button type="button" className="text-button storage-danger-text" disabled={busy || !item.canTrash} title={item.blockedReason} onClick={() => requestTrash(file)}><Trash2 size={14} aria-hidden="true"/>Move file to Trash</button></div></div>
            {previewLoading && !preview ? <p className="storage-inline-empty" role="status">Loading preview…</p> : previewError ? <div className="storage-inline-empty" role="alert"><p>{previewError}</p><button type="button" className="secondary" onClick={() => setPreviewRetry(value => value + 1)}>Retry preview</button></div> : preview?.kind === 'text' ? <>{preview.message && <p className="storage-preview-message">{preview.message}</p>}<pre tabIndex={0} aria-label={`Contents of ${file.path}`}>{preview.text || 'This file is empty.'}</pre></> : preview?.kind === 'image' && preview.url ? <div className="storage-image-preview"><img src={preview.url} alt={`Preview of ${file.path}`} onError={() => setPreviewError('This image could not be displayed. Reveal the file to inspect it in another app.')}/></div> : <Empty title="No preview available">{preview?.message || 'Export this file or reveal it in its folder to open it with another app.'}</Empty>}
          </> : <Empty title="Select a file"><File size={28} aria-hidden="true"/><span>Browse source, saved data, logs, and build evidence.</span></Empty>}
        </section>
      </div>
    </>
    <p className="storage-export-note">Storage exports are for inspection and backup. Use Delivery to export a verified build.</p>
  </section>;
}

export function DataStorage({ projects, onOpenProject, onLearning }: { projects: Project[]; onOpenProject: (id: string) => void; onLearning: () => void }) {
  const { overview, loading, loadError, refresh } = useStorageOverview();
  const [actionError, setActionError] = useState(''), [busy, setBusy] = useState(false), [notice, setNotice] = useState<Notice | null>(null);
  const [tab, setTab] = useState<Tab>('builds'), [query, setQuery] = useState(''), [projectFilter, setProjectFilter] = useState('all'), [sort, setSort] = useState('recent');
  const [selected, setSelected] = useState(''), [revision, setRevision] = useState(0), [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const inFlight = useRef(false);
  const tabId = useId();
  const libraryHeading = useRef<HTMLHeadingElement>(null), previousSelection = useRef('');
  useEffect(() => {
    const previous = previousSelection.current;
    previousSelection.current = selected;
    if (previous && !selected) requestAnimationFrame(() => {
      (document.getElementById(`${tabId}-item-${previous}`) ?? libraryHeading.current)?.focus({ preventScroll: true });
    });
  }, [selected, tabId]);
  const projectVersion = useMemo(() => projects.map(project => `${project.id}:${project.updatedAt}:${project.status}:${project.archivedAt ?? ''}`).join('|'), [projects]);
  useEffect(() => {
    if (overview) setSelected(id => overview.items.some(item => item.id === id) ? id : '');
  }, [overview]);
  const lastProjectVersion = useRef(projectVersion);
  useEffect(() => {
    if (lastProjectVersion.current === projectVersion) return;
    const timer = setTimeout(() => { lastProjectVersion.current = projectVersion; void refresh(); }, 350);
    return () => clearTimeout(timer);
  }, [projectVersion, refresh]);
  const action: Action = async (work, message) => {
    if (inFlight.current) return false;
    inFlight.current = true; setBusy(true); setActionError('');
    try { await work(); if (message) setNotice({ message }); return true; }
    catch (error) {
      setActionError(errorText(error));
      // A filesystem operation can commit before its final bookkeeping fails.
      setRevision(value => value + 1);
      await refresh();
      return false;
    }
    finally { inFlight.current = false; setBusy(false); }
  };
  async function restore(item: StorageTrashItem | string) {
    const id = typeof item === 'string' ? item : item.id;
    const success = await action(() => api.storageRestore(id), 'Restored to its original location.');
    if (success) { setRevision(value => value + 1); await refresh(); }
  }
  function requestTrash(item: StorageItem, file?: StorageFile) { setActionError(''); setConfirmation({ kind: 'trash', item, file }); }
  async function confirm() {
    if (!confirmation) return;
    const pending = confirmation;
    const success = await action(async () => {
      if (pending.kind === 'trash') {
        const trashed = await api.storageTrash(pending.item.id, pending.file?.path);
        setNotice({ message: `${pending.file?.path ?? pending.item.name} moved to Trash.`, undoId: trashed.id });
      } else {
        await api.storageDeleteForever(pending.item.id);
        setNotice({ message: `${pending.item.name} permanently deleted. ${bytes(pending.item.bytes)} removed from disk.` });
      }
    });
    if (success) { setConfirmation(null); setRevision(value => value + 1); await refresh(); }
  }
  async function archive(projectId: string, archived: boolean) {
    if (await action(() => api.storageArchiveProject(projectId, archived), archived ? 'Project archived. Its files are still available here.' : 'Project returned to your active projects.')) await refresh();
  }
  async function exportItem(itemId: string, file?: string) {
    await action(async () => {
      const destination = await api.storageExport(itemId, file);
      if (destination) setNotice({ message: `Export saved to ${destination}.` });
    });
  }
  const item = overview?.items.find(entry => entry.id === selected);
  const search = query.trim().toLocaleLowerCase();
  const matches = (projectId: string, ...terms: string[]) => (projectFilter === 'all' || projectId === projectFilter) && terms.join(' ').toLocaleLowerCase().includes(search);
  const items = (overview?.items ?? []).filter(entry => matches(entry.projectId, entry.projectTitle, entry.name, kinds[entry.kind])).sort((a, b) => sort === 'size' ? b.bytes - a.bytes : b.updatedAt.localeCompare(a.updatedAt));
  const storedProjects = (overview?.projects ?? []).filter(entry => matches(entry.id, entry.title)).sort((a, b) => sort === 'size' ? b.bytes - a.bytes : (projects.find(project => project.id === b.id)?.updatedAt ?? '').localeCompare(projects.find(project => project.id === a.id)?.updatedAt ?? ''));
  const trash = (overview?.trash ?? []).filter(entry => matches(entry.projectId, entry.projectTitle, entry.name)).sort((a, b) => sort === 'size' ? b.bytes - a.bytes : b.deletedAt.localeCompare(a.deletedAt));
  const resultCount = tab === 'builds' ? items.length : tab === 'projects' ? storedProjects.length : trash.length;
  const allCount = tab === 'builds' ? overview?.items.length ?? 0 : tab === 'projects' ? overview?.projects.length ?? 0 : overview?.trash.length ?? 0;
  const filtered = !!query || projectFilter !== 'all';
  const clearFilters = () => { setQuery(''); setProjectFilter('all'); };
  return <div className="page data-storage-page">
    {!item && <div className="page-heading storage-page-heading"><div><h1 ref={libraryHeading} tabIndex={-1}>Data & storage</h1><p>Find what AppYard has created. Keep what matters, clear what you no longer need.</p></div><div className="storage-heading-actions">{isDesktop && <span className="storage-refresh-status" role="status">{overview?.scanning ? 'Updating sizes…' : 'Updates automatically'}</span>}<button type="button" className="secondary" aria-label="Refresh storage" disabled={loading || busy || !isDesktop} onClick={() => { setRevision(value => value + 1); void refresh(true); }}><RefreshCw size={15} aria-hidden="true"/>{loading ? 'Refreshing…' : 'Refresh'}</button></div></div>}
    {notice && <div className="storage-notice" role="status"><CheckCircle2 size={17} aria-hidden="true"/><p>{notice.message}</p>{notice.undoId && <button type="button" className="text-button" disabled={busy} onClick={() => void restore(notice.undoId!)}><Undo2 size={14} aria-hidden="true"/>Undo</button>}<button type="button" className="storage-clear" aria-label="Dismiss notification" onClick={() => setNotice(null)}><X size={15}/></button></div>}
    {actionError && !confirmation && <div className="storage-action-error" role="alert"><p>{actionError}</p><button type="button" className="storage-clear" aria-label="Dismiss error" onClick={() => setActionError('')}><X size={15}/></button></div>}
    {!isDesktop ? <div className="storage-desktop-state"><HardDrive size={32} aria-hidden="true"/><h2>Your files live in the desktop app</h2><p>Open AppYard on your Mac to see disk usage, browse every build, export files, and manage Trash.</p><p className="small-note">This browser preview does not have access to your local build folders.</p></div> : <>
      {loadError && <div className="storage-load-error" role="alert"><strong>Storage could not be refreshed.</strong><p>{loadError}</p><button type="button" className="secondary" disabled={loading} onClick={() => void refresh()}><RefreshCw size={14} aria-hidden="true"/>Retry storage</button></div>}
      {item ? <FileBrowser key={item.id} item={item} revision={revision} busy={busy} action={action} back={() => setSelected('')} requestTrash={file => requestTrash(item, file)} onOpenProject={() => onOpenProject(item.projectId)} onExport={file => exportItem(item.id, file)} projectArchived={overview?.projects.find(project => project.id === item.projectId)?.archived ?? false} projectAvailable={projects.some(project => project.id === item.projectId)}/> : overview ? <>
        <div className="storage-summary" aria-label="Storage usage"><div className="storage-total"><HardDrive size={20} aria-hidden="true"/><span><strong>{overview.scanning && !overview.measuredAt ? 'Calculating…' : bytes(overview.totalBytes)}</strong> managed locally</span></div><div className="storage-summary-detail"><span><strong>{overview.items.some(entry => entry.measured === false) ? 'Calculating…' : bytes(overview.items.reduce((total, entry) => total + entry.bytes, 0))}</strong> Build folders</span><span><strong>{overview.scanning && !overview.measuredAt ? 'Calculating…' : bytes(overview.trashBytes)}</strong> Trash</span><span><strong>{overview.scanning && !overview.measuredAt ? 'Calculating…' : bytes(overview.otherBytes)}</strong> App data</span></div></div>
        {overview.warnings.length > 0 && <details className="storage-warnings"><summary><Info size={14} aria-hidden="true"/>Storage notes ({overview.warnings.length})</summary><ul>{overview.warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul></details>}
        <div className="storage-tabs" role="tablist" aria-label="Storage sections">{(['builds', 'projects', 'trash'] as const).map(value => <button key={value} type="button" role="tab" id={`${tabId}-${value}`} aria-controls={`${tabId}-panel`} aria-selected={tab === value} tabIndex={tab === value ? 0 : -1} onClick={() => setTab(value)} onKeyDown={event => {
          const values = ['builds', 'projects', 'trash'] as const;
          const next = event.key === 'ArrowRight' ? values[(values.indexOf(value) + 1) % 3] : event.key === 'ArrowLeft' ? values[(values.indexOf(value) + 2) % 3] : event.key === 'Home' ? values[0] : event.key === 'End' ? values[2] : null;
          if (next) { event.preventDefault(); setTab(next); document.getElementById(`${tabId}-${next}`)?.focus(); }
        }}>{value === 'builds' ? <FolderOpen size={16} aria-hidden="true"/> : value === 'projects' ? <Archive size={16} aria-hidden="true"/> : <Trash2 size={16} aria-hidden="true"/>}{value[0].toUpperCase() + value.slice(1)}<span>{value === 'builds' ? overview.items.length : value === 'projects' ? overview.projects.length : overview.trash.length}</span></button>)}</div>
        <div className="storage-library-toolbar"><label className="storage-search"><Search size={16} aria-hidden="true"/><input aria-label="Search storage" placeholder={tab === 'projects' ? 'Search projects' : 'Search projects or builds'} value={query} onChange={event => setQuery(event.target.value)}/>{query && <button type="button" className="storage-clear" aria-label="Clear storage search" onClick={() => setQuery('')}><X size={14}/></button>}</label><select aria-label="Filter storage by project" value={projectFilter} onChange={event => setProjectFilter(event.target.value)}><option value="all">All projects</option>{overview.projects.map(project => <option key={project.id} value={project.id}>{project.title}{project.archived ? ' (archived)' : ''}</option>)}</select><select aria-label="Sort storage" value={sort} onChange={event => setSort(event.target.value)}><option value="recent">Most recent</option><option value="size">Largest first</option></select></div>
        <section role="tabpanel" id={`${tabId}-panel`} aria-labelledby={`${tabId}-${tab}`} tabIndex={0}>
          <div className="storage-section-caption"><p>{tab === 'builds' ? 'Delete moves a build and its files to Trash, where you can restore or permanently delete them.' : tab === 'projects' ? 'Archive a project to set it aside. Its files stay available in storage.' : 'Items stay on disk until permanently deleted. Restore returns them to their original location.'}</p><span role="status">{filtered ? `${resultCount} of ${allCount}` : resultCount} {tab === 'projects' ? 'projects' : 'items'}</span></div>
          {tab === 'builds' && items.length > 0 && <div className="storage-items"><div className="storage-table-head" aria-hidden="true"><span>Build / project</span><span>Status</span><span>Updated</span><span>Size</span><span/></div>{items.map(entry => <div className="storage-item-row" key={entry.id}><button type="button" id={`${tabId}-item-${entry.id}`} className="storage-row-name" aria-label={`Browse ${entry.name} in ${entry.projectTitle}`} onClick={() => setSelected(entry.id)}><FolderOpen size={20} aria-hidden="true"/><span><strong>{entry.name}</strong><small>{entry.projectTitle} · {entry.measured === false ? 'Counting files…' : `${entry.fileCount.toLocaleString()} files`}</small></span><ChevronRight size={16} aria-hidden="true"/></button><ItemStatus item={entry}/><time dateTime={entry.updatedAt}>{formatDate(entry.updatedAt)}</time><span className="storage-row-size">{entry.measured === false ? 'Calculating…' : bytes(entry.bytes)}</span><div className="storage-row-actions"><IconButton label={`Open ${entry.name} folder in ${entry.projectTitle}`} disabled={busy} onClick={() => void action(() => api.storageOpen(entry.id))}><FolderOpen size={16}/></IconButton><button type="button" className="secondary storage-danger" aria-label={`Delete ${entry.name} from ${entry.projectTitle}`} disabled={busy || !entry.canTrash} title={entry.blockedReason} onClick={() => requestTrash(entry)}><Trash2 size={15} aria-hidden="true"/>Delete</button></div>{!entry.canTrash && <p className="storage-row-protection"><LockKeyhole size={12} aria-hidden="true"/>{entry.blockedReason || 'In use. Stop the active work before moving to Trash.'}</p>}</div>)}</div>}
          {tab === 'projects' && storedProjects.length > 0 && <div className="storage-projects">{storedProjects.map(project => {
            const available = projects.some(entry => entry.id === project.id);
            return <div className="storage-project-row" key={project.id}><div className="storage-project-copy"><h2>{project.title}</h2><p>{project.buildCount} {project.buildCount === 1 ? 'build' : 'builds'} · {overview.items.some(entry => entry.projectId === project.id && entry.measured === false) ? 'Calculating size…' : bytes(project.bytes)}{!available ? ' · Project record unavailable' : ''}</p></div><span className={'badge ' + (project.active ? 'active' : '')}>{project.active ? 'In use' : project.archived ? 'Archived' : available ? 'Available' : 'Files only'}</span><div className="storage-project-actions"><button type="button" className="secondary" disabled={project.archived || !available} title={!available ? 'The project record is unavailable.' : project.archived ? 'Unarchive this project before opening it.' : undefined} onClick={() => onOpenProject(project.id)}>Open project <ArrowRight size={14} aria-hidden="true"/></button><button type="button" className="secondary" aria-label={`${project.archived ? 'Unarchive' : 'Archive'} ${project.title}`} disabled={busy || project.active || !available} title={!available ? 'The project record is unavailable.' : project.active ? 'Stop the active work before archiving this project.' : undefined} onClick={() => void archive(project.id, !project.archived)}>{project.archived ? <ArchiveRestore size={15} aria-hidden="true"/> : <Archive size={15} aria-hidden="true"/>}{project.archived ? 'Unarchive' : 'Archive'}</button><button type="button" className="text-button" onClick={() => { setTab('builds'); setProjectFilter(project.id); setQuery(''); }}>Browse files</button></div></div>;
          })}</div>}
          {tab === 'trash' && trash.length > 0 && <div className="storage-trash">{trash.map(entry => <div className="storage-trash-row" key={entry.id}><Trash2 size={18} aria-hidden="true"/><div className="storage-trash-copy"><strong>{entry.name}</strong><p>{entry.projectTitle} · {kinds[entry.kind]}</p><small>Moved to Trash {formatDate(entry.deletedAt)}</small></div><span className="storage-row-size">{bytes(entry.bytes)}</span><div className="storage-trash-actions"><button type="button" className="secondary" aria-label={`Restore ${entry.name} to ${entry.projectTitle}`} disabled={busy} onClick={() => void restore(entry)}><ArchiveRestore size={15} aria-hidden="true"/>Restore</button><button type="button" className="secondary storage-danger" aria-label={`Delete permanently: ${entry.name} from ${entry.projectTitle}`} disabled={busy} onClick={() => { setActionError(''); setConfirmation({ kind: 'delete', item: entry }); }}><Trash2 size={15} aria-hidden="true"/>Delete permanently</button></div></div>)}</div>}
          {!resultCount && <Empty title={filtered ? 'Nothing matches these filters' : tab === 'builds' ? 'No build files yet' : tab === 'projects' ? 'No saved projects yet' : 'Trash is empty'} action={filtered ? <button type="button" className="secondary" onClick={clearFilters}>Clear filters</button> : undefined}>{filtered ? 'Try another name or choose a different project.' : tab === 'builds' ? 'Your generated files, previous builds, and agent sessions will appear here after you start building.' : tab === 'projects' ? 'Save a challenge to start organizing your work.' : 'Files and builds you move to Trash will appear here for recovery or permanent deletion.'}</Empty>}
        </section>
        <div className="storage-learning"><div><h2>Project learning</h2><p>Manage saved preferences and learned policies separately from build files.</p></div><button type="button" className="text-button" onClick={onLearning}>Manage learning <ArrowRight size={14} aria-hidden="true"/></button></div>
        <p className="storage-scope-note">Totals cover local files managed by AppYard. Manage exported copies elsewhere in Finder.</p>
      </> : !loadError && <div className="storage-initial-loading" role="status"><HardDrive size={28} aria-hidden="true"/><p>Loading saved builds…</p></div>}
    </>}
    {confirmation && <ConfirmDialog confirmation={confirmation} busy={busy} error={actionError} close={() => { setConfirmation(null); setActionError(''); }} confirm={() => void confirm()}/>}
  </div>;
}
