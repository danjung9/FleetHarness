import { promises as fs, constants } from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';

const initializationGraceMs = 1_000;
const timestamp = () => new Date().toISOString();
const sameFile = (left, right) => left.dev === right.dev && left.ino === right.ino;

async function canonicalDependencies(dependencyPath) {
  const canonical = await fs.realpath(dependencyPath);
  if (!(await fs.stat(canonical)).isDirectory()) throw new Error('Check coordination requires a dependency directory.');
  return canonical;
}

function pathForDependencies(dependencyPath) {
  const user = typeof process.getuid === 'function' ? String(process.getuid())
    : createHash('sha256').update(os.userInfo().username).digest('hex').slice(0, 16);
  const key = createHash('sha256').update(dependencyPath).digest('hex');
  // Keep the mutex outside node_modules: reinstalling dependencies must not
  // remove a live lock. Canonical paths join original and symlinked checkouts.
  return path.join(os.tmpdir(), `fleetharness-check-locks-${user}`, `${key}.lock`);
}

export async function checkLockPath(dependencyPath) {
  return pathForDependencies(await canonicalDependencies(dependencyPath));
}

function lockError(code, message, lockPath) {
  return Object.assign(new Error(`Check coordination: ${message} Lock retained at ${lockPath}.`), { code, lockPath });
}

function validOwner(owner, dependencyPath) {
  return owner !== null && typeof owner === 'object' && owner.schemaVersion === 1
    && typeof owner.token === 'string' && /^[0-9a-f-]{36}$/.test(owner.token)
    && Number.isSafeInteger(owner.pid) && owner.pid > 0
    && typeof owner.hostname === 'string' && owner.hostname.length > 0
    && typeof owner.artifactDirectory === 'string' && path.isAbsolute(owner.artifactDirectory)
    && owner.dependencyPath === dependencyPath && Number.isFinite(Date.parse(owner.acquiredAt));
}

async function readLock(lockPath, dependencyPath) {
  let handle;
  try {
    const initial = await fs.lstat(lockPath);
    if (!initial.isFile()) return { stat: initial, owner: null, nonordinary: true };
    // Check before opening, and also make the open nonblocking in case a FIFO
    // replaces the ordinary file between lstat and open.
    handle = await fs.open(lockPath, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0) | (constants.O_NONBLOCK ?? 0));
    const stat = await handle.stat();
    if (!stat.isFile() || stat.size > 64 * 1024) return { stat, owner: null, nonordinary: !stat.isFile() };
    let owner;
    try { owner = JSON.parse(await handle.readFile('utf8')); }
    catch (error) { if (!(error instanceof SyntaxError)) throw error; }
    return { stat, owner: validOwner(owner, dependencyPath) ? owner : null };
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  } finally { await handle?.close(); }
}

function wait(ms, signal) {
  return new Promise((resolve, reject) => {
    const finish = () => { signal?.removeEventListener('abort', abort); resolve(); };
    const timer = setTimeout(finish, ms);
    const abort = () => {
      clearTimeout(timer); signal.removeEventListener('abort', abort);
      reject(signal.reason ?? new Error('Check cancelled while waiting for validation.'));
    };
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) abort();
  });
}

