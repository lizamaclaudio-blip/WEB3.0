import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const dataModule = source => 'data:text/javascript;base64,' + Buffer.from(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText).toString('base64');
async function loadModule(path, replacements = {}) {
  let source = await readFile(new URL(path, import.meta.url), 'utf8');
  for (const [reference, replacement] of Object.entries(replacements)) source = source.replaceAll(`"${reference}"`, `"${replacement}"`);
  return dataModule(source);
}
const inquiryModule = await loadModule('../../src/lib/web4/inquiry.ts');
const storageModule = await loadModule('../../src/lib/web4/inquiry-storage.ts', { './inquiry': inquiryModule });
const httpModule = await loadModule('../../src/lib/web4/inquiry-http.ts');
const newsletterModule = await loadModule('../../src/lib/web4/newsletter.ts', { './inquiry-storage': storageModule });
const mailModule = await loadModule('../../src/lib/web4/mail.ts', { './inquiry': inquiryModule });
const templatesModule = await loadModule('../../src/lib/web4/mail-templates.ts');
const nodemailerStub = dataModule('export default { createTransport(options) { return globalThis.__vectorSmtpTest(options); } };');
const smtpModule = await loadModule('../../src/lib/web4/mail-smtp.ts', { nodemailer: nodemailerStub });
const dispatchModule = await loadModule('../../src/lib/web4/mail-dispatch.ts', {
  './inquiry-storage': storageModule, './newsletter': newsletterModule, './mail': mailModule,
  './mail-templates': templatesModule, './mail-smtp': smtpModule,
});
const afterStub = dataModule('export function after(callback) { (globalThis.__vectorAfterCallbacks ||= []).push(callback); }');
const dispatchStub = dataModule('export async function dispatchMail() { return globalThis.__vectorDispatchTest(); }');
const mailAfterModule = await loadModule('../../src/lib/web4/mail-after.ts', {
  'next/server':afterStub, './mail':mailModule, './mail-dispatch':dispatchStub,
});
const confirmModule = await loadModule('../../src/app/api/vector/newsletter/confirm/route.ts', {
  '@/lib/web4/inquiry': inquiryModule, '@/lib/web4/inquiry-storage': storageModule,
  '@/lib/web4/inquiry-http': httpModule, '@/lib/web4/newsletter': newsletterModule,
  '@/lib/web4/mail-after': mailAfterModule,
});
const workerModule = await loadModule('../../src/app/api/vector/mail/dispatch/route.ts', {
  '@/lib/web4/mail-dispatch': dispatchModule, '@/lib/web4/mail': mailModule, '@/lib/web4/inquiry-http': httpModule,
});
const { mailConfiguration, mailRecipientAllowed, mailActionToken, mailActionLink, mailWorkerAuthorized } = await import(mailModule);
const { renderMail } = await import(templatesModule);
const { smtpFailure, sendSmtp } = await import(smtpModule);
const { dispatchMail } = await import(dispatchModule);
const { POST: confirm } = await import(confirmModule);
const { POST: worker } = await import(workerModule);
const { hashUnsubscribeToken } = await import(newsletterModule);
const env = {
  VECTOR_FORMS_ENABLED: 'true', SUPABASE_URL: 'https://storage.example.test', SUPABASE_SECRET_KEY: 'sb_secret_test-key',
  VECTOR_FORM_HASH_SECRET: 'forms-test-only-hmac-secret-32-characters',
  VECTOR_MAIL_ENABLED: 'true', VECTOR_SMTP_HOST: 'smtp.mail-provider.com', VECTOR_SMTP_PORT: '587',
  VECTOR_SMTP_USER: 'mail-user', VECTOR_SMTP_PASSWORD: 'test-only-no-real-password',
  VECTOR_MAIL_FROM: 'sender@mail-provider.com', VECTOR_MAIL_INTERNAL_TO: 'team@mail-provider.com',
  VECTOR_MAIL_PUBLIC_ORIGIN: 'https://preview.site-provider.com',
  VECTOR_MAIL_TOKEN_SECRET: 'mail-test-only-token-secret-32-characters',
  VECTOR_MAIL_WORKER_SECRET: 'mail-test-only-worker-secret-32-characters',
  VECTOR_MAIL_PREVIEW_RECIPIENTS: 'approved@mail-provider.com,team@mail-provider.com',
  VERCEL_ENV: 'preview',
};
const configuration = mailConfiguration(env);
const job = {
  id: '3f343ebc-cc5b-4359-97e3-2b8bfe6f40a9', kind: 'contact_receipt', locale: 'es', email: 'approved@mail-provider.com',
  email_hash: 'a'.repeat(64), name: '<script>Test</script>', message: 'A real test question <img src=x onerror=bad()>',
  created_at: new Date().toISOString(), first_attempt_at: new Date().toISOString(), attempts: 1,
};
const request = (body, extra = {}) => new Request('https://preview.site-provider.com/api/vector/newsletter/confirm', {
  method: 'POST', headers: { origin: 'https://preview.site-provider.com', 'content-type': 'application/json', ...extra },
  body: typeof body === 'string' ? body : JSON.stringify(body),
});

