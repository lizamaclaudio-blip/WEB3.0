import assert from 'node:assert/strict';
import { test } from 'node:test';
import { constants } from 'node:fs';
import { join, resolve } from 'node:path';
import { createFileStore, main, MAIL_DISPATCH_URL, RUNNER_COOLDOWN_MS, RUNNER_TIMEOUT_MS, runMailRunner } from '../../scripts/web45-mail-runner.mjs';

const directory = resolve('synthetic-private-mail-state');
const env = {
  VECTOR_MAIL_RUNNER_ENABLED: 'true', VECTOR_MAIL_RUNNER_STATE_DIR: directory,
  VECTOR_MAIL_WORKER_SECRET: 'qa-only-worker-secret-not-a-credential-0001',
  VECTOR_MAIL_RUNNER_VERCEL_BYPASS: 'qa-only-preview-bypass-not-a-credential-0002',
};
const idle = () => ({ version: 1, lastAttemptAt: null, blocked: false, result: 'IDLE' });
const acknowledgement = { ok: true, enabled: true, claimed: 0, sent: 0, retry: 0, unknown: 0, failed: 0, suppressed: 0 };
const workerResponse = (overrides = {}) => new Response(JSON.stringify({ ...acknowledgement, ...overrides }), { status: 200, headers: { 'Content-Type': 'application/json' } });
function fixture(state = idle()) {
  let locked = false;
  let current = structuredClone(state);
  let time = 1_000_000;
  const writes = [], calls = [], timers = [];
  const store = {
    async lock() { if (locked) return 'LOCKED'; locked = true; return 'ACQUIRED'; },
    async read() { return structuredClone(current); },
    async write(value) { writes.push(structuredClone(value)); current = structuredClone(value); },
    async unlock() { locked = false; },
    async retainLock() { /* Deliberately keeps the exclusive lock. */ },
  };
  const dependencies = {
    store, now: () => time,
    fetch: async (url, options) => { calls.push({ url, options }); return workerResponse(); },
    setTimeout: (callback, ms) => { const timer = { callback, ms, cleared: false }; timers.push(timer); return timer; },
    clearTimeout: timer => { timer.cleared = true; },
  };
  return { store, dependencies, writes, calls, timers, get state() { return current; },
    get locked() { return locked; }, advance: ms => { time += ms; } };
}

test('runner is disabled by default and imports make no network or storage calls', async () => {
  const fail = () => { throw new Error('Must not be called'); };
  assert.deepEqual(await runMailRunner({}, { store: { lock: fail }, fetch: fail }), { ok: true, code: 'DISABLED' });
  assert.equal((await runMailRunner({ ...env, VECTOR_MAIL_RUNNER_ENABLED: 'TRUE' }, { fetch: fail })).code, 'DISABLED');
});

test('enabled runner requires both credentials and an absolute state directory, with no secret output', async () => {
  for (const override of [
    { VECTOR_MAIL_WORKER_SECRET: '' }, { VECTOR_MAIL_WORKER_SECRET: 'short' },
    { VECTOR_MAIL_WORKER_SECRET: env.VECTOR_MAIL_WORKER_SECRET + '\r\nInjected: yes' },
    { VECTOR_MAIL_RUNNER_VERCEL_BYPASS: '' }, { VECTOR_MAIL_RUNNER_VERCEL_BYPASS: ' '.repeat(32) },
    { VECTOR_MAIL_RUNNER_STATE_DIR: 'relative' }, { VECTOR_MAIL_RUNNER_STATE_DIR: directory + '\0' },
  ]) {
    const f = fixture();
    assert.deepEqual(await runMailRunner({ ...env, ...override }, f.dependencies), { ok: false, code: 'INVALID_CONFIGURATION' });
    assert.equal(f.calls.length, 0); assert.equal(f.locked, false);
  }
});