/** A bounded, process-shared mutex. Abandoned locks require deliberate recovery. */
export async function acquireCheckLock({ dependencyPath, artifactDirectory, signal,
  timeoutMs = 1_800_000, pollMs = 250, onWaiting = async () => {} } = {}) {
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0 || !Number.isSafeInteger(pollMs) || pollMs <= 0) {
    throw new Error('Check coordination requires positive integer timeoutMs and pollMs.');
  }
  if (typeof artifactDirectory !== 'string' || !artifactDirectory) throw new Error('Check coordination requires an artifact directory.');
  signal?.throwIfAborted();
  dependencyPath = await canonicalDependencies(dependencyPath);
  const lockPath = pathForDependencies(dependencyPath);
  await fs.mkdir(path.dirname(lockPath), { recursive: true, mode: 0o700 });
  const requestedAt = timestamp(), started = performance.now();
  const elapsed = () => Math.max(0, Math.round(performance.now() - started));
  let lastOwner, lastObservedOwner, contended = false;
  const timeoutError = () => lockError('CHECK_LOCK_TIMEOUT',
    `Waited ${timeoutMs} ms for ${lastObservedOwner ? `owner PID ${lastObservedOwner.pid}` : 'an initializing owner'}; no check stage started.`, lockPath);
  for (;;) {
    signal?.throwIfAborted();
    if (contended && elapsed() >= timeoutMs) throw timeoutError();
    let handle;
    try { handle = await fs.open(lockPath, 'wx', 0o600); }
    catch (error) { if (error.code !== 'EEXIST') throw error; }
    if (handle) {
      const identity = await handle.stat();
      const owner = { schemaVersion: 1, token: randomUUID(), pid: process.pid, hostname: os.hostname(),
        artifactDirectory: path.resolve(artifactDirectory), dependencyPath, acquiredAt: timestamp() };
      let released = false, closed = false;
      const close = async () => { if (!closed) { await handle.close(); closed = true; } };
      const release = async () => {
        if (released) return;
        if (closed) throw lockError('CHECK_LOCK_CHANGED', 'The acquired lock could not be released safely; refusing another removal attempt.', lockPath);
        try {
          const current = await readLock(lockPath, dependencyPath);
          if (!current || !sameFile(current.stat, identity) || current.owner?.token !== owner.token) {
            throw lockError('CHECK_LOCK_CHANGED', 'The acquired lock changed; refusing to remove another owner\'s lock.', lockPath);
          }
          await fs.unlink(lockPath);
          released = true;
        } finally { await close(); }
      };
      try {
        await handle.writeFile(JSON.stringify(owner) + '\n');
        signal?.throwIfAborted();
        if (contended && elapsed() >= timeoutMs) throw timeoutError();
      } catch (error) {
        // This process created the file. An incomplete write can be cleaned up
        // only while the pathname still identifies that exact creation.
        try {
          const current = await fs.lstat(lockPath);
          if (sameFile(current, identity)) await fs.unlink(lockPath);
        } catch (cleanupError) { if (cleanupError.code !== 'ENOENT') error.cleanupError = cleanupError.message; }
        await close();
        throw error;
      }
      return { record: { lockPath, requestedAt, acquiredAt: owner.acquiredAt, waitMs: elapsed(), owner }, release };
    }

    contended = true;
    let current;
    try { current = await readLock(lockPath, dependencyPath); }
    catch (error) { throw lockError('CHECK_LOCK_UNREADABLE', `Cannot inspect the existing lock: ${error.message}`, lockPath); }
    if (!current) continue; // The previous owner released between open and read.
    const { owner, stat } = current;
    lastObservedOwner = owner;
    const ownerKey = `${stat.dev}:${stat.ino}:${owner?.token ?? 'initializing'}`;
    if (ownerKey !== lastOwner) {
      lastOwner = ownerKey;
      await onWaiting({ lockPath, requestedAt, waitMs: elapsed(), owner });
    }
    signal?.throwIfAborted();
    if (!owner && (current.nonordinary || Date.now() - stat.mtimeMs >= initializationGraceMs)) {
      throw lockError('CHECK_LOCK_MALFORMED', 'The owner record is malformed or incomplete. Confirm no validation or its children remain before manually removing this lock.', lockPath);
    }
    if (owner && owner.hostname !== os.hostname()) {
      throw lockError('CHECK_LOCK_UNKNOWN_HOST', 'The recorded owner belongs to another host. Confirm validation has stopped before manually removing this lock.', lockPath);
    }
    if (owner) {
      try { process.kill(owner.pid, 0); }
      catch (error) {
        if (error.code === 'ESRCH') {
          const confirmed = await readLock(lockPath, dependencyPath);
          if (!confirmed || !sameFile(confirmed.stat, stat) || confirmed.owner?.token !== owner.token) continue;
          throw lockError('CHECK_LOCK_ABANDONED', `Owner PID ${owner.pid} is no longer running. Confirm its stage children have stopped before manually removing this lock; prior evidence is in ${owner.artifactDirectory}.`, lockPath);
        }
        if (error.code !== 'EPERM') throw error;
      }
    }
    signal?.throwIfAborted();
    if (elapsed() >= timeoutMs) throw timeoutError();
    await wait(Math.max(1, Math.min(pollMs, timeoutMs - elapsed())), signal);
  }
}