test('mail remains disabled without complete secure SMTP configuration; Preview always requires allowlist', () => {
  assert.equal(mailConfiguration({}), null);
  assert.ok(configuration);
  for (const key of ['VECTOR_MAIL_ENABLED', 'VECTOR_SMTP_HOST', 'VECTOR_SMTP_PORT', 'VECTOR_SMTP_USER', 'VECTOR_SMTP_PASSWORD', 'VECTOR_MAIL_FROM', 'VECTOR_MAIL_INTERNAL_TO', 'VECTOR_MAIL_PUBLIC_ORIGIN', 'VECTOR_MAIL_TOKEN_SECRET', 'VECTOR_MAIL_WORKER_SECRET', 'VECTOR_MAIL_PREVIEW_RECIPIENTS']) assert.equal(mailConfiguration({ ...env, [key]: '' }), null, key);
  for (const change of [
    { VECTOR_SMTP_PORT: '25' }, { VECTOR_SMTP_HOST: 'localhost' }, { VECTOR_SMTP_HOST: '127.0.0.1' },
    { VECTOR_MAIL_FROM: 'sender@example.test' }, { VECTOR_MAIL_INTERNAL_TO: 'a\r\nb@provider.com' },
    { VECTOR_MAIL_PUBLIC_ORIGIN: 'http://preview.site-provider.com' }, { VECTOR_MAIL_PUBLIC_ORIGIN: 'https://evil:secret@preview.site-provider.com' },
    { VECTOR_MAIL_PUBLIC_ORIGIN: 'https://preview.site-provider.com/path' }, { VECTOR_MAIL_PUBLIC_ORIGIN: 'https://preview.site-provider.com/?token=1' },
    { VECTOR_MAIL_TOKEN_SECRET: env.VECTOR_MAIL_WORKER_SECRET },
    { VECTOR_MAIL_PREVIEW_RECIPIENTS: 'test@example.org' },
  ]) assert.equal(mailConfiguration({ ...env, ...change }), null);
  assert.equal(mailConfiguration({ ...env, VECTOR_MAIL_MODE: 'public', VECTOR_MAIL_PREVIEW_RECIPIENTS: '' }), null);
  assert.equal(mailRecipientAllowed('approved@mail-provider.com', configuration), true);
  assert.equal(mailRecipientAllowed('stranger@mail-provider.com', configuration), false);
  for (const address of ['person@example.com', 'person@qa.example.org', 'person@a.test', 'person@a.invalid', 'person@localhost']) assert.equal(mailRecipientAllowed(address, { ...configuration, preview: false }), false);
  assert.equal(mailWorkerAuthorized(new Request('https://site.com', { headers: { authorization: `Bearer ${env.VECTOR_MAIL_WORKER_SECRET}` } }), env.VECTOR_MAIL_WORKER_SECRET), true);
  assert.equal(mailWorkerAuthorized(new Request('https://site.com'), env.VECTOR_MAIL_WORKER_SECRET), false);
});

test('ES/EN/FR templates escape messages and use deterministic private fragment action links', () => {
  for (const locale of ['es', 'en', 'fr']) for (const kind of ['contact_receipt', 'internal_contact', 'newsletter_confirm', 'newsletter_welcome']) {
    const fixture = { ...job, kind, locale };
    const link = mailActionLink(fixture, configuration);
    const token = mailActionToken(fixture, configuration.tokenSecret);
    const message = renderMail(fixture, configuration, kind.startsWith('newsletter_') ? link.url : undefined);
    assert.ok(message.subject.length > 10); assert.match(message.html, new RegExp(`<html lang="${locale}">`));
    assert.match(message.html, /COPILOTO VECTOR COMPLETE/); assert.equal(message.html.includes('<script>Test</script>'), false);
    assert.equal(message.html.includes('<img src=x'), false); assert.ok(message.text.includes('COPILOTO VECTOR COMPLETE'));
    assert.equal(message.to, kind === 'internal_contact' ? configuration.internalTo : fixture.email);
    assert.equal(message.replyTo, kind === 'internal_contact' ? fixture.email : undefined);
    assert.equal(message.messageId, renderMail(fixture, configuration, kind.startsWith('newsletter_') ? link.url : undefined).messageId);
    assert.equal(new URL(link.url).search, ''); assert.equal(new URL(link.url).hash, `#token=${token}`);
    assert.equal(mailActionToken(fixture, configuration.tokenSecret), token);
    assert.notEqual(mailActionToken({ ...fixture, id: 'different' }, configuration.tokenSecret), token);
    if (kind.startsWith('newsletter_')) assert.ok(message.text.includes(link.url));
    if (kind === 'newsletter_confirm') assert.equal(Date.parse(link.expiresAt) - Date.parse(fixture.first_attempt_at), 86400000);
    if (kind === 'newsletter_welcome') assert.equal(Date.parse(link.expiresAt) - Date.parse(fixture.first_attempt_at), 30 * 86400000);
  }
  assert.throws(() => renderMail({ ...job, kind: 'newsletter_confirm' }, configuration));
});

