import { useEffect, useId, useRef, useState, type ChangeEvent } from 'react';
import { Bot, ClipboardPaste, FileText, Paperclip, X } from 'lucide-react';
import type { BriefDataInput } from '../shared/types';
import { DATA_FILE_EXTENSIONS, MAX_DATA_INPUT_BYTES, MAX_DATA_INPUTS, MAX_TOTAL_DATA_INPUT_BYTES, normalizeDataInputs } from '../shared/project-input';
import './brief-data-inputs.css';

export interface DataInputEditor { open: boolean; name: string; content: string }
export const emptyDataInputEditor: DataInputEditor = { open: false, name: '', content: '' };

export function includePastedInput(inputs: BriefDataInput[], editor: DataInputEditor) {
  return normalizeDataInputs(editor.name || editor.content
    ? [...inputs, { name: editor.name.trim() || 'pasted-input.txt', kind: 'text', content: editor.content }]
    : inputs);
}

function formatBytes(bytes: number) {
  return bytes < 1024 ? `${bytes} B` : `${Math.ceil(bytes / 1024)} KB`;
}

export function BriefDataInputs({ value, onChange, editor, onEditorChange, disabled, onReadingChange, connectedCount = 0 }: {
  value: BriefDataInput[];
  onChange: (inputs: BriefDataInput[]) => void;
  editor: DataInputEditor;
  onEditorChange: (editor: DataInputEditor) => void;
  disabled: boolean;
  connectedCount?: number;
  onReadingChange: (reading: boolean) => void;
}) {
  const id = useId();
  const fileInput = useRef<HTMLInputElement>(null);
  const nameInput = useRef<HTMLInputElement>(null);
  const mounted = useRef(true);
  const readingRef = useRef(false);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState('');
  const locked = disabled || reading;
  const pendingPaste = Boolean(editor.content.trim());
  const totalBytes = value.reduce((total, input) => total + new TextEncoder().encode(input.content).length, 0);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  async function attachFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.currentTarget.files ?? []);
    event.currentTarget.value = '';
    if (!files.length || disabled || readingRef.current) return;
    readingRef.current = true;
    setReading(true);
    onReadingChange(true);
    setError('');
    try {
      if (value.length + files.length > MAX_DATA_INPUTS) throw new Error(`Use up to ${MAX_DATA_INPUTS} data inputs. Remove an input before adding more.`);
      if (totalBytes + files.reduce((total, file) => total + file.size, 0) > MAX_TOTAL_DATA_INPUT_BYTES) throw new Error('Keep all data inputs to 1 MB or less. Remove an input or choose a smaller file.');
      for (const file of files) {
        const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
        if (!DATA_FILE_EXTENSIONS.includes(extension)) throw new Error(`${file.name}: choose a CSV, JSON, or other supported text file.`);
        if (file.size > MAX_DATA_INPUT_BYTES) throw new Error(`${file.name}: choose a file of 256 KB or less.`);
      }
      const additions = await Promise.all(files.map(async file => ({ name: file.name, kind: 'file' as const, content: new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(await file.arrayBuffer()) })));
      const inputs = normalizeDataInputs([...value, ...additions]);
      if (mounted.current) onChange(inputs);
    } catch (cause) {
      if (mounted.current) setError(cause instanceof TypeError ? 'Could not read this file as UTF-8 text. Export it as CSV, JSON, or a text file and try again.' : cause instanceof Error ? cause.message : 'Could not read the selected files. Try attaching them again.');
    } finally {
      readingRef.current = false;
      if (mounted.current) { setReading(false); onReadingChange(false); }
    }
  }

  function addPastedInput() {
    setError('');
    try {
      if (!editor.content.trim()) throw new Error('Paste some data before adding this input.');
      onChange(includePastedInput(value, editor));
      onEditorChange(emptyDataInputEditor);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  return <section className="brief-data-inputs" aria-labelledby={id + '-heading'} aria-busy={reading}>
    <div className="brief-data-heading">
      <h3 id={id + '-heading'}>Data & inputs</h3>
      <div className="brief-data-actions">
        <button className="secondary" type="button" disabled={locked || value.length >= MAX_DATA_INPUTS} onClick={() => fileInput.current?.click()}><Paperclip size={14} aria-hidden="true"/>Attach files</button>
        <button className="secondary" type="button" disabled={locked || (value.length >= MAX_DATA_INPUTS && !editor.open && !editor.name && !editor.content)} aria-expanded={editor.open} aria-controls={id + '-editor'} onClick={() => { onEditorChange({ ...editor, open: !editor.open }); if (!editor.open) requestAnimationFrame(() => nameInput.current?.focus()); }}><ClipboardPaste size={14} aria-hidden="true"/>Paste data</button>
      </div>
    </div>
    <input ref={fileInput} className="brief-data-file-input" type="file" aria-label="Attach data files" aria-describedby={id + '-limits'} tabIndex={-1} multiple accept={DATA_FILE_EXTENSIONS.map(extension => '.' + extension).join(',')} disabled={locked} onChange={event => void attachFiles(event)}/>
    <p className="brief-data-hint" id={id + '-limits'}>CSV, JSON, and other text files. Up to 10 inputs, 256 KB each, 1 MB total.</p>
    {value.length > 0 ? <>
      <ul className="brief-data-list" aria-label="Connected data inputs">{value.map((input, index) => <li key={index + ':' + input.name}>
        <FileText size={16} aria-hidden="true"/>
        <span><strong>{input.name}</strong><small>{input.kind === 'file' ? 'Attached file' : 'Pasted input'} · {formatBytes(new TextEncoder().encode(input.content).length)}</small></span>
        <button className="icon-button" type="button" aria-label={'Remove ' + input.name} disabled={locked} onClick={() => { onChange(value.filter((_, itemIndex) => itemIndex !== index)); setError(''); }}><X size={15} aria-hidden="true"/></button>
      </li>)}</ul>
      <p className="brief-data-hint brief-data-ready">{value.length} input{value.length === 1 ? '' : 's'} connected · {formatBytes(totalBytes)}. {pendingPaste ? 'Your pasted input will also be included when you save the brief.' : 'Your build will use these inputs.'}</p>
    </> : <p className="brief-data-empty">{pendingPaste || connectedCount ? <ClipboardPaste size={17} aria-hidden="true"/> : <Bot size={17} aria-hidden="true"/>}<span>{pendingPaste ? 'Your pasted input will be included when you save the brief.' : connectedCount ? 'Your build will use the connected data selected below.' : 'No data yet. A dedicated agent will create synthetic data for this use case when the build starts.'}</span></p>}
    <div className="brief-data-editor" id={id + '-editor'} hidden={!editor.open}>
      <div className="brief-data-field"><label htmlFor={id + '-name'}>Input name</label><input id={id + '-name'} ref={nameInput} maxLength={120} value={editor.name} disabled={locked} onChange={event => onEditorChange({ ...editor, name: event.target.value })} placeholder="e.g. sample-orders.csv"/></div>
      <div className="brief-data-field"><label htmlFor={id + '-content'}>Input content</label><textarea id={id + '-content'} rows={4} value={editor.content} disabled={locked} onChange={event => onEditorChange({ ...editor, content: event.target.value })} placeholder="Paste sample records, messages, or other text your app should use." spellCheck={false}/></div>
      <div className="brief-data-editor-actions"><span className="field-hint">Pasted data is also included when you save the brief.</span><button className="text-button" type="button" disabled={locked} onClick={() => { onEditorChange(emptyDataInputEditor); setError(''); }}>Discard</button><button className="secondary" type="button" disabled={locked || !editor.content.trim()} onClick={addPastedInput}>Add input</button></div>
    </div>
    {reading && <p className="brief-data-hint" role="status">Reading files…</p>}
    {error && <p className="form-error brief-data-error" role="alert">{error}</p>}
  </section>;
}
