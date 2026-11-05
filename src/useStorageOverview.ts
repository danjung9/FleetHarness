import { useCallback, useEffect, useRef, useState } from 'react';
import type { StorageOverview } from '../shared/data-storage';
import { api, isDesktop } from './api';

// Keep the last inventory available when returning from another destination.
let cachedOverview: StorageOverview | null = null;
const refreshInterval = 2_000;
const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error)).replace(/^Error invoking remote method '[^']+': Error: /, '');

export function useStorageOverview() {
  const [overview, setOverview] = useState(cachedOverview);
  const [loading, setLoading] = useState(isDesktop && !cachedOverview);
  const [loadError, setLoadError] = useState('');
  const requestRef = useRef<(force?: boolean) => Promise<void>>(async () => {});
  const refresh = useCallback((force = false) => requestRef.current(force), []);

  useEffect(() => {
    if (!isDesktop) return;
    let disposed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let running: Promise<void> | undefined;
    let requested = false, forceRequested = false;

    function schedule() {
      clearTimeout(timer);
      if (!disposed && document.visibilityState !== 'hidden') {
        timer = setTimeout(() => { void request(); }, refreshInterval);
      }
    }
    function request(force = false): Promise<void> {
      if (disposed) return Promise.resolve();
      clearTimeout(timer);
      requested = true;
      forceRequested ||= force;
      if (running) return running;
      // Coalesce focus, project updates, and manual refreshes into one request.
      // A trailing request catches changes made while the previous one ran.
      running = (async () => {
        while (requested && !disposed) {
          requested = false;
          const force = forceRequested;
          forceRequested = false;
          if (force || !cachedOverview) setLoading(true);
          try {
            const next = await api.storageOverview({ background: true, refresh: force });
            if (disposed) return;
            cachedOverview = next;
            setOverview(next);
            setLoadError('');
          } catch (error) {
            if (!disposed) setLoadError(errorText(error));
          } finally {
            if (!disposed) setLoading(false);
          }
        }
      })().finally(() => { running = undefined; schedule(); });
      return running;
    }
    function resume() {
      if (document.visibilityState !== 'hidden') void request();
      else clearTimeout(timer);
    }
    requestRef.current = request;
    document.addEventListener('visibilitychange', resume);
    window.addEventListener('focus', resume);
    void request();
    return () => {
      disposed = true;
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', resume);
      window.removeEventListener('focus', resume);
      requestRef.current = async () => {};
    };
  }, []);

  return { overview, loading, loadError, refresh };
}