test('SMTP requires verified TLS, restricts envelope to one recipient and does not expose error contents', async () => {
  let closed = false;
  globalThis.__vectorSmtpTest = options => {
    assert.equal(options.secure, false); assert.equal(options.requireTLS, true); assert.equal(options.tls.rejectUnauthorized, true);
    assert.equal(options.tls.minVersion, 'TLSv1.2'); assert.equal(options.logger, false); assert.equal(options.debug, false);
    assert.equal(options.disableFileAccess, true); assert.equal(options.disableUrlAccess, true); assert.ok(options.socketTimeout <= 12000);
    return { sendMail: async message => {
      assert.deepEqual(message.envelope, { from: configuration.from, to: [job.email] });
      assert.equal(message.disableUrlAccess, true); assert.equal(message.disableFileAccess, true);
      return { accepted: [job.email], rejected: [] };
    }, close() { closed = true; } };
  };
  try {
    const result = await sendSmtp(renderMail(job, configuration), configuration);
    assert.equal(result.result, 'sent'); assert.equal(closed, true);
    for (const [failure, outcome] of [
      [{ code: 'ETIMEDOUT', command: 'DATA', message: 'private-email secret' }, 'delivery_unknown'],
      [{ code: 'ESOCKET', command: 'DATA' }, 'delivery_unknown'],
      [{ code: 'ETIMEDOUT', command: 'CONN' }, 'retry'],
      [{ code: 'EDNS', command: 'CONN' }, 'retry'],
      [{ code: 'EAUTH', command: 'AUTH' }, 'failed'],
      [{ responseCode: 450, command: 'DATA' }, 'retry'],
      [{ responseCode: 550, command: 'DATA' }, 'failed'],
      [{ message: 'unknown private message' }, 'delivery_unknown'],
    ]) {
      const safe = smtpFailure(failure); assert.equal(safe.result, outcome);
      assert.equal(JSON.stringify(safe).includes('private'), false); assert.equal(JSON.stringify(safe).includes('secret'), false);
    }
  } finally { delete globalThis.__vectorSmtpTest; }
});

test('durable dispatcher records sending boundary, keeps retries stable and suppresses QA/unapproved delivery', async () => {
  assert.deepEqual(await dispatchMail({}, { rpc: async () => { throw new Error('Must not claim'); }, send: async () => { throw new Error('Must not send'); } }), { enabled: false, claimed: 0, sent: 0, retry: 0, unknown: 0, failed: 0, suppressed: 0 });
  const deliveries = []; const finishes = []; const tokens = []; const sequence = [];
  let claimed = false;
  const rpc = async (name, parameters) => {
    sequence.push(name);
    if (name === 'vector_claim_mail') {
      assert.equal(parameters.p_limit, 4);
      if (claimed) return []; claimed = true;
      return [job, { ...job, id: '4f343ebc-cc5b-4359-97e3-2b8bfe6f40a9', kind: 'newsletter_confirm' }, { ...job, id: '5f343ebc-cc5b-4359-97e3-2b8bfe6f40a9', email: 'qa@example.test', kind: 'internal_contact' }, { ...job, id: '6f343ebc-cc5b-4359-97e3-2b8bfe6f40a9', email: 'stranger@mail-provider.com', kind: 'internal_contact' }];
    }
    if (name === 'vector_register_mail_token') { tokens.push(parameters); return 'registered'; }
    if (name === 'vector_start_mail') return 'sending';
    if (name === 'vector_finish_mail') { finishes.push(parameters); return 'recorded'; }
    throw new Error('Unexpected RPC');
  };
  const send = async message => { assert.equal(sequence.at(-1), 'vector_start_mail'); deliveries.push(message); return { result: 'sent', providerId: message.messageId, errorCode: null }; };
  const summary = await dispatchMail(env, { rpc, send });
  assert.equal(summary.sent, 2); assert.equal(summary.suppressed, 2); assert.equal(deliveries.length, 2);
  assert.equal(tokens.length, 1); const raw = new URL(deliveries[1].text.match(/https:\/\/[^\s]+/)[0]).hash.slice('#token='.length);
  assert.equal(tokens[0].p_token_hash, hashUnsubscribeToken(raw)); assert.equal(JSON.stringify(tokens).includes(raw), false);
  assert.equal(finishes.filter(finish => finish.p_result === 'sent').length, 2);
  const second = await dispatchMail(env, { rpc, send }); assert.equal(second.claimed, 0); assert.equal(deliveries.length, 2);
  const retryMessages = [];
  const one = async (name, parameters) => name === 'vector_claim_mail' ? [{ ...job, kind: 'newsletter_confirm' }] : name === 'vector_register_mail_token' ? 'registered' : name === 'vector_start_mail' ? 'sending' : (finishes.push(parameters), 'recorded');
  for (let count = 0; count < 2; count++) await dispatchMail(env, { rpc: one, send: async message => { retryMessages.push(message); return { result: 'retry', providerId: null, errorCode: 'SMTP_TEMPORARY_REJECTION' }; } });
  assert.deepEqual(retryMessages[0], retryMessages[1]);
});

