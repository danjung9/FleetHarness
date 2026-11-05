'use strict';
// macOS Seatbelt denies posix_spawn because its SETSID/SETPGROUP attributes
// bypass separate setsid/setpgid syscall checks. Explicit current identities
// select libuv's fork/exec path. This is compatibility code, not the boundary:
// bypassing this preload still leaves all three syscalls denied by the kernel.
const childProcess = require('node:child_process');
const uid = process.getuid(), gid = process.getgid();
const options = value => ({ ...value, uid, gid, detached: false });
// Electron can discard NODE_OPTIONS in every generation. Forward the trusted
// preload explicitly when spawning this same Node runtime. An intentional
// empty NODE_OPTIONS can still omit compatibility; kernel restrictions remain.
const runtimeArgs = (file, args, disabled) => file === process.execPath && !disabled
  && !(args[0] === '--require' && args[1] === __filename) ? ['--require', __filename, ...args] : args;
const spawn = childProcess.ChildProcess.prototype.spawn;
childProcess.ChildProcess.prototype.spawn = function (value) {
  const args = runtimeArgs(value.file, value.args.slice(1), value.envPairs?.includes('NODE_OPTIONS='));
  return spawn.call(this, options({ ...value, args: [value.args[0], ...args] }));
};
for (const name of ['spawnSync', 'execFileSync']) {
  const original = childProcess[name];
  childProcess[name] = function (file, args, value) {
    if (!Array.isArray(args)) { value = args; args = []; }
    return original.call(this, file, runtimeArgs(file, args, value?.env?.NODE_OPTIONS === ''), options(value));
  };
}
const execSync = childProcess.execSync;
childProcess.execSync = function (command, value) { return execSync.call(this, command, options(value)); };
require('node:module').syncBuiltinESMExports();
