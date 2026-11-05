import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
const [root, nonce, deadlineText, shellText] = process.argv.slice(2);
const shellPid = Number(shellText);
const role = path.basename(process.argv[1]).startsWith('child') ? 'child' : 'parent';
const finish = reason => {
  try { writeFileSync(path.join(root, role + '.exit.json'), JSON.stringify({ nonce, pid: process.pid, at: Date.now(), reason })); } catch {}
  process.exit(0);
};
const deadline = Number(deadlineText);
const tick = name => {
  if (existsSync(path.join(root, 'cleanup')) && readFileSync(path.join(root, 'cleanup'), 'utf8') === nonce) finish('cleanup');
  if (Date.now() >= deadline) finish('watchdog');
  try { appendFileSync(path.join(root, name + '.ticks'), String(Date.now()) + '\n'); }
  catch { finish('write-error'); }
};
setTimeout(() => finish('watchdog'), Math.max(1, Math.min(60000, deadline - Date.now())));
import { spawn } from 'node:child_process';
const child = spawn(process.execPath, [path.join(root, 'child.mjs'), root, nonce, String(deadline), String(shellPid)], { stdio: 'ignore', detached: true });
child.unref();
child.on('error', () => process.exit(2));
writeFileSync(path.join(root, 'parent.json'), JSON.stringify({ nonce, role: 'parent', pid: process.pid, parentPid: process.ppid, shellPid, childPid: child.pid, detached: true, unrefCalled: true, deadline }));
tick('parent'); setInterval(() => tick('parent'), 100);
