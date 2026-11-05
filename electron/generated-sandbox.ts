import { promises as fs } from 'node:fs';
import path from 'node:path';
import { codexExecutable } from './codex-rpc.js';

/** All host-launched generated commands use this mandatory OS boundary. */
export async function generatedSandboxCommand(root: string, executable: string, args: string[],
  options: { writableRoot?: string; loopbackPort?: number; dependencyInstall?: boolean } = {}) {
  const runtime = await fs.realpath(executable), workspace = await fs.realpath(root);
  const writable = await fs.realpath(options.writableRoot ?? root);
  if (workspace !== writable && !workspace.startsWith(writable + path.sep)) throw new Error('Sandbox workspace must stay inside its writable root.');
  const runner = codexExecutable();
  const bundle = runtime.match(/^(.*\.app)[/\\]Contents[/\\]/)?.[1];
  const runtimeRoot = bundle ?? (runtime.startsWith('/opt/homebrew/') ? '/opt/homebrew' : path.dirname(runtime));
  const toolchains = [...new Set(['/Library/Developer', '/opt/homebrew', '/usr/local', path.dirname(process.execPath), path.dirname(runner), runtimeRoot])];
  if (options.loopbackPort !== undefined) {
    if (!Number.isInteger(options.loopbackPort) || options.loopbackPort < 1 || options.loopbackPort > 65535) throw new Error('Invalid sandbox loopback port.');
    // The bundled runner's no-network profile also denies listening. Seatbelt
    // permits only this instance's assigned endpoint, never arbitrary loopback peers.
    // Other platforms fail closed until an equivalent port-scoped policy exists.
    if (process.platform !== 'darwin') throw new Error('Loopback service containment is currently supported only on macOS. No generated service was started.');
    const readRoots = [...new Set(['/System', '/usr/lib', '/usr/share', '/bin', '/sbin', '/usr/bin', '/usr/sbin', ...toolchains])];
    const profile = ['(version 1)', '(deny default)', '(allow process-exec)', '(allow process-fork)',
      '(allow signal (target same-sandbox))', '(allow process-info* (target same-sandbox))',
      '(allow sysctl-read)', '(allow ipc-posix-sem)', '(allow file-read-metadata)',
      '(allow mach-lookup (global-name "com.apple.system.opendirectoryd.libinfo") (global-name "com.apple.system.logger"))',
      '(allow file-read* (literal "/dev/null") (literal "/dev/random") (literal "/dev/urandom"))',
      '(allow file-write-data (literal "/dev/null"))',
      ...readRoots.map(folder => '(allow file-read* (subpath ' + JSON.stringify(folder) + '))'),
      '(allow file-read* file-write* (subpath ' + JSON.stringify(writable) + '))',
      '(allow network-bind (local ip "127.0.0.1:' + options.loopbackPort + '"))',
      '(allow network-inbound (local ip "127.0.0.1:' + options.loopbackPort + '"))',
      '(allow network-outbound (remote ip "127.0.0.1:' + options.loopbackPort + '"))'].join('\n');
    return { runner: '/usr/bin/sandbox-exec', args: ['-p', profile, runtime, ...args] };
  }
  const filesystem = { ':root': 'deny', ':minimal': 'read', ':workspace_roots': 'write',
    ...Object.fromEntries(toolchains.map(folder => [folder, 'read'])), [writable]: 'write' };
  const toml = '{' + Object.entries(filesystem).map(([key, value]) => JSON.stringify(key) + '=' + JSON.stringify(value)).join(',') + '}';
  return { runner, args: ['sandbox', '-P', 'fleet-build',
    '-c', 'permissions.fleet-build.filesystem=' + toml,
    // This exception is for host package managers with lifecycle scripts disabled,
    // never for a generated entrypoint, evaluator or test.
    '-c', 'permissions.fleet-build.network.enabled=' + (options.dependencyInstall ? 'true' : 'false'),
    '-c', 'projects={' + JSON.stringify(workspace) + '={trust_level="untrusted"}}', '--', runtime, ...args] };
}
