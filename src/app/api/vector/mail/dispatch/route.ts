import { dispatchMail } from "@/lib/web4/mail-dispatch";
import { mailWorkerAuthorized } from "@/lib/web4/mail";
import { inquiryReply } from "@/lib/web4/inquiry-http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Server-to-server POST only. No public queue read or per-recipient send API.
export async function POST(request: Request) {
  if (!mailWorkerAuthorized(request, process.env.VECTOR_MAIL_WORKER_SECRET || "")) return inquiryReply("UNAUTHORIZED", 401);
  try {
    const summary = await dispatchMail();
    if (!summary.enabled) return inquiryReply("MAIL_NOT_CONFIGURED", 503);
    return Response.json({ ok: true, ...summary }, { headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
  } catch { return inquiryReply("MAIL_DISPATCH_UNAVAILABLE", 503); }
}