test('disabled TLS verification rejects configuration before storage or HTTP', async () => {
  const f = fixture();
  const response = await runMailRunner({ ...env, NODE_TLS_REJECT_UNAUTHORIZED: '0' }, f.dependencies);
  assert.deepEqual(response, { ok: false, code: 'INVALID_CONFIGURATION' });
  assert.equal(f.calls.length, 0); assert.equal(f.writes.length, 0); assert.equal(f.locked, false);
  assert.equal(JSON.stringify(response).includes(env.VECTOR_MAIL_WORKER_SECRET), false);
  assert.equal(JSON.stringify(response).includes(env.VECTOR_MAIL_RUNNER_VERCEL_BYPASS), false);
});

test('one invocation uses only the fixed Preview POST, rejects redirects and stores no credentials', async () => {
  const f = fixture();
  const actual = await runMailRunner({ ...env, VECTOR_MAIL_RUNNER_URL: 'https://attacker.example/' }, f.dependencies);
  assert.deepEqual(actual, { ok: true, code: 'DISPATCH_ACKNOWLEDGED' });
  assert.equal(f.calls.length, 1);
  const { url, options } = f.calls[0];
  assert.equal(url, MAIL_DISPATCH_URL);
  assert.equal(new URL(url).protocol, 'https:');
  assert.equal(options.method, 'POST'); assert.equal(options.body, '{}');
  assert.equal(options.redirect, 'error'); assert.equal(options.credentials, 'omit'); assert.equal(options.cache, 'no-store');
  assert.equal(options.headers.Authorization, `Bearer ${env.VECTOR_MAIL_WORKER_SECRET}`);
  assert.equal(options.headers['x-vercel-protection-bypass'], env.VECTOR_MAIL_RUNNER_VERCEL_BYPASS);
  assert.equal(f.writes[0].result, 'IN_FLIGHT'); assert.equal(f.writes[1].result, 'DISPATCH_ACKNOWLEDGED');
  for (const secret of [env.VECTOR_MAIL_WORKER_SECRET, env.VECTOR_MAIL_RUNNER_VERCEL_BYPASS]) {
    assert.equal(JSON.stringify([actual, f.writes]).includes(secret), false);
  }
  assert.equal(f.timers[0].ms, 55_000); assert.equal(RUNNER_TIMEOUT_MS, 55_000);
  assert.equal(f.timers[0].cleared, true); assert.equal(f.locked, false);
});

test('acknowledgement is streamed within bounds without unbounded body or diagnostic methods', async () => {
  const f = fixture();
  f.dependencies.fetch = async () => {
    const response = workerResponse({ claimed: 4, sent: 1, retry: 1, unknown: 1, failed: 1 });
    response.json = async () => { throw new Error('Unbounded JSON parsing must not be used'); };
    response.text = async () => { throw new Error('Unbounded text parsing must not be used'); };
    return response;
  };
  assert.equal((await runMailRunner(env, f.dependencies)).code, 'DISPATCH_ACKNOWLEDGED');
  assert.equal(f.state.result, 'DISPATCH_ACKNOWLEDGED');
});

test('HTTP 200 login HTML, oversized, malformed and inconsistent acknowledgements fail closed', async () => {
  for (const makeResponse of [
    () => new Response('<html>Vercel Authentication</html>', { headers: { 'Content-Type': 'text/html' } }),
    () => new Response('{', { headers: { 'Content-Type': 'application/json' } }),
    () => new Response('x'.repeat(2049), { headers: { 'Content-Type': 'application/json' } }),
    () => new Response('{}', { headers: { 'Content-Type': 'application/json', 'Content-Length': '2049' } }),
    () => new Response('{}', { headers: { 'Content-Type': 'application/json', 'Content-Length': 'bad' } }),
    () => new Response(new Uint8Array([0xff]), { headers: { 'Content-Type': 'application/json' } }),
    () => new Response('null', { headers: { 'Content-Type': 'application/json' } }),
    () => workerResponse({ enabled: false }), () => workerResponse({ ok: false }),
    () => workerResponse({ claimed: 5, sent: 5 }), () => workerResponse({ claimed: 1, sent: 0 }),
    () => workerResponse({ claimed: 0, retry: -1, sent: 1 }), () => workerResponse({ claimed: 1.5, sent: 1.5 }),
    () => workerResponse({ secret: env.VECTOR_MAIL_WORKER_SECRET }),
  ]) {
    const f = fixture(); let calls = 0;
    f.dependencies.fetch = async () => { calls++; return makeResponse(); };
    const response = await runMailRunner(env, f.dependencies);
    assert.deepEqual(response, { ok: false, code: 'WORKER_RESPONSE_INVALID' });
    assert.equal(f.state.result, 'WORKER_RESPONSE_INVALID'); assert.equal(calls, 1);
    assert.equal((await runMailRunner(env, f.dependencies)).code, 'COOLDOWN');
    assert.equal(JSON.stringify([response, f.writes]).includes(env.VECTOR_MAIL_WORKER_SECRET), false);
  }
});

