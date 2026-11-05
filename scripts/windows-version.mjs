// Three numeric 16-bit components work with both SemVer and Windows file versions.
// The workflow counter owns release ordering; retries get a higher patch.
export function windowsVersion({ runNumber, runAttempt, baseline = false, now = new Date(), version } = {}) {
  if (!version && runNumber !== undefined) {
    const run = Number(runNumber), attempt = Number(runAttempt);
    if (!Number.isSafeInteger(run) || run < 1 || !Number.isSafeInteger(attempt) || attempt < 1 || attempt > 32767) {
      throw new Error('Invalid GitHub run number/attempt for Windows version.');
    }
    version = `${1 + Math.floor(run / 65536)}.${run % 65536}.${attempt * 2}`;
  }
  if (!version) {
    const days = Math.floor((now.getTime() - Date.UTC(2020, 0, 1)) / 86400000);
    const tick = Math.max(2, Math.floor((now.getUTCHours() * 3600 + now.getUTCMinutes() * 60 + now.getUTCSeconds()) / 2));
    version = `0.${days}.${tick}`;
  }
  if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error('Windows version must contain three numeric components.');
  const parts = version.split('.').map(Number);
  if (baseline) parts[2]--;
  if (parts.some(n => !Number.isSafeInteger(n) || n < 0 || n > 65535)) throw new Error('Windows version components must be between 0 and 65535.');
  return parts.join('.');
}
