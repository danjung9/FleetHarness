import { spawn } from 'node:child_process';
import { CodexRpc, codexExecutable } from './codex-rpc.js';

export interface CodexGoalThreadOptions {
  workspace: string;
  objective: string;
  executable?: string;
  /** Must match CODEX_HOME in the Terminal command that resumes this thread. */
  home?: string;
  env?: NodeJS.ProcessEnv;
}

function unloadThread(rpc: CodexRpc, threadId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer); unsubscribe(); stopWatchingClose();
      if (error) reject(error); else resolve();
    };
    const unsubscribe = rpc.subscribe(message => {
      if (message.method === 'thread/closed' && message.params?.threadId === threadId) finish();
    });
    const stopWatchingClose = rpc.onClose(error => finish(error));
    const timer = setTimeout(() => finish(new Error('Codex did not finish preparing the goal session. Retry opening it.')), 10_000);
    void rpc.request('thread/unsubscribe', { threadId }).then(result => {
      if (result.status !== 'unsubscribed') finish(new Error('Codex could not unload the prepared goal session.'));
    }, error => finish(error));
  });
}

/** Persist a real goal without starting work until the interactive CLI resumes it. */
export async function prepareCodexGoalThread(options: CodexGoalThreadOptions): Promise<string> {
  if (!options.objective.trim()) throw new Error('A goal objective is required.');
  const env = { ...(options.env ?? process.env), ...(options.home ? { CODEX_HOME: options.home } : {}) };
  const rpc = new CodexRpc(spawn(options.executable ?? codexExecutable(), [
    'app-server', '--listen', 'stdio://', '--enable', 'goals', '-c', 'thread_unload_delay_secs=0'
  ], { cwd: options.workspace, env, stdio: ['pipe', 'pipe', 'pipe'], detached: process.platform !== 'win32', windowsHide: true }));
  try {
    await rpc.initialize();
    const started = await rpc.request('thread/start', { cwd: options.workspace, ephemeral: false });
    const threadId = started.thread?.id;
    if (typeof threadId !== 'string' || !threadId) throw new Error('Codex did not create a goal session.');

    // An active goal on a loaded thread immediately starts a model turn. Saving
    // it paused first also makes an otherwise empty thread durable on disk.
    await rpc.request('thread/goal/set', { threadId, objective: options.objective, status: 'paused', origin: 'user' });
    await unloadThread(rpc, threadId);
    // An unloaded thread can store an active goal, but cannot execute it. The
    // CLI's `resume <threadId>` then starts goal pursuit automatically.
    const result = await rpc.request('thread/goal/set', { threadId, status: 'active', origin: 'user' });
    if (result.goal?.status !== 'active' || result.goal?.objective !== options.objective) throw new Error('Codex did not save the requested goal.');
    return threadId;
  } finally {
    rpc.dispose();
  }
}
