import * as fileSystem from 'node:fs/promises';
import { constants } from 'node:fs';
import { isAbsolute, join } from 'node:path';
import { pathToFileURL } from 'node:url';

// A caller cannot turn this credentialed runner into an arbitrary HTTP client.
export const MAIL_DISPATCH_URL = 'https://web-30-git-codex-patagonia-52d73e-lizamaclaudio-blips-projects.vercel.app/api/vector/mail/dispatch';
export const RUNNER_TIMEOUT_MS = 55_000;
export const RUNNER_COOLDOWN_MS = 120_000;
const RESPONSE_LIMIT_BYTES = 2048;
const STATE_FILE = 'mail-runner-state.json';
const LOCK_FILE = 'mail-runner.lock';
const TEMP_FILE = 'mail-runner-state.pending';
const STATE_CODES = new Set(['IDLE', 'IN_FLIGHT', 'DISPATCH_ACKNOWLEDGED', 'WORKER_RESPONSE_INVALID', 'AUTH_BLOCKED', 'HTTP_FAILED', 'HTTP_TIMEOUT', 'NETWORK_FAILED']);
const result = (code, ok = false) => ({ ok, code });
const credential = value => typeof value === 'string' && value.length >= 32 && value.length <= 4096 && /^[\x21-\x7e]+$/.test(value);

function validState(state) {
  return state !== null && typeof state === 'object' && !Array.isArray(state)
    && Object.keys(state).sort().join(',') === 'blocked,lastAttemptAt,result,version'
    && state.version === 1 && typeof state.blocked === 'boolean' && STATE_CODES.has(state.result)
    && (state.lastAttemptAt === null || (Number.isSafeInteger(state.lastAttemptAt) && state.lastAttemptAt >= 0))
    && (state.lastAttemptAt === null) === (state.result === 'IDLE')
    && state.blocked === (state.result === 'AUTH_BLOCKED');
}

const emptyState = () => ({ version: 1, lastAttemptAt: null, blocked: false, result: 'IDLE' });

async function validWorkerResponse(response) {
  let reader;
  try {
    if (!/^application\/json(?:\s*;|$)/i.test(response.headers.get('content-type') || '')) return false;
    const declaredLength = response.headers.get('content-length');
    if (declaredLength !== null && (!/^\d+$/.test(declaredLength) || Number(declaredLength) > RESPONSE_LIMIT_BYTES)) return false;
    reader = response.body?.getReader();
    if (!reader) return false;
    const chunks = [];
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!(value instanceof Uint8Array) || chunks.length >= 128 || size + value.byteLength > RESPONSE_LIMIT_BYTES) return false;
      size += value.byteLength; chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    const body = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    const names = ['sent', 'retry', 'unknown', 'failed', 'suppressed'];
    const expected = ['ok', 'enabled', 'claimed', ...names].sort().join(',');
    return body !== null && typeof body === 'object' && !Array.isArray(body)
      && Object.keys(body).sort().join(',') === expected && body.ok === true && body.enabled === true
      && [body.claimed, ...names.map(name => body[name])].every(value => Number.isInteger(value) && value >= 0 && value <= 4)
      && names.reduce((sum, name) => sum + body[name], 0) === body.claimed;
  } catch { return false; }
  finally {
    if (reader) {
      try { await reader.cancel(); } catch { /* Response contents are never diagnostics. */ }
      reader.releaseLock();
    }
  }
}

