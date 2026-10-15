import { after } from "next/server";
import { mailConfiguration } from "./mail";
import { dispatchMail } from "./mail-dispatch";

// The database has already committed the request and outbox jobs. Scheduling
// or SMTP failures must never turn that successful persistence into a 503.
export function scheduleMailAfterResponse(): void {
  if (!mailConfiguration(process.env)) return;
  try {
    after(async () => {
      try { await dispatchMail(); }
      catch { console.error("VECTOR_MAIL_DISPATCH_FAILED"); }
    });
  } catch { console.error("VECTOR_MAIL_SCHEDULING_FAILED"); }
}