test('SMTP ambiguity never retries automatically and finish failure cannot erase the stored request', async () => {
  const finishes = [];
  const rpc = async (name, parameters) => name === 'vector_claim_mail' ? [job] : name === 'vector_start_mail' ? 'sending' : (finishes.push(parameters), 'recorded');
  const summary = await dispatchMail(env, { rpc, send: async () => { throw new Error('Private SMTP response'); } });
  assert.equal(summary.unknown, 1); assert.equal(finishes[0].p_result, 'delivery_unknown');
  assert.equal(JSON.stringify(finishes).includes('Private'), false);
  await assert.rejects(dispatchMail(env, { rpc: async (name) => name === 'vector_claim_mail' ? [job] : name === 'vector_start_mail' ? 'sending' : Promise.reject(new Error('DB unavailable')), send: async () => ({ result: 'sent', providerId: 'trace', errorCode: null }) }));
});

test('confirmation is an explicit bounded same-origin POST, hashes tokens and reports verified DB results only', async () => {
  const saved = Object.fromEntries(Object.keys(env).map(key => [key, process.env[key]]));
  const originalFetch = globalThis.fetch;
  Object.assign(process.env, env);
  globalThis.__vectorAfterCallbacks=[];
  let deliveries=0;
  globalThis.__vectorDispatchTest=async()=>{deliveries++;};
  try {
    const token = 'A'.repeat(43); let payload;
    globalThis.fetch = async (url, options) => { assert.equal(new URL(url).pathname, '/rest/v1/rpc/vector_confirm_newsletter'); payload = JSON.parse(options.body); return Response.json('confirmed'); };
    assert.equal((await confirm(request({ token }, { origin: 'https://attacker.com' }))).status, 403);
    assert.equal((await confirm(request({ token: 'short' }))).status, 400);
    assert.equal((await confirm(request({ token }, { 'content-type': 'text/plain' }))).status, 415);
    assert.equal((await confirm(request(' '.repeat(1025)))).status, 413);
    const success = await confirm(request({ token })); assert.equal(success.status, 200); assert.equal((await success.json()).code, 'CONFIRMED');
    assert.equal(deliveries,0);assert.equal(globalThis.__vectorAfterCallbacks.length,1);
    await globalThis.__vectorAfterCallbacks.pop()();assert.equal(deliveries,1);
    assert.equal(payload.p_token_hash, hashUnsubscribeToken(token)); assert.equal(JSON.stringify(payload).includes(token), false);
    assert.equal(success.headers.get('referrer-policy'), 'no-referrer');
    for (const [result, status] of [['invalid_or_expired', 410], ['rate_limited', 429], ['unexpected', 503]]) { globalThis.fetch = async () => Response.json(result); assert.equal((await confirm(request({ token }))).status, status); }
    globalThis.fetch = async () => { throw new Error('Storage offline'); }; assert.equal((await confirm(request({ token }))).status, 503);
    assert.equal(globalThis.__vectorAfterCallbacks.length,0);
    assert.equal((await worker(new Request('https://site.com/api/vector/mail/dispatch', { method: 'POST' }))).status, 401);
  } finally {
    globalThis.fetch = originalFetch;
    delete globalThis.__vectorAfterCallbacks;delete globalThis.__vectorDispatchTest;
    for (const [key, value] of Object.entries(saved)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
  }
});
