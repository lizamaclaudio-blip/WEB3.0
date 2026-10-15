import { randomUUID } from "node:crypto";
import { inquiryRpc, type InquiryEnvironment } from "./inquiry-storage";
import { hashUnsubscribeToken } from "./newsletter";
import { mailActionLink, mailActionToken, mailConfiguration, mailRecipientAllowed, reservedMailAddress, validMailJob, type MailConfiguration, type MailMessage, type MailResult } from "./mail";
import { renderMail } from "./mail-templates";
import { sendSmtp, SMTP_TIMEOUT_MS } from "./mail-smtp";

type Dependencies = { rpc: typeof inquiryRpc; send: (message: MailMessage, configuration: MailConfiguration) => Promise<MailResult>; now?: () => number };
export type MailDispatchSummary = { enabled: boolean; claimed: number; sent: number; retry: number; unknown: number; failed: number; suppressed: number };

const RPC_TIMEOUT_MS = 5000;
const DISPATCH_BUDGET_MS = 45000;
const MAX_JOBS = 4;
// Claim + optional token registration + start + finish, and one bounded SMTP
// transaction. Reserve the entire worst-case cost before consuming an attempt.
const JOB_BUDGET_MS = 4 * RPC_TIMEOUT_MS + SMTP_TIMEOUT_MS;

export async function dispatchMail(env: InquiryEnvironment = process.env, dependencies: Dependencies = { rpc: inquiryRpc, send: sendSmtp }): Promise<MailDispatchSummary> {
  const summary: MailDispatchSummary = { enabled: false, claimed: 0, sent: 0, retry: 0, unknown: 0, failed: 0, suppressed: 0 };
  const configuration = mailConfiguration(env);
  if (!configuration) return summary;
  summary.enabled = true;
  const now = dependencies.now ?? (() => performance.now());
  const deadline = now() + DISPATCH_BUDGET_MS;
  const worker = randomUUID();
  const seen = new Set<string>();
  const rpc: typeof inquiryRpc = (name, parameters) => dependencies.rpc(name, parameters, env, { timeoutMs: RPC_TIMEOUT_MS });
  while (summary.claimed < MAX_JOBS && deadline - now() >= JOB_BUDGET_MS) {
    // Lease one job only when its SMTP and final DB acknowledgement both fit.
    // Batching leases used to consume attempts for work left untouched by the
    // deadline, and a late SMTP start could outlive the 60-second function.
    const jobs = await rpc("vector_claim_mail", { p_limit: 1, p_worker: worker });
    if (!Array.isArray(jobs) || jobs.length > 1 || !jobs.every(validMailJob)) throw new Error("Invalid mail queue response");
    if (!jobs.length) break;
    const job = jobs[0];
    if (seen.has(job.id)) throw new Error("Mail queue returned an already claimed job");
    seen.add(job.id);
    summary.claimed++;
    const finish = async (result: string, errorCode: string | null, providerId: string | null = null) => {
      const saved = await rpc("vector_finish_mail", { p_id: job.id, p_worker: worker, p_result: result, p_provider_id: providerId, p_error_code: errorCode });
      if (saved !== "recorded") throw new Error("Mail result was not recorded");
    };
    const recipient = job.kind === "internal_contact" ? configuration.internalTo : job.email;
    if (reservedMailAddress(job.email) || !mailRecipientAllowed(job.email, configuration) || !mailRecipientAllowed(recipient, configuration)) {
      await finish("suppressed", "RECIPIENT_NOT_ALLOWED"); summary.suppressed++; continue;
    }
    let actionUrl: string | undefined;
    if (job.kind === "newsletter_confirm" || job.kind === "newsletter_welcome") {
      const action = mailActionLink(job, configuration);
      if (Date.parse(action.expiresAt) <= Date.now()) { await finish("failed", "ACTION_EXPIRED"); summary.failed++; continue; }
      const registered = await rpc("vector_register_mail_token", { p_id: job.id, p_worker: worker,
        p_token_hash: hashUnsubscribeToken(mailActionToken(job, configuration.tokenSecret)), p_expires_at: action.expiresAt });
      if (registered !== "registered") { await finish("suppressed", "SUBSCRIPTION_NOT_CURRENT"); summary.suppressed++; continue; }
      actionUrl = action.url;
    }
    const message = renderMail(job, configuration, actionUrl);
    // Persist the ambiguity boundary BEFORE contacting SMTP. If the function
    // dies after this transition, the expired lease becomes delivery_unknown.
    const started = await rpc("vector_start_mail", { p_id: job.id, p_worker: worker });
    if (started !== "sending") { await finish("suppressed", "JOB_NOT_CURRENT"); summary.suppressed++; continue; }
    let delivery: MailResult;
    try { delivery = await dependencies.send(message, configuration); }
    catch { delivery = { result: "delivery_unknown", providerId: null, errorCode: "SMTP_DELIVERY_UNKNOWN" }; }
    await finish(delivery.result, delivery.errorCode, delivery.providerId);
    if (delivery.result === "delivery_unknown") summary.unknown++;
    else summary[delivery.result]++;
  }
  return summary;
}
