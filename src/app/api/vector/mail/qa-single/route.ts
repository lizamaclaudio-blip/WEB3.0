import { randomUUID } from 'node:crypto';
import { mailConfiguration, mailRecipientAllowed, mailWorkerAuthorized } from "@/lib/web4/mail";
import { sendSmtp } from "@/lib/web4/mail-smtp";
import { renderQaMail } from "@/lib/web4/mail-templates";
import { communityResponse, communityRpc, failure } from "@/lib/web51/server";
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

// Disabled until the owner approves this exact single message. No submitted
// recipients/content, historical queue claims, subscriptions or automatic retry.
export async function POST(request: Request) {
  const env = process.env;
  if (!mailWorkerAuthorized(request, env.VECTOR_MAIL_WORKER_SECRET || '')) return failure('UNAUTHORIZED', 401);
  if (env.VECTOR_QA_SMTP_TEST_APPROVED !== 'true' || env.VECTOR_MAIL_ENABLED !== 'false'
    || env.VECTOR_HOSTING_PLATFORM !== 'cloudflare' || env.VECTOR_DEPLOYMENT_STAGE !== 'preview'
    || (request.headers.get('host') || new URL(request.url).host) !== 'patagonia-wings-web51-qa.lizamaclaudio.workers.dev') return failure('QA_TEST_NOT_APPROVED', 403);
  // A diagnostic request must never claim or send, even if approval is enabled.
  if (request.headers.get('x-vector-qa-check-only') === 'true') return failure('QA_CHECK_ONLY_NO_SEND', 409);
  const configuration = mailConfiguration({ ...env, VECTOR_MAIL_ENABLED: 'true' });
  const recipient = 'patagonia@patagoniaw.com';
  if (!configuration || configuration.user.toLowerCase() !== recipient || configuration.from.toLowerCase() !== recipient
    || !configuration.preview || !mailRecipientAllowed(recipient, configuration)) return failure('MAIL_NOT_CONFIGURED', 503);
  const worker = randomUUID();
  try {
    const claimed = await communityRpc('vector_community_qa_mail', { p_action: 'claim', p_worker: worker, p_result: null });
    if (claimed !== 'claimed') return failure('QA_ALREADY_ATTEMPTED', 409);
    const message = renderQaMail(configuration);
    const result = await sendSmtp(message, configuration);
    const status = result.result === 'sent' ? 'sent' : result.result === 'delivery_unknown' ? 'delivery_unknown' : 'failed';
    const saved = await communityRpc('vector_community_qa_mail', { p_action: 'finish', p_worker: worker, p_result: status });
    if (saved !== 'recorded') return failure('QA_RECEIPT_NOT_CONFIRMED', 503);
    return communityResponse({ ok: status === 'sent', code: status === 'sent' ? 'SMTP_ACCEPTED_INBOX_UNVERIFIED' : 'QA_DELIVERY_UNCONFIRMED' }, status === 'sent' ? 200 : 503);
  } catch { return failure('QA_DELIVERY_UNCONFIRMED', 503); }
}
