import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { ArrowRight, Loader2, LockKeyhole } from 'lucide-react';
import { Mark } from './Mark';
import { hostedAuth } from './hosted-auth';
import { hostedClient, SESSION_EXPIRED_EVENT } from './hosted-api';
import './hosted.css';

function AuthShell({ children }: { children: ReactNode }) {
  return <main className="auth-shell"><section className="auth-story">
    <div className="auth-brand"><div className="mark"><Mark/></div><span>AppYard</span></div>
    <span className="auth-eyebrow">Your private build workspace</span>
    <h1>From a brief<br/>to a working app.</h1>
    <p>Bring a problem. Follow the agents as they plan, build, and test. Come back to the same project whenever you’re ready.</p>
    <div className="auth-continuity"><span className="live-dot"/>Builds continue when you close this page or sign out.</div>
  </section><section className="auth-panel">{children}</section></main>;
}

function SignIn({ submit, notice, signingOut, retrySignOut }: { submit: (email: string, password: string) => Promise<void>; notice: string; signingOut: boolean; retrySignOut?: () => Promise<void> }) {
  const [email, setEmail] = useState(''), [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  async function signIn(event: FormEvent) {
    event.preventDefault(); setError(''); setBusy(true);
    try { await submit(email.trim(), password); setPassword(''); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Unable to sign in. Please try again.'); }
    finally { setBusy(false); }
  }
  return <div className="auth-card"><div className="auth-symbol"><LockKeyhole size={24}/></div><h2>Welcome back</h2><p className="muted">Sign in to your account to create a brief or pick up a saved build.</p>
    {notice && <p className="auth-notice" role="status">{notice}</p>}
    {retrySignOut && <button className="secondary" onClick={() => void retrySignOut()} disabled={signingOut}>Retry sign out</button>}
    <form onSubmit={signIn} aria-busy={busy || signingOut}>
      <label>Email<input type="email" name="email" required autoComplete="username" value={email} onChange={event => setEmail(event.target.value)} disabled={busy || signingOut}/></label>
      <label>Password<input type="password" name="password" required autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} disabled={busy || signingOut}/></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="primary full-width" disabled={busy || signingOut} type="submit">{busy || signingOut ? <Loader2 size={16} className="auth-spinner"/> : <ArrowRight size={16}/>} {signingOut ? 'Signing out…' : busy ? 'Signing in…' : 'Sign in'}</button>
    </form><p className="auth-access-note">This demo uses individual accounts created by the project owner. Your projects and OpenAI connection belong to your account.</p>
  </div>;
}

export function HostedAuthBoundary({ children }: { children: (user: User, signOut: () => Promise<void>) => ReactNode }) {
  const [session, setSession] = useState<Session | null>(null), [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState(''), [signingOut, setSigningOut] = useState(false), [logoutFailed, setLogoutFailed] = useState(false);
  const signedOut = useRef(false);
  function accept(next: Session | null) {
    hostedClient.setUserId(next?.user.id ?? null);
    setSession(next); setLoading(false);
  }
  useEffect(() => {
    if (!hostedAuth) { setLoading(false); return; }
    let active = true, authRevision = 0;
    const { data: { subscription } } = hostedAuth.auth.onAuthStateChange((_event, next) => {
      authRevision++;
      if (active && (!signedOut.current || !next)) accept(next);
    });
    const initialRevision = authRevision;
    void hostedAuth.auth.getSession().then(({ data, error }) => {
      if (!active || authRevision !== initialRevision) return;
      if (error) setNotice('Your session could not be restored. Please sign in again.');
      accept(error ? null : data.session);
    }).catch(() => { if (active && authRevision === initialRevision) { setNotice('Your session could not be restored. Please sign in again.'); accept(null); } });
    const expired = () => {
      authRevision++; signedOut.current = true; accept(null);
      setNotice('Your session has expired. Sign in again to return to your projects.');
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, expired);
    return () => { active = false; subscription.unsubscribe(); window.removeEventListener(SESSION_EXPIRED_EVENT, expired); hostedClient.setUserId(null); };
  }, []);
  async function signOut() {
    if (!hostedAuth) return;
    signedOut.current = true; accept(null); setSigningOut(true); setLogoutFailed(false); setNotice('');
    try {
      const { error } = await hostedAuth.auth.signOut({ scope: 'local' });
      if (error) throw error;
      setNotice('Signed out. Your builds continue in the cloud.');
    } catch {
      setNotice('Your workspace is hidden, but sign out could not finish. Reconnect and retry before leaving a shared computer.');
      setLogoutFailed(true);
    } finally { setSigningOut(false); }
  }
  if (!hostedAuth) return <AuthShell><div className="auth-card"><h2>Sign-in isn’t configured yet</h2><p className="muted">The project owner needs to finish connecting account storage for this deployment.</p><button className="secondary" onClick={() => location.reload()}>Try again</button></div></AuthShell>;
  if (loading) return <AuthShell><div className="auth-card" role="status"><Loader2 className="auth-spinner" size={24}/><h2>Opening your workspace…</h2></div></AuthShell>;
  if (session) return <>{children(session.user, signOut)}</>;
  return <AuthShell><SignIn notice={notice} signingOut={signingOut} retrySignOut={logoutFailed ? signOut : undefined} submit={async (email, password) => {
    signedOut.current = false; setNotice(''); setLogoutFailed(false);
    const { data, error } = await hostedAuth!.auth.signInWithPassword({ email, password });
    if (error) throw error;
    accept(data.session);
  }}/></AuthShell>;
}