test('durable cooldown is reserved before HTTP, survives a new process and expires at 120 seconds', async () => {
  const f = fixture();
  f.dependencies.fetch = async () => { assert.equal(f.state.result, 'IN_FLIGHT'); return { status: 503 }; };
  assert.equal((await runMailRunner(env, f.dependencies)).code, 'HTTP_FAILED');
  f.advance(RUNNER_COOLDOWN_MS - 1);
  assert.equal((await runMailRunner(env, { ...f.dependencies })).code, 'COOLDOWN');
  assert.equal(f.writes.length, 2);
  f.advance(1);
  assert.equal((await runMailRunner(env, { ...f.dependencies })).code, 'HTTP_FAILED');
  assert.equal(f.writes.length, 4);
});

test('exclusive lock prevents overlapping invocations and an existing lock is never stolen', async () => {
  const f = fixture();
  let release;
  let started;
  const entered = new Promise(resolve => { started = resolve; });
  f.dependencies.fetch = async () => { started(); return new Promise(resolve => { release = resolve; }); };
  const first = runMailRunner(env, f.dependencies);
  await entered;
  assert.deepEqual(await runMailRunner(env, f.dependencies), { ok: true, code: 'LOCKED' });
  assert.equal(f.writes.length, 1);
  release(workerResponse());
  assert.equal((await first).code, 'DISPATCH_ACKNOWLEDGED');
  assert.equal(f.locked, false);
});

test('401 and 403 latch AUTH_BLOCKED across future runs until manual operator recovery', async () => {
  for (const status of [401, 403]) {
    const f = fixture(); let calls = 0;
    f.dependencies.fetch = async () => { calls++; return { status }; };
    assert.equal((await runMailRunner(env, f.dependencies)).code, 'AUTH_BLOCKED');
    f.advance(86_400_000);
    assert.equal((await runMailRunner(env, f.dependencies)).code, 'AUTH_BLOCKED');
    assert.equal(f.state.blocked, true); assert.equal(calls, 1); assert.equal(f.writes.length, 2);
  }
});

test('network errors, redirects and HTTP failures have no immediate retries or raw diagnostics', async () => {
  for (const failure of [async () => { throw new Error(env.VECTOR_MAIL_WORKER_SECRET); },
    async () => { throw new TypeError('fetch failed: redirect ' + env.VECTOR_MAIL_RUNNER_VERCEL_BYPASS); },
    async () => ({ status: 302 }), async () => ({ status: 429 }), async () => ({ status: 503 })]) {
    const f = fixture(); let calls = 0;
    f.dependencies.fetch = async () => { calls++; return failure(); };
    const response = await runMailRunner(env, f.dependencies);
    assert.ok(['NETWORK_FAILED', 'HTTP_FAILED'].includes(response.code));
    assert.equal(calls, 1); assert.equal(f.locked, false);
    assert.equal((await runMailRunner(env, f.dependencies)).code, 'COOLDOWN');
    assert.equal(calls, 1);
    assert.equal(JSON.stringify([response, f.writes]).includes(env.VECTOR_MAIL_WORKER_SECRET), false);
    assert.equal(JSON.stringify([response, f.writes]).includes(env.VECTOR_MAIL_RUNNER_VERCEL_BYPASS), false);
  }
});

