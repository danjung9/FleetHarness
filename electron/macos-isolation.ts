import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { IsolationProfile } from './isolated-executor.js';

const resources = fileURLToPath(new URL('../../templates/isolation/', import.meta.url));
const quote = (value: string) => JSON.stringify(value);
const inside = (root: string, child: string) => child === root || child.startsWith(root + path.sep);
const match = (file: string) => `(subpath ${quote(file)})`;
const shellQuote = (value: string) => "'" + value.replaceAll("'", "'\"'\"'") + "'";

/** Compile the same longest-path filesystem map as the Codex permission profile.
 * Explicit restrictions also override the implicit platform read grants. */
export async function macosIsolationPolicy(profile: IsolationProfile): Promise<string> {
  if (profile.filesystem[':root'] !== 'deny' || profile.filesystem[':minimal'] !== 'read' || profile.network.enabled) throw new Error('Unsupported macOS isolation policy.');
  const entries = Object.entries(profile.filesystem).filter(([file]) => !file.startsWith(':'));
  if (entries.some(([file, access]) => !path.isAbsolute(file) || !['deny', 'read', 'write'].includes(access))) throw new Error('Invalid macOS filesystem grant.');
  const [base, minimal] = await Promise.all(['seatbelt-base.sbpl', 'seatbelt-minimal.sbpl'].map(file => fs.readFile(path.join(resources, file), 'utf8')));
  const rules: string[] = [base, minimal];
  for (const [file, access] of entries) {
    const children = entries.filter(([child]) => child !== file && inside(file, child));
    const region = (exceptions: string[]) => exceptions.length ? `(require-all ${match(file)} (require-not (require-any ${exceptions.map(match).join(' ')})))` : match(file);
    // The narrowest explicit rule wins. More-specific grants are emitted
    // independently; excluding every child here prevents parent grants widening it.
    const own = region(children.map(([child]) => child));
    rules.push(`(allow file-read-metadata file-test-existence (path-ancestors ${quote(file)}))`);
    if (access === 'deny') rules.push(`(deny file-read* file-test-existence file-write* ${own})`);
    else {
      rules.push(`(allow file-read* file-test-existence ${own})`);
      rules.push(`(${access === 'write' ? 'allow' : 'deny'} file-write* ${own})`);
    }
    // Prevent renaming a protected subtree out of its path-based restrictions.
    if (access !== 'write') for (let ancestor = path.dirname(file); ancestor !== path.dirname(ancestor); ancestor = path.dirname(ancestor)) {
      rules.push(`(deny file-write-unlink (require-all (vnode-type DIRECTORY) (literal ${quote(ancestor)})))`);
    }
  }
  rules.push('(deny syscall-unix (syscall-number SYS_setsid SYS_setpgid SYS_posix_spawn))');
  // The minimal platform policy grants only syslog socket access. Generated
  // candidates require no outbound sockets; external calls use framed stdio.
  rules.push('(deny network*)');
  return rules.join('\n');
}

/** python.org framework launchers posix_spawn the actual interpreter. Resolve
 * that known adjacent executable before entering the no-posix_spawn boundary. */
export async function macosRuntimeExecutable(executable: string): Promise<string> {
  const framework = /^(.*\/Python\.framework\/Versions\/[^/]+)\/bin\/python[^/]*$/.exec(executable);
  if (!framework) return executable;
  const actual = path.join(framework[1], 'Resources/Python.app/Contents/MacOS/Python');
  const resolved = await fs.realpath(actual);
  if (!(await fs.stat(resolved)).isFile()) throw new Error('The Python framework interpreter is unavailable.');
  return resolved;
}

export async function prepareMacosIsolation(profile: IsolationProfile, scratch: string, executable: string, args: string[]) {
  const preload = path.join(scratch, 'node-fork.cjs');
  await fs.writeFile(preload, await fs.readFile(path.join(resources, 'node-fork.cjs')), { flag: 'wx', mode: 0o400 });
  profile.filesystem[preload] = 'read';
  const actual = await macosRuntimeExecutable(executable);
  profile.filesystem[actual] = 'read';
  // The desktop's process.execPath is Electron in Node mode. macOS Electron
  // discards NODE_OPTIONS when it cannot authenticate the sandboxed parent,
  // so the trusted compatibility preload must be an explicit runtime argument.
  // Only the known host Node runtime accepts these flags; Python stays intact.
  const nodeRuntime = actual === await fs.realpath(process.execPath);
  let nodeBin: string | undefined;
  if (nodeRuntime) {
    nodeBin = path.join(scratch, 'bin');
    await fs.mkdir(nodeBin, { mode: 0o700 });
    await fs.writeFile(path.join(nodeBin, 'node'),
      `#!/bin/sh\nexec ${shellQuote(actual)} --require ${shellQuote(preload)} "$@"\n`, { flag: 'wx', mode: 0o500 });
    // Keep the launcher outside writable home/tmp so candidate code cannot
    // replace the runtime used by later shell commands or test workers.
    profile.filesystem[nodeBin] = 'read';
  }
  const policy = await macosIsolationPolicy(profile);
  return { executable: '/usr/bin/sandbox-exec',
    args: ['-p', policy, actual, ...(nodeRuntime ? ['--require', preload] : []), ...args], nodeBin,
    nodeOptions: nodeRuntime && process.versions.electron ? undefined : '--require ' + quote(preload) };
}