/** Linux/private POSIX server storage. Windows ACLs are not guessed from mode bits. */
export function createFileStore(directory, { fs = fileSystem, platform = process.platform, uid = process.getuid?.(), fileConstants = constants } = {}) {
  const statePath = join(directory, STATE_FILE);
  const lockPath = join(directory, LOCK_FILE);
  const pendingPath = join(directory, TEMP_FILE);
  let lockHandle;
  let lockIdentity;
  const privateEntry = stat => stat.uid === uid && (stat.mode & 0o077) === 0 && !stat.isSymbolicLink();
  const privateFile = stat => stat.isFile() && stat.nlink === 1 && privateEntry(stat);
  return {
    async lock() {
      if (platform !== 'linux' || !Number.isInteger(uid) || uid < 0
        || !fileConstants.O_NOFOLLOW || !fileConstants.O_DIRECTORY) return 'UNSUPPORTED_HOST';
      let directoryStat;
      try { directoryStat = await fs.lstat(directory); } catch { return 'PRIVATE_DIRECTORY_REQUIRED'; }
      if (!directoryStat.isDirectory() || !privateEntry(directoryStat)) return 'PRIVATE_DIRECTORY_REQUIRED';
      try {
        lockHandle = await fs.open(lockPath, fileConstants.O_CREAT | fileConstants.O_EXCL | fileConstants.O_WRONLY | fileConstants.O_NOFOLLOW, 0o600);
        lockIdentity = await lockHandle.stat();
        if (!privateFile(lockIdentity)) {
          await lockHandle.close(); lockHandle = undefined;
          return 'LOCK_UNSAFE';
        }
        await lockHandle.sync();
        return 'ACQUIRED';
      } catch (error) {
        try { await lockHandle?.close(); } catch { /* Retain a possibly created lock. */ }
        lockHandle = undefined;
        // Never steal a stale lock: a killed/uncertain run requires operator review.
        if (error?.code === 'EEXIST') return 'LOCKED';
        return 'LOCK_UNAVAILABLE';
      }
    },
    async read() {
      let handle;
      try {
        handle = await fs.open(statePath, fileConstants.O_RDONLY | fileConstants.O_NOFOLLOW);
        const stat = await handle.stat();
        if (!privateFile(stat) || stat.size > 1024) throw new Error('Unsafe state');
        const state = JSON.parse(await handle.readFile({ encoding: 'utf8' }));
        if (!validState(state)) throw new Error('Invalid state');
        return state;
      } catch (error) {
        if (error?.code === 'ENOENT') return emptyState();
        throw new Error('Invalid state');
      } finally { await handle?.close(); }
    },
    async write(state) {
      if (!validState(state)) throw new Error('Invalid state');
      let handle;
      try {
        // A leftover pending file fails closed; it is never silently overwritten.
        handle = await fs.open(pendingPath, fileConstants.O_CREAT | fileConstants.O_EXCL | fileConstants.O_WRONLY | fileConstants.O_NOFOLLOW, 0o600);
        if (!privateFile(await handle.stat())) throw new Error('Unsafe pending state');
        await handle.writeFile(JSON.stringify(state) + '\n', { encoding: 'utf8' });
        await handle.sync();
        await handle.close(); handle = undefined;
        await fs.rename(pendingPath, statePath);
        // Flush the rename so an acknowledged pre-request reservation is durable.
        const directoryHandle = await fs.open(directory, fileConstants.O_RDONLY | fileConstants.O_DIRECTORY | fileConstants.O_NOFOLLOW);
        try { await directoryHandle.sync(); } finally { await directoryHandle.close(); }
      } finally { await handle?.close(); }
    },
    async unlock() {
      if (!lockHandle || !lockIdentity) throw new Error('No owned lock');
      const stat = await fs.lstat(lockPath);
      if (!privateFile(stat) || stat.dev !== lockIdentity.dev || stat.ino !== lockIdentity.ino) throw new Error('Lock changed');
      await lockHandle.close(); lockHandle = undefined;
      await fs.unlink(lockPath);
    },
    async retainLock() {
      // Close descriptors, but retain the lock file on uncertain persistence.
      await lockHandle?.close(); lockHandle = undefined;
    },
  };
}