test('55-second deadline aborts the only request and persists a sanitized timeout', async () => {
  const f = fixture();
  f.dependencies.fetch = async (_url, options) => {
    assert.equal(options.signal.aborted, false);
    f.timers[0].callback();
    assert.equal(options.signal.aborted, true);
    throw new Error(env.VECTOR_MAIL_RUNNER_VERCEL_BYPASS);
  };
  assert.deepEqual(await runMailRunner(env, f.dependencies), { ok: false, code: 'HTTP_TIMEOUT' });
  assert.equal(f.state.result, 'HTTP_TIMEOUT'); assert.equal(f.timers[0].cleared, true);
});

test('late responses after an abort are still classified as timeout', async () => {
  const f = fixture();
  f.dependencies.fetch = async () => { f.timers[0].callback(); return workerResponse(); };
  assert.equal((await runMailRunner(env, f.dependencies)).code, 'HTTP_TIMEOUT');
});

test('late 401 and 403 responses still latch authentication failure after timeout', async () => {
  for (const status of [401, 403]) {
    const f = fixture(); let calls = 0;
    f.dependencies.fetch = async () => { calls++; f.timers[0].callback(); return { status }; };
    assert.deepEqual(await runMailRunner(env, f.dependencies), { ok: false, code: 'AUTH_BLOCKED' });
    assert.equal(f.state.blocked, true); assert.equal(f.state.result, 'AUTH_BLOCKED');
    f.advance(86_400_000);
    assert.equal((await runMailRunner(env, f.dependencies)).code, 'AUTH_BLOCKED');
    assert.equal(calls, 1);
  }
});

test('deadline covers response-body reading as well as connecting', async () => {
  const f = fixture();
  f.dependencies.fetch = async (_url, options) => {
    const body = new ReadableStream({ start(controller) {
      options.signal.addEventListener('abort', () => controller.error(new Error(env.VECTOR_MAIL_WORKER_SECRET)), { once: true });
      f.timers[0].callback();
    } });
    return new Response(body, { headers: { 'Content-Type': 'application/json' } });
  };
  assert.equal((await runMailRunner(env, f.dependencies)).code, 'HTTP_TIMEOUT');
  assert.equal(f.timers[0].cleared, true);
});

test('malformed, unexpected or credential-bearing state fails closed', async () => {
  for (const state of [null, [], {}, { ...idle(), version: 2 }, { ...idle(), secret: env.VECTOR_MAIL_WORKER_SECRET },
    { ...idle(), lastAttemptAt: -1 }, { ...idle(), blocked: true }, { ...idle(), result: 'unknown' },
    { ...idle(), result: 'IN_FLIGHT' }]) {
    const f = fixture(state);
    assert.equal((await runMailRunner(env, f.dependencies)).code, 'STATE_INVALID');
    assert.equal(f.calls.length, 0); assert.equal(f.writes.length, 0);
  }
});

test('clock rollback and invalid clocks fail closed without resetting cooldown', async () => {
  for (const value of [-1, NaN, Infinity, 1.5, 9_999]) {
    const f = fixture({ version: 1, lastAttemptAt: 10_000, blocked: false, result: 'IN_FLIGHT' });
    f.dependencies.now = () => value;
    assert.equal((await runMailRunner(env, f.dependencies)).code, 'CLOCK_INVALID');
    assert.equal(f.calls.length, 0); assert.equal(f.writes.length, 0);
  }
});

test('pre-request persistence failure sends nothing and retains lock for manual recovery', async () => {
  const f = fixture();
  f.store.write = async () => { throw new Error('Disk full ' + env.VECTOR_MAIL_WORKER_SECRET); };
  assert.equal((await runMailRunner(env, f.dependencies)).code, 'STATE_WRITE_FAILED');
  assert.equal(f.calls.length, 0); assert.equal(f.locked, true);
  f.advance(86_400_000);
  assert.equal((await runMailRunner(env, f.dependencies)).code, 'LOCKED');
});

