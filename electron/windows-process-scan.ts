import koffi from 'koffi';

// Environment blocks stay in memory. Only exact marker matches and immutable
// process start identities leave this module; never log environment contents.
// https://learn.microsoft.com/windows/win32/api/winternl/nf-winternl-ntqueryinformationprocess
const kernel = koffi.load('kernel32.dll');
const native = koffi.load('ntdll.dll');
const open = kernel.func('uintptr_t __stdcall OpenProcess(uint32_t access, int inherit, uint32_t pid)');
const close = kernel.func('int __stdcall CloseHandle(uintptr_t handle)');
const current = kernel.func('uintptr_t __stdcall GetCurrentProcess()');
const times = kernel.func('int __stdcall GetProcessTimes(uintptr_t handle, _Out_ void *created, _Out_ void *exited, _Out_ void *kernel, _Out_ void *user)');
const exitCode = kernel.func('int __stdcall GetExitCodeProcess(uintptr_t handle, _Out_ uint32_t *code)');
const terminate = kernel.func('int __stdcall TerminateProcess(uintptr_t handle, uint32_t code)');
const read = kernel.func('int __stdcall ReadProcessMemory(uintptr_t handle, uintptr_t address, _Out_ void *buffer, size_t size, _Out_ size_t *received)');
const query = native.func('int32_t __stdcall NtQueryInformationProcess(uintptr_t handle, uint32_t kind, _Out_ void *buffer, uint32_t size, _Out_ uint32_t *received)');
const createJob = kernel.func('uintptr_t __stdcall CreateJobObjectW(void *attributes, const char16_t *name)');
const assignJob = kernel.func('int __stdcall AssignProcessToJobObject(uintptr_t job, uintptr_t process)');
const setJob = kernel.func('int __stdcall SetInformationJobObject(uintptr_t job, int kind, void *buffer, uint32_t size)');
const queryJob = kernel.func('int __stdcall QueryInformationJobObject(uintptr_t job, int kind, _Out_ void *buffer, uint32_t size, _Out_ uint32_t *received)');
const isInJob = kernel.func('int __stdcall IsProcessInJob(uintptr_t process, uintptr_t job, _Out_ int *result)');
const lastError = kernel.func('uint32_t __stdcall GetLastError()');
type Handle = number | bigint;
let applicationJob: Handle = 0;

/** Initialize before launching any child. The unnamed, non-inheritable handle
 * stays open in the host. Descendants inherit membership, including nested jobs;
 * breakaway is disabled. Host exit kills descendants when the last handle closes.
 * https://learn.microsoft.com/windows/win32/api/jobapi2/nf-jobapi2-createjobobjectw
 * https://learn.microsoft.com/windows/win32/procthread/job-objects
 */
export function initializeWindowsProcessJob() {
  if (applicationJob) return;
  if (process.platform !== 'win32' || process.arch !== 'x64') throw new Error('Windows process inspection requires an x64 host.');
  const job = createJob(null, null);
  if (!job) throw new Error('Cannot create the Windows application process boundary.');
  // JOBOBJECT_EXTENDED_LIMIT_INFORMATION is 144 bytes on x64; LimitFlags is at 16.
  const limits = Buffer.alloc(144);
  limits.writeUInt32LE(0x2000, 16); // JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE
  if (!setJob(job, 9, limits, limits.length) || !assignJob(job, current())) {
    close(job);
    throw new Error('Cannot establish the Windows application process boundary; process launch refused.');
  }
  // Never close a successful assignment manually: the host itself is a member.
  applicationJob = job;
}

function jobProcesses() {
  if (!applicationJob) throw new Error('Windows process boundary was not initialized before launch.');
  let capacity = 128;
  while (capacity <= 65536) {
    const data = Buffer.alloc(8 + capacity * 8), received = [0];
    const ok = queryJob(applicationJob, 3, data, data.length, received);
    if (!ok && lastError() !== 234) throw new Error('Cannot inspect the Windows application process boundary.');
    const assigned = data.readUInt32LE(0), count = data.readUInt32LE(4);
    if (!ok || count < assigned) { capacity = Math.max(capacity * 2, assigned); continue; }
    if (!count || count > capacity || assigned > capacity) throw new Error('Invalid Windows application process snapshot.');
    const result: { pid: number }[] = [];
    for (let index = 0; index < count; index++) {
      const value = data.readBigUInt64LE(8 + index * 8);
      if (value <= 0n || value > 0xffffffffn) throw new Error('Invalid Windows application process identity.');
      // Kernel membership limits inspection to this app and is rechecked through
      // the opened handle; an inaccessible member stays inconclusive.
      result.push({ pid: Number(value) });
    }
    if (!result.some(entry => entry.pid === process.pid)) throw new Error('Windows application process snapshot omitted its host.');
    return result;
  }
  throw new Error('Windows application process snapshot exceeds its limit.');
}

function processStart(handle: Handle) {
  const created = Buffer.alloc(8);
  if (!times(handle, created, Buffer.alloc(8), Buffer.alloc(8), Buffer.alloc(8))) throw new Error('Cannot inspect process start identity.');
  return created.readBigUInt64LE(0);
}