/** One bounded invocation; imports alone never read real credentials or send HTTP. */
export async function runMailRunner(env = {}, dependencies = {}) {
  if (env.VECTOR_MAIL_RUNNER_ENABLED !== 'true') return result('DISABLED', true);
  if (env.NODE_TLS_REJECT_UNAUTHORIZED === '0'
    || !credential(env.VECTOR_MAIL_WORKER_SECRET) || !credential(env.VECTOR_MAIL_RUNNER_VERCEL_BYPASS)
    || typeof env.VECTOR_MAIL_RUNNER_STATE_DIR !== 'string' || !isAbsolute(env.VECTOR_MAIL_RUNNER_STATE_DIR)
    || /[\x00-\x1f]/.test(env.VECTOR_MAIL_RUNNER_STATE_DIR)) return result('INVALID_CONFIGURATION');

  const store = dependencies.store ?? createFileStore(env.VECTOR_MAIL_RUNNER_STATE_DIR);
  const now = dependencies.now ?? Date.now;
  const request = dependencies.fetch ?? globalThis.fetch;
  const schedule = dependencies.setTimeout ?? globalThis.setTimeout;
  const unschedule = dependencies.clearTimeout ?? globalThis.clearTimeout;
  let acquired = false;
  let retain = false;
  let outcome = result('STORAGE_UNAVAILABLE');
  const invoke = async () => {
    let state;
    try { state = await store.read(); } catch { return result('STATE_INVALID'); }
    if (!validState(state)) return result('STATE_INVALID');
    if (state.blocked) return result('AUTH_BLOCKED');
    const attemptedAt = now();
    if (!Number.isSafeInteger(attemptedAt) || attemptedAt < 0
      || (state.lastAttemptAt !== null && attemptedAt < state.lastAttemptAt)) return result('CLOCK_INVALID');
    if (state.lastAttemptAt !== null && attemptedAt - state.lastAttemptAt < RUNNER_COOLDOWN_MS) return result('COOLDOWN', true);

    // Commit the reservation before sending: a crash cannot immediately replay HTTP.
    state = { version: 1, lastAttemptAt: attemptedAt, blocked: false, result: 'IN_FLIGHT' };
    retain = true;
    try { await store.write(state); } catch { return result('STATE_WRITE_FAILED'); }
    const controller = new AbortController();
    let timedOut = false;
    const timer = schedule(() => { timedOut = true; controller.abort(); }, RUNNER_TIMEOUT_MS);
    try {
      const response = await request(MAIL_DISPATCH_URL, {
        method: 'POST', redirect: 'error', credentials: 'omit', cache: 'no-store', signal: controller.signal,
        headers: { 'Content-Type': 'application/json',
          Authorization: `Bearer ${env.VECTOR_MAIL_WORKER_SECRET}`,
          'x-vercel-protection-bypass': env.VECTOR_MAIL_RUNNER_VERCEL_BYPASS },
        body: '{}',
      });
      // Validate only a small aggregate acknowledgement. Never log, persist or
      // forward body contents or response headers (including redirects).
      const acknowledged = response.status === 200 && await validWorkerResponse(response);
      try { await response.body?.cancel(); } catch { /* No diagnostics leave this boundary. */ }
      state.result = response.status === 401 || response.status === 403 ? 'AUTH_BLOCKED'
        : timedOut ? 'HTTP_TIMEOUT' : response.status === 200 ? acknowledged ? 'DISPATCH_ACKNOWLEDGED' : 'WORKER_RESPONSE_INVALID' : 'HTTP_FAILED';
      state.blocked = state.result === 'AUTH_BLOCKED';
    } catch { state.result = timedOut ? 'HTTP_TIMEOUT' : 'NETWORK_FAILED'; }
    finally { unschedule(timer); }
    try { await store.write(state); } catch { return result('STATE_WRITE_FAILED'); }
    retain = false;
    return result(state.result, state.result === 'DISPATCH_ACKNOWLEDGED');
  };
  try {
    const locked = await store.lock();
    if (locked !== 'ACQUIRED') {
      const known = new Set(['UNSUPPORTED_HOST', 'PRIVATE_DIRECTORY_REQUIRED', 'LOCK_UNSAFE', 'LOCKED', 'LOCK_UNAVAILABLE']);
      return result(known.has(locked) ? locked : 'LOCK_UNAVAILABLE', locked === 'LOCKED');
    }
    acquired = true;
    outcome = await invoke();
  } catch { outcome = result('STORAGE_UNAVAILABLE'); }
  finally {
    if (acquired) {
      try { if (retain) await store.retainLock(); else await store.unlock(); }
      catch { outcome = result('LOCK_RELEASE_FAILED'); }
    }
  }
  return outcome;
}

export async function main({ args = [], env = {}, write = text => process.stdout.write(text), dependencies = {} } = {}) {
  const outcome = args.length ? result('INVALID_ARGUMENTS') : await runMailRunner(env, dependencies);
  write(JSON.stringify(outcome) + '\n');
  return outcome.ok ? 0 : 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await main({ args: process.argv.slice(2), env: process.env });
}