test('post-request persistence failure keeps IN_FLIGHT and a crash lock instead of replaying', async () => {
  const f = fixture(); const write = f.store.write;
  let writes = 0;
  f.store.write = async value => { if (++writes > 1) throw new Error('Disk full'); await write(value); };
  assert.equal((await runMailRunner(env, f.dependencies)).code, 'STATE_WRITE_FAILED');
  assert.equal(f.calls.length, 1); assert.equal(f.state.result, 'IN_FLIGHT'); assert.equal(f.locked, true);
  f.advance(86_400_000);
  assert.equal((await runMailRunner(env, f.dependencies)).code, 'LOCKED');
  assert.equal(f.calls.length, 1);
});

test('lock cleanup failure is reported even for early safe-return paths', async () => {
  const f = fixture();
  f.store.unlock = async () => { throw new Error('Filesystem failed'); };
  f.store.read = async () => ({ invalid: true });
  assert.equal((await runMailRunner(env, f.dependencies)).code, 'LOCK_RELEASE_FAILED');
  assert.equal(f.calls.length, 0);
});

test('CLI accepts no arguments and prints only fixed JSON codes', async () => {
  let printed = '';
  assert.equal(await main({ args: [env.VECTOR_MAIL_WORKER_SECRET], write: text => { printed += text; } }), 1);
  assert.equal(printed, '{"ok":false,"code":"INVALID_ARGUMENTS"}\n');
  const f = fixture(); f.dependencies.fetch = async () => { throw new Error(env.VECTOR_MAIL_RUNNER_VERCEL_BYPASS); };
  printed = '';
  assert.equal(await main({ env, dependencies: f.dependencies, write: text => { printed += text; } }), 1);
  assert.equal(printed, '{"ok":false,"code":"NETWORK_FAILED"}\n');
});

// In-memory filesystem exercises the real atomic file adapter on Windows too;
// these fixtures create no host files and perform no HTTP requests.
const posixConstants = { ...constants, O_NOFOLLOW: 0x20000, O_DIRECTORY: 0x10000 };
function memoryFs() {
  let inode = 1;
  const entries = new Map(); const operations = [];
  const missing = code => Object.assign(new Error('Synthetic filesystem error'), { code });
  const make = (type, mode, content = '') => ({ type, mode, content, uid: 1000, nlink: 1, dev: 1, ino: inode++ });
  const stat = entry => ({ ...entry, size: Buffer.byteLength(entry.content),
    isFile: () => entry.type === 'file', isDirectory: () => entry.type === 'directory', isSymbolicLink: () => entry.type === 'symlink' });
  entries.set(directory, make('directory', 0o700));
  const fs = {
    async lstat(path) { if (!entries.has(path)) throw missing('ENOENT'); return stat(entries.get(path)); },
    async open(path, flags, mode) {
      operations.push({ operation: 'open', path, flags, mode });
      let entry = entries.get(path);
      if (entry && flags & posixConstants.O_EXCL) throw missing('EEXIST');
      if (entry?.type === 'symlink' && flags & posixConstants.O_NOFOLLOW) throw missing('ELOOP');
      if (!entry) {
        if (!(flags & posixConstants.O_CREAT)) throw missing('ENOENT');
        entry = make('file', mode); entries.set(path, entry);
      }
      return {
        async stat() { return stat(entry); },
        async readFile() { return entry.content; },
        async writeFile(content) { entry.content = content; },
        async sync() { operations.push({ operation: 'sync', path }); },
        async close() { operations.push({ operation: 'close', path }); },
      };
    },
    async rename(from, to) { operations.push({ operation: 'rename', from, to }); entries.set(to, entries.get(from)); entries.delete(from); },
    async unlink(path) { operations.push({ operation: 'unlink', path }); if (!entries.delete(path)) throw missing('ENOENT'); },
  };
  return { fs, entries, operations, make,
    store: () => createFileStore(directory, { fs, platform: 'linux', uid: 1000, fileConstants: posixConstants }) };
}

