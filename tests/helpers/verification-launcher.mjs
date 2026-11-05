// Checked-in synthetic fixtures can isolate their behavior from native sandbox
// availability. Production code never imports or selects this launcher.
export function fixtureVerificationLauncher(_root, executable, args) {
  const ready = 'synthetic-fixture-verification-ready\n';
  const bootstrap = `process.stdout.write(${JSON.stringify(ready)});const child=require('node:child_process').spawn(process.execPath,${JSON.stringify(args)},{stdio:'inherit'});child.once('error',e=>{console.error(e.code);process.exitCode=1});child.once('exit',code=>{process.exitCode=code??1});`;
  return { runner: executable, args: ['--input-type=commonjs', '-e', bootstrap], ready, command: 'synthetic verification fixture launcher' };
}
