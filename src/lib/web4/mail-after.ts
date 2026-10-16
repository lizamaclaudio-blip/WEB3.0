import { after } from "next/server";
import { mailConfiguration } from "./mail";
import { dispatchMail } from "./mail-dispatch";

// The database has already committed the request and outbox jobs. Scheduling
// or SMTP failures must never turn that successful persistence into a 503.
export function scheduleMailAfterResponse(): void {
  // Workers waitUntil has a 30s grace period; the existing safe dispatcher
  // reserves up to 45s. Retain requests/outbox and use the protected foreground
  // dispatch route after separate SMTP validation; never start an unsafe send.
  if(process.env.VECTOR_HOSTING_PLATFORM==='cloudflare')return;
  if (!mailConfiguration(process.env)) return;
  try {
    after(async () => {
      try { await dispatchMail(); }
      catch { console.error("VECTOR_MAIL_DISPATCH_FAILED"); }
    });
  } catch { console.error("VECTOR_MAIL_SCHEDULING_FAILED"); }
}
