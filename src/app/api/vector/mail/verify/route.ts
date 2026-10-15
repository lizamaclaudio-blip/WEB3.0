import { mailConfiguration, mailWorkerAuthorized } from "@/lib/web4/mail";
import { verifySmtp } from "@/lib/web4/mail-smtp";
import { inquiryReply } from "@/lib/web4/inquiry-http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Private, credential-only preflight. Mail can stay disabled during rotation.
// No request-supplied settings, message, recipient, queue read or DB mutation.
export async function POST(request: Request) {
  if (!mailWorkerAuthorized(request, process.env.VECTOR_MAIL_WORKER_SECRET || "")) return inquiryReply("UNAUTHORIZED", 401);
  const configuration = mailConfiguration({ ...process.env, VECTOR_MAIL_ENABLED: "true" });
  if (!configuration) return inquiryReply("MAIL_NOT_CONFIGURED", 503);
  try {
    const result = await verifySmtp(configuration);
    return inquiryReply(result.verified ? "SMTP_VERIFIED" : result.errorCode || "SMTP_VERIFICATION_UNAVAILABLE", result.verified ? 200 : 503);
  } catch { return inquiryReply("SMTP_VERIFICATION_UNAVAILABLE", 503); }
}