function inScope(handle: Handle) {
  if (!applicationJob) throw new Error('Windows application process boundary is unavailable.');
  const member = [0];
  if (!isInJob(handle, applicationJob, member)) throw new Error('Cannot inspect process boundary membership.');
  return !!member[0];
}
function alive(handle: Handle) {
  const code = [0];
  if (!exitCode(handle, code)) throw new Error('Cannot inspect process exit status.');
  return code[0] === 259;
}
function memory(handle: Handle, address: bigint, size: number) {
  if (!address) throw new Error('Process environment is not initialized.');
  const bytes = Buffer.alloc(size), received: (number | bigint)[] = [0];
  if (!read(handle, address, bytes, size, received) || Number(received[0]) !== size) throw new Error('Cannot inspect process environment.');
  return bytes;
}
function environment(handle: Handle) {
  const wow = Buffer.alloc(8);
  if (query(handle, 26, wow, wow.length, null) !== 0) throw new Error('Cannot inspect process architecture.');
  const small = wow.readBigUInt64LE(0) !== 0n;
  let peb = wow.readBigUInt64LE(0);
  if (!small) {
    const basic = Buffer.alloc(48);
    if (query(handle, 0, basic, basic.length, null) !== 0) throw new Error('Cannot inspect process identity.');
    peb = basic.readBigUInt64LE(8);
  }
  const pointer = (address: bigint) => {
    const bytes = memory(handle, address, small ? 4 : 8);
    return small ? BigInt(bytes.readUInt32LE(0)) : bytes.readBigUInt64LE(0);
  };
  // Native x64 and WOW64 layouts. Unsupported future layouts fail inspection;
  // they never authorize killing a process from a command-line substring.
  const parameters = pointer(peb + (small ? 0x10n : 0x20n));
  const start = pointer(parameters + (small ? 0x48n : 0x80n));
  const chunks: Buffer[] = [];
  let previousNull = false;
  for (let offset = 0; offset < 1024 * 1024;) {
    const address = start + BigInt(offset);
    const size = Math.min(4096 - Number(address % 4096n), 1024 * 1024 - offset);
    const bytes = memory(handle, address, size);
    for (let i = 0; i + 1 < bytes.length; i += 2) {
      const empty = bytes.readUInt16LE(i) === 0;
      if (empty && previousNull) {
        chunks.push(bytes.subarray(0, i + 2));
        return Buffer.concat(chunks).toString('utf16le');
      }
      previousNull = empty;
    }
    chunks.push(bytes); offset += size;
  }
  throw new Error('Process environment exceeds the inspection limit.');
}

type Identity = { pid: number; started: string };
export interface WindowsProcessAccess {
  candidates(): { pid: number }[];
  open(pid: number, terminate: boolean): Handle;
  limited(pid: number): Handle;
  close(handle: Handle): void;
  alive(handle: Handle): boolean;
  inScope(handle: Handle): boolean;
  started(handle: Handle): string;
  environment(handle: Handle): string;
  terminate(handle: Handle): void;
}

const systemAccess: WindowsProcessAccess = {
  candidates: jobProcesses,
  open: (pid, allowTerminate) => open(0x1410 | (allowTerminate ? 1 : 0), 0, pid),
  limited: pid => open(0x1000, 0, pid),
  close: handle => { close(handle); }, alive, inScope, environment,
  started: handle => processStart(handle).toString(),
  terminate(handle) {
    // Terminate this verified kernel object, never reopen a possibly reused PID.
    // https://learn.microsoft.com/windows/win32/api/processthreadsapi/nf-processthreadsapi-terminateprocess
    if (!terminate(handle, 1) && alive(handle)) throw new Error('Could not terminate the verified run process.');
  }
};

function denied(pid: number, access: WindowsProcessAccess) {
  const limited = access.limited(pid);
  if (limited) {
    try { if (!access.alive(limited) || !access.inScope(limited)) return; }
    finally { access.close(limited); }
  }
  // Refresh membership to distinguish an exited process from an inaccessible
  // member. Unknown identity cannot confirm cleanup.
  if (access.candidates().some(entry => entry.pid === pid)) {
    throw new Error('Cannot inspect user process ' + pid + '.');
  }
}

export function windowsRunProcesses(marker: string, access: WindowsProcessAccess = systemAccess): Identity[] {
  const result: Identity[] = [];
  for (const candidate of access.candidates()) {
    const { pid } = candidate;
    const handle = access.open(pid, false);
    if (!handle) { denied(pid, access); continue; }
    try {
      if (!access.alive(handle) || !access.inScope(handle)) continue;
      const started = access.started(handle);
      const entries = access.environment(handle).split('\0');
      if (access.alive(handle) && entries.includes('APPYARD_RUN_PROCESS=' + marker)) result.push({ pid, started });
    } catch {
      if (access.alive(handle)) throw new Error('Cannot inspect user process ' + pid + '.');
    } finally { access.close(handle); }
  }
  return result;
}

export function windowsSignalRunProcess(marker: string, target: Identity, access: WindowsProcessAccess = systemAccess) {
  if (target.pid <= 1 || target.pid === process.pid || !/^[a-zA-Z0-9-]{1,100}$/.test(marker)) throw new Error('Invalid run process identity.');
  const handle = access.open(target.pid, true);
  if (!handle) { denied(target.pid, access); return; }
  try {
    if (!access.alive(handle) || !access.inScope(handle) || access.started(handle) !== target.started) return;
    if (!access.environment(handle).split('\0').includes('APPYARD_RUN_PROCESS=' + marker)) return;
    if (access.alive(handle)) access.terminate(handle);
  } finally { access.close(handle); }
}
