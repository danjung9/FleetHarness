import koffi from 'koffi';

// Environment blocks stay in memory. Only exact marker matches and immutable
// process start identities leave this module; never log environment contents.
// https://learn.microsoft.com/windows/win32/api/winternl/nf-winternl-ntqueryinformationprocess
const kernel = koffi.load('kernel32.dll');
const security = koffi.load('advapi32.dll');
const native = koffi.load('ntdll.dll');
const sessions = koffi.load('wtsapi32.dll');
// WTS provides ownership independently of a process's query/read DACL.
// https://learn.microsoft.com/windows/win32/api/wtsapi32/nf-wtsapi32-wtsenumerateprocessesw
const enumerate = sessions.func('int __stdcall WTSEnumerateProcessesW(uintptr_t server, uint32_t reserved, uint32_t version, _Out_ uintptr_t *processes, _Out_ uint32_t *count)');
const freeProcesses = sessions.func('void __stdcall WTSFreeMemory(uintptr_t buffer)');
const open = kernel.func('uintptr_t __stdcall OpenProcess(uint32_t access, int inherit, uint32_t pid)');
const close = kernel.func('int __stdcall CloseHandle(uintptr_t handle)');
const current = kernel.func('uintptr_t __stdcall GetCurrentProcess()');
const times = kernel.func('int __stdcall GetProcessTimes(uintptr_t handle, _Out_ void *created, _Out_ void *exited, _Out_ void *kernel, _Out_ void *user)');
const exitCode = kernel.func('int __stdcall GetExitCodeProcess(uintptr_t handle, _Out_ uint32_t *code)');
const terminate = kernel.func('int __stdcall TerminateProcess(uintptr_t handle, uint32_t code)');
const information = kernel.func('int __stdcall GetProcessInformation(uintptr_t handle, int kind, _Out_ void *buffer, uint32_t size)');
const read = kernel.func('int __stdcall ReadProcessMemory(uintptr_t handle, uintptr_t address, _Out_ void *buffer, size_t size, _Out_ size_t *received)');
const query = native.func('int32_t __stdcall NtQueryInformationProcess(uintptr_t handle, uint32_t kind, _Out_ void *buffer, uint32_t size, _Out_ uint32_t *received)');
const openToken = security.func('int __stdcall OpenProcessToken(uintptr_t process, uint32_t access, _Out_ uintptr_t *token)');
const tokenInfo = security.func('int __stdcall GetTokenInformation(uintptr_t token, int kind, _Out_ void *buffer, uint32_t size, _Out_ uint32_t *received)');
const sidLength = security.func('uint32_t __stdcall GetLengthSid(uintptr_t sid)');
type Handle = number | bigint;

function sidIdentity(address: Handle) {
  if (!address) return undefined;
  const length = sidLength(address);
  if (length < 8 || length > 68) throw new Error('Invalid process owner identity.');
  return Buffer.from(koffi.decode(address, 'uint8_t', length)).toString('hex');
}

function owner(handle: Handle) {
  const token: Handle[] = [0];
  if (!openToken(handle, 8, token)) return undefined;
  try {
    const data = Buffer.alloc(512), size = [0];
    if (!tokenInfo(token[0], 1, data, data.length, size)) throw new Error('Cannot inspect process ownership.');
    return sidIdentity(data.readBigUInt64LE(0));
  } finally { close(token[0]); }
}
const user = owner(current());
if (!user) throw new Error('Cannot determine the current Windows process owner.');
function integrity(handle: Handle) {
  const token: Handle[] = [0];
  if (!openToken(handle, 8, token)) throw new Error('Cannot inspect process integrity.');
  try {
    const data = Buffer.alloc(512), size = [0];
    if (!tokenInfo(token[0], 25, data, data.length, size)) throw new Error('Cannot inspect process integrity.');
    const address = data.readBigUInt64LE(0), length = sidLength(address);
    if (length < 12 || length > 68) throw new Error('Invalid process integrity identity.');
    const sid = Buffer.from(koffi.decode(address, 'uint8_t', length));
    return sid.readUInt32LE(length - 4);
  } finally { close(token[0]); }
}
const currentIntegrity = integrity(current());
// Normal children cannot acquire a higher integrity level without a separate
// elevation boundary. Elevated desktop utilities are outside this run's scope.
function inScope(handle: Handle) {
  const protection = Buffer.alloc(4);
  if (!information(handle, 7, protection, protection.length)) throw new Error('Cannot inspect process protection.');
  // PPL processes require a separately trusted, signed OS launch boundary.
  // Ordinary run children cannot become protected processes.
  if (protection.readUInt32LE(0) !== 0xfffffffe) return false;
  const identity = owner(handle);
  if (!identity) throw new Error('Cannot inspect process ownership.');
  if (identity !== user) return false;
  return integrity(handle) <= currentIntegrity;
}
function alive(handle: Handle) {
  const code = [0];
  return !!exitCode(handle, code) && code[0] === 259;
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
  candidates(): { pid: number; sameOwner: boolean | undefined }[];
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
  candidates() {
    if (process.platform !== 'win32' || process.arch !== 'x64') throw new Error('Windows process inspection requires an x64 host.');
    const buffer: Handle[] = [0], count = [0];
    if (!enumerate(0, 0, 1, buffer, count)) throw new Error('Cannot enumerate Windows process owners.');
    try {
      if (!buffer[0] || count[0] < 1 || count[0] > 65536) throw new Error('Invalid Windows process owner snapshot.');
      // WTS_PROCESS_INFOW on x64: two DWORDs, name pointer, primary-token SID pointer.
      const rows = Buffer.from(koffi.decode(buffer[0], 'uint8_t', count[0] * 24));
      const result: { pid: number; sameOwner: boolean | undefined }[] = [];
      for (let offset = 0; offset < rows.length; offset += 24) {
        const pid = rows.readUInt32LE(offset + 4);
        if (!pid) continue; // The idle pseudo-process has no user token.
        const identity = sidIdentity(rows.readBigUInt64LE(offset + 16));
        result.push({ pid, sameOwner: identity === undefined ? undefined : identity === user });
      }
      if (!result.some(entry => entry.pid === process.pid && entry.sameOwner)) throw new Error('Windows process owner snapshot omitted the current user.');
      return result;
    } finally { if (buffer[0]) freeProcesses(buffer[0]); }
  },
  open: (pid, allowTerminate) => open(0x1410 | (allowTerminate ? 1 : 0), 0, pid),
  limited: pid => open(0x1000, 0, pid),
  close: handle => { close(handle); }, alive, inScope, environment,
  started(handle) {
    const created = Buffer.alloc(8);
    if (!times(handle, created, Buffer.alloc(8), Buffer.alloc(8), Buffer.alloc(8))) throw new Error('Cannot inspect process start identity.');
    return created.readBigUInt64LE(0).toString();
  },
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
  // Refresh ownership to distinguish an exited/replaced process from a same-user
  // process denying inspection. Unknown ownership cannot confirm cleanup.
  if (access.candidates().some(entry => entry.pid === pid && entry.sameOwner !== false)) {
    throw new Error('Cannot inspect user process ' + pid + '.');
  }
}

export function windowsRunProcesses(marker: string, access: WindowsProcessAccess = systemAccess): Identity[] {
  const result: Identity[] = [];
  for (const candidate of access.candidates()) {
    const { pid } = candidate;
    if (candidate.sameOwner === false) continue;
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
