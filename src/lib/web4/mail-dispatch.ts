import { randomUUID } from "node:crypto";
import { inquiryRpc, type InquiryEnvironment } from "./inquiry-storage";
import { hashUnsubscribeToken } from "./newsletter";
import { mailActionLink, mailActionToken, mailConfiguration, mailRecipientAllowed, reservedMailAddress, validMailJob, type MailConfiguration, type MailMessage, type MailResult } from "./mail";
import { renderMail } from "./mail-templates";
import { sendSmtp } from "./mail-smtp";

type Dependencies = { rpc: typeof inquiryRpc; send: (message: MailMessage, configuration: MailConfiguration) => Promise<MailResult> };
export type MailDispatchSummary = { enabled: boolean; claimed: number; sent: number; retry: number; unknown: number; failed: number; suppressed: number };

export async function dispatchMail(env: InquiryEnvironment = process.env, dependencies: Dependencies = { rpc: inquiryRpc, send: sendSmtp }): Promise<MailDispatchSummary> {
  const summary: MailDispatchSummary = { enabled: false, claimed: 0, sent: 0, retry: 0, unknown: 0, failed: 0, suppressed: 0 };
  const configuration = mailConfiguration(env);
  if (!configuration) return summary;
  summary.enabled = true;
  const deadline = Date.now() + 45000;
  const worker = randomUUID();
  const jobs = await dependencies.rpc("vector_claim_mail", { p_limit: 4, p_worker: worker }, env);
  if (!Array.isArray(jobs) || jobs.length > 4 || !jobs.every(validMailJob)) throw new Error("Invalid mail queue response");
  summary.claimed = jobs.length;
  for (const job of jobs) {
    // Remaining leased jobs become eligible after lease expiry. Never start
    // another SMTP transaction close to the serverless execution limit.
    if (Date.now() >= deadline) break;
    const finish = async (result: string, errorCode: string | null, providerId: string | null = null) => {
      const saved = await dependencies.rpc("vector_finish_mail", { p_id: job.id, p_worker: worker, p_result: result, p_provider_id: providerId, p_error_code: errorCode }, env);
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
      const registered = await dependencies.rpc("vector_register_mail_token", { p_id: job.id, p_worker: worker,
        p_token_hash: hashUnsubscribeToken(mailActionToken(job, configuration.tokenSecret)), p_expires_at: action.expiresAt }, env);
      if (registered !== "registered") { await finish("suppressed", "SUBSCRIPTION_NOT_CURRENT"); summary.suppressed++; continue; }
      actionUrl = action.url;
    }
    const message = renderMail(job, configuration, actionUrl);
    // Persist the ambiguity boundary BEFORE contacting SMTP. If the function
    // dies after this transition, the expired lease becomes delivery_unknown.
    const started = await dependencies.rpc("vector_start_mail", { p_id: job.id, p_worker: worker }, env);
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
