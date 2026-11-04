import { Sandbox } from '@vercel/sandbox';
import { useStorage } from 'nitro/storage';
import { createHash, randomUUID } from 'node:crypto';
import { HttpError } from './http.js';
export { Sandbox };
export const CONTROL = '/vercel/sandbox/control', RUNTIME = '/vercel/sandbox/runtime', WORKSPACE = '/vercel/sandbox/workspace';
export const sha256 = (value: Buffer | string) => createHash('sha256').update(value).digest('hex');

export async function readControl<T>(sandbox: Sandbox, path: string, max = 2 * 1024 * 1024): Promise<{ value: T; bytes: Buffer } | null> {
  if (!/^[a-zA-Z0-9_./-]+$/.test(path) || path.split('/').includes('..') || path.startsWith('/')) throw new Error('Invalid control path.');
  const file = await sandbox.readFileToBuffer({ path: `${CONTROL}/${path}` });
  if (!file) return null;
  if (file.length > max) throw new Error('Control data exceeds its limit.');
  return { value: JSON.parse(file.toString()), bytes: file };
}

export async function installRuntime(sandbox: Sandbox): Promise<void> {
  const tar = await useStorage('assets:worker').getItemRaw<Buffer>('dist-worker.tar.gz');
  if (!tar) throw new HttpError(503, 'The build worker is missing from this deployment.');
  const version = sha256(Buffer.from(tar));
  const installed = await readControl<{ version: string }>(sandbox, 'runtime-installed.json', 1024);
  if (installed) {
    if (installed.value.version !== version) throw new Error('This run belongs to another worker version. Start a new build.');
    return;
  }
  const staging = `${CONTROL}/runtime-${randomUUID()}.tar.gz`;
  await sandbox.writeFiles([{ path: staging, content: Buffer.from(tar) }]);
  const extract = await sandbox.runCommand('bash', ['-c', `set -eu
mkdir -p ${CONTROL} ${RUNTIME} ${WORKSPACE}
exec 8>${CONTROL}/setup.lock
flock 8
if [ ! -f ${CONTROL}/runtime-installed.json ]; then
  tar -xzf "$1" -C ${RUNTIME}
  printf '{"version":"%s"}' "$2" > ${CONTROL}/runtime-installed.json.tmp
  mv ${CONTROL}/runtime-installed.json.tmp ${CONTROL}/runtime-installed.json
fi
rm -f "$1"
`, 'install-runtime', staging, version]);
  if (extract.exitCode !== 0) throw new Error('Worker installation failed.');
  const checked = await readControl<{ version: string }>(sandbox, 'runtime-installed.json', 1024);
  if (checked?.value.version !== version) throw new Error('This run belongs to another worker version. Start a new build.');
}

/** Retries may upload staging files, but cannot replace an input already handed to a process. */
export async function stageInputs(sandbox: Sandbox, kind: 'worker' | 'verify', files: { path: string; content: Buffer | string }[]) {
  if (await readControl(sandbox, `${kind}-input-ready.json`, 1024)) return;
  const staging = `${CONTROL}/setup-${randomUUID()}`;
  for (const file of files) if ((!file.path.startsWith(CONTROL + '/') && !file.path.startsWith(WORKSPACE + '/')) || file.path.split('/').includes('..') || /[\x00-\x1f\\]/.test(file.path)) throw new Error('Invalid staged input path.');
  await sandbox.writeFiles([...files.map((file, index) => ({ path: `${staging}/${index}`, content: file.content, mode: 0o600 })),
    { path: `${staging}/paths.json`, content: JSON.stringify(files.map(file => file.path)), mode: 0o600 }]);
  const result = await sandbox.runCommand('bash', ['-c', `set -eu
exec 8>${CONTROL}/setup.lock
flock 8
if [ ! -f ${CONTROL}/${kind}-input-ready.json ]; then
node -e 'const fs=require("node:fs"),path=require("node:path"),base=process.argv[1];for(const [i,file] of JSON.parse(fs.readFileSync(base+"/paths.json","utf8")).entries()){fs.mkdirSync(path.dirname(file),{recursive:true});fs.copyFileSync(base+"/"+i,file)}' '${staging}'
printf '{}' > ${CONTROL}/${kind}-input-ready.json.tmp
mv ${CONTROL}/${kind}-input-ready.json.tmp ${CONTROL}/${kind}-input-ready.json
fi
rm -rf '${staging}'
`]);
  if (result.exitCode !== 0) throw new Error('Sandbox input preparation failed.');
}

// Dependencies install in a detached process, outside the serverless request lifetime.
export function runtimeLaunch(entrypoint: 'worker' | 'verify'): string {
  return `set -eu
exec 9>${CONTROL}/process.lock
flock 9
if [ -f ${CONTROL}/${entrypoint}.exit ]; then
  cat ${CONTROL}/${entrypoint}.stdout
  exit "$(cat ${CONTROL}/${entrypoint}.exit)"
fi
if [ -f ${CONTROL}/${entrypoint}.started ]; then exit 75; fi
test -f ${CONTROL}/${entrypoint}-input-ready.json
: > ${CONTROL}/${entrypoint}.started
: > ${CONTROL}/${entrypoint}.stdout
finish() {
  result=$?
  trap - EXIT
  printf '%s' "$result" > ${CONTROL}/${entrypoint}.exit.tmp
  mv ${CONTROL}/${entrypoint}.exit.tmp ${CONTROL}/${entrypoint}.exit
  cat ${CONTROL}/${entrypoint}.stdout
  exit "$result"
}
trap finish EXIT
cd ${RUNTIME}
npm install --omit=dev --ignore-scripts --no-audit --no-fund > ${CONTROL}/install.log 2>&1
if command -v dnf >/dev/null 2>&1; then
  sudo -n dnf install -y alsa-lib atk at-spi2-atk at-spi2-core cups-libs dbus-libs libdrm libX11 libXcomposite libXdamage libXext libXfixes libXrandr libxcb libxkbcommon mesa-libgbm nss pango cairo util-linux >> ${CONTROL}/install.log 2>&1
  npx playwright install chromium >> ${CONTROL}/install.log 2>&1
else
  npx playwright install --with-deps chromium >> ${CONTROL}/install.log 2>&1
fi
node ${entrypoint}.mjs ${CONTROL}/${entrypoint === 'worker' ? 'input' : 'verify-input'}.json > ${CONTROL}/${entrypoint}.stdout 2> ${CONTROL}/${entrypoint}.stderr
`;
}

export function appOrigin(): string {
  const origin = process.env.APP_ORIGIN ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:5173');
  const parsed = new URL(origin);
  if ((parsed.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(parsed.hostname)) || parsed.username || parsed.password || parsed.pathname !== '/' || parsed.search || parsed.hash) throw new Error('Invalid APP_ORIGIN.');
  return parsed.origin;
}