test('file adapter requires a private owned Linux directory and never creates one', async () => {
  for (const change of [f => f.entries.delete(directory), f => { f.entries.get(directory).mode = 0o755; },
    f => { f.entries.get(directory).uid = 2000; }, f => { f.entries.get(directory).type = 'symlink'; }]) {
    const f = memoryFs(); change(f);
    assert.equal(await f.store().lock(), 'PRIVATE_DIRECTORY_REQUIRED');
    assert.equal(f.operations.length, 0);
  }
  const f = memoryFs();
  assert.equal(await createFileStore(directory, { fs: f.fs, platform: 'win32', uid: 1000 }).lock(), 'UNSUPPORTED_HOST');
  assert.equal(f.operations.length, 0);
});

test('file adapter uses exclusive no-follow locks and never steals existing crash locks', async () => {
  const f = memoryFs(); const first = f.store();
  assert.equal(await first.lock(), 'ACQUIRED');
  const open = f.operations[0];
  assert.equal(open.mode, 0o600);
  assert.ok(open.flags & posixConstants.O_CREAT); assert.ok(open.flags & posixConstants.O_EXCL); assert.ok(open.flags & posixConstants.O_NOFOLLOW);
  assert.equal(await f.store().lock(), 'LOCKED');
  await first.retainLock();
  assert.equal(await f.store().lock(), 'LOCKED');
  assert.ok(f.entries.has(join(directory, 'mail-runner.lock')));
});

test('file adapter persists atomic fsynced private state and removes only its own lock', async () => {
  const f = memoryFs(); const store = f.store();
  assert.equal(await store.lock(), 'ACQUIRED');
  assert.deepEqual(await store.read(), idle());
  const state = { version: 1, lastAttemptAt: 42, blocked: false, result: 'IN_FLIGHT' };
  await store.write(state);
  assert.deepEqual(await store.read(), state);
  const pending = join(directory, 'mail-runner-state.pending');
  const persisted = join(directory, 'mail-runner-state.json');
  assert.equal(f.entries.get(persisted).mode, 0o600); assert.equal(f.entries.has(pending), false);
  const rename = f.operations.findIndex(operation => operation.operation === 'rename');
  assert.ok(f.operations.slice(0, rename).some(operation => operation.operation === 'sync' && operation.path === pending));
  assert.ok(f.operations.slice(rename + 1).some(operation => operation.operation === 'sync' && operation.path === directory));
  await store.unlock();
  assert.equal(f.entries.has(join(directory, 'mail-runner.lock')), false);
});

test('file adapter rejects malformed, overlarge, public, hardlinked or symlinked state', async () => {
  for (const change of [entry => { entry.content = '{'; }, entry => { entry.content = 'x'.repeat(1025); },
    entry => { entry.mode = 0o644; }, entry => { entry.uid = 2000; }, entry => { entry.nlink = 2; },
    entry => { entry.type = 'symlink'; }]) {
    const f = memoryFs(); const entry = f.make('file', 0o600, JSON.stringify(idle())); change(entry);
    f.entries.set(join(directory, 'mail-runner-state.json'), entry);
    await assert.rejects(f.store().read(), { message: 'Invalid state' });
  }
});

test('orphan pending state and changed lock identity fail closed without deleting files', async () => {
  const f = memoryFs(); const store = f.store(); await store.lock();
  f.entries.set(join(directory, 'mail-runner-state.pending'), f.make('file', 0o600, 'orphan'));
  await assert.rejects(store.write(idle()));
  assert.equal(f.entries.get(join(directory, 'mail-runner-state.pending')).content, 'orphan');
  f.entries.set(join(directory, 'mail-runner.lock'), f.make('file', 0o600, 'different owner invocation'));
  await assert.rejects(store.unlock(), { message: 'Lock changed' });
  assert.ok(f.entries.has(join(directory, 'mail-runner.lock')));
});

test('real file adapter plus fake network retains the cooldown across newly constructed stores', async () => {
  const f = memoryFs(); const requestCalls = [];
  const dependencies = { store: f.store(), now: () => 200_000, fetch: async (...args) => { requestCalls.push(args); return workerResponse(); } };
  assert.equal((await runMailRunner(env, dependencies)).code, 'DISPATCH_ACKNOWLEDGED');
  assert.equal((await runMailRunner(env, { ...dependencies, store: f.store() })).code, 'COOLDOWN');
  assert.equal(requestCalls.length, 1);
});
