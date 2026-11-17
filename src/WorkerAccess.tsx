import { useEffect, useState, type ReactNode } from 'react';
import { workerCall, workerTokenKey, workerURL } from './worker-api';
export function WorkerAccess({ children }: { children: ReactNode }) {
  const [ready,setReady] = useState(!workerURL);
  const [token,setToken] = useState(''), [error,setError] = useState(''), [busy,setBusy] = useState(false);
  useEffect(() => {
    if (!workerURL) return;
    let current = true;
    const reset = () => { sessionStorage.removeItem(workerTokenKey); setReady(false); setError('Enter your workspace access token to reconnect.'); };
    window.addEventListener('appyard-worker-unauthorized',reset);
    const saved = sessionStorage.getItem(workerTokenKey);
    if (saved) { setBusy(true); void workerCall('bootstrap',[],saved).then(() => { if (current) setReady(true); }).catch(() => { if (current) reset(); }).finally(() => { if (current) setBusy(false); }); }
    return () => { current = false; window.removeEventListener('appyard-worker-unauthorized',reset); };
  }, []);
  if (ready) return <>{children}</>;
  return <main className="worker-login"><form onSubmit={async event => { event.preventDefault(); setBusy(true); setError(''); try { await workerCall('bootstrap',[],token); sessionStorage.setItem(workerTokenKey,token); setToken(''); setReady(true); } catch (error) { setError(error instanceof Error ? error.message : 'Could not connect.'); } finally { setBusy(false); } }}>
    <h1>AppYard</h1><p>Connect to your build workspace to turn an idea into a working app.</p>
    <label htmlFor="worker-token">Workspace access token</label><input id="worker-token" type="password" autoComplete="off" value={token} onChange={event => setToken(event.target.value)} required disabled={busy}/>
    {error && <p role="alert">{error}</p>}<button className="primary" disabled={busy || !token}>{busy ? 'Connecting…' : 'Open workspace'}</button>
  </form></main>;
}
