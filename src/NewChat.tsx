import { useId, useState, type FormEvent } from 'react';
import { ArrowUp, MessageSquare } from 'lucide-react';

export function NewChat({ busy, configured, build }: { busy: boolean; configured: boolean; build: (prompt: string) => Promise<boolean> }) {
  const [prompt, setPrompt] = useState('');
  const id = useId();
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!busy && prompt.trim().length >= 20) void build(prompt);
  }
  return <aside className="conversation-panel new-chat" aria-label="New app chat">
    <header className="conversation-panel-heading"><h2><MessageSquare size={19}/>New app</h2></header>
    <div className="conversation-scroll"><div className="conversation-intro"><h3>What do you want to build?</h3><p>Tell me what your app should do. We can work out the details as we go.</p></div></div>
    <div className="conversation-composer-area"><form className="conversation-composer" onSubmit={submit}>
      <label htmlFor={id}>Describe your app</label><textarea autoFocus id={id} rows={5} minLength={20} maxLength={16000} value={prompt} disabled={busy} onChange={event => setPrompt(event.target.value)} placeholder="Build an app that…" onKeyDown={event => { if (event.key === 'Enter' && (event.metaKey || event.ctrlKey) && !event.nativeEvent.isComposing) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }}/>
      <div className="conversation-composer-footer"><span>{configured ? 'Ctrl / ⌘ + Enter to send' : 'Save your idea, then connect a model.'}</span><button className="primary" type="submit" disabled={busy || prompt.trim().length < 20}>{busy ? 'Starting…' : 'Send'}<ArrowUp size={15}/></button></div>
    </form></div>
  </aside>;
}
