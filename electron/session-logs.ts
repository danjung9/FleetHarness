import { SessionManager } from '@earendil-works/pi-coding-agent';
import { mkdirSync, writeFileSync, appendFileSync } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { redactValue } from './secrets.js';

/** SDK context stays in memory. Only sanitized entries reach the durable session log. */
export function redactedSessionManager(workspace: string, directory: string): SessionManager {
  const manager = SessionManager.inMemory(workspace);
  const file = path.join(directory, randomUUID() + '.jsonl');
  let opened = false;
  manager._persist = entry => {
    if (!opened) {
      mkdirSync(directory, { recursive: true, mode: 0o700 });
      writeFileSync(file, JSON.stringify(redactValue(manager.getHeader())) + '\n', { flag: 'wx', mode: 0o600 });
      opened = true;
    }
    appendFileSync(file, JSON.stringify(redactValue(entry)) + '\n');
  };
  return manager;
}
