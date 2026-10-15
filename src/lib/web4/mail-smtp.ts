import nodemailer from "nodemailer";
import type { MailConfiguration, MailMessage, MailResult } from "./mail";

export function smtpFailure(error: unknown): MailResult {
  const failure = error && typeof error === "object" ? error as { code?: string; command?: string; responseCode?: number } : {};
  const code = failure.code || "";
  const command = failure.command || "";
  const response = failure.responseCode || 0;
  // A negative SMTP response explicitly rejected the transaction. A timeout or
  // closed connection during DATA may occur AFTER delivery: never retry it.
  if (response >= 400 && response < 500) return { result: "retry", providerId: null, errorCode: "SMTP_TEMPORARY_REJECTION" };
  if (response >= 500 && response < 600) return { result: "failed", providerId: null, errorCode: "SMTP_PERMANENT_REJECTION" };
  if (code === "EAUTH") return { result: "failed", providerId: null, errorCode: "SMTP_AUTHENTICATION" };
  if (code === "EENVELOPE" || code === "EMESSAGE") return { result: "failed", providerId: null, errorCode: "SMTP_INVALID_MESSAGE" };
  if (["EDNS", "ECONNECTION"].includes(code) && ["CONN", "EHLO", "HELO", "STARTTLS", "AUTH"].includes(command)) return { result: "retry", providerId: null, errorCode: "SMTP_PREACCEPT_CONNECTION" };
  if (["ETIMEDOUT", "ESOCKET"].includes(code) && ["CONN", "EHLO", "HELO", "STARTTLS", "AUTH"].includes(command)) return { result: "retry", providerId: null, errorCode: "SMTP_PREACCEPT_TIMEOUT" };
  return { result: "delivery_unknown", providerId: null, errorCode: "SMTP_DELIVERY_UNKNOWN" };
}

// SMTP is replaceable without changing forms or persistence. No logging, remote
// content, attachments, pooling, arbitrary TLS overrides or recipient lists.
export async function sendSmtp(message: MailMessage, configuration: MailConfiguration): Promise<MailResult> {
  let deadline: ReturnType<typeof setTimeout> | undefined;
  const transport = nodemailer.createTransport({
    host: configuration.host, port: configuration.port, secure: configuration.port === 465,
    requireTLS: true, auth: { user: configuration.user, pass: configuration.password },
    tls: { minVersion: "TLSv1.2", rejectUnauthorized: true, servername: configuration.host },
    connectionTimeout: 8000, greetingTimeout: 8000, socketTimeout: 12000, dnsTimeout: 5000,
    logger: false, debug: false, disableFileAccess: true, disableUrlAccess: true,
  });
  try {
    const delivery = transport.sendMail({ ...message, from: { name: "Patagonia Wings · COPILOTO VECTOR", address: message.from },
      envelope: { from: message.from, to: [message.to] }, disableFileAccess: true, disableUrlAccess: true }).then<MailResult>(info => {
        if (info.accepted.length === 1 && info.rejected.length === 0) return { result: "sent", providerId: message.messageId, errorCode: null };
        return { result: "failed", providerId: null, errorCode: "SMTP_RECIPIENT_REJECTED" };
      });
    const limit = new Promise<MailResult>(resolve => {
      deadline = setTimeout(() => {
        transport.close();
        resolve({ result: "delivery_unknown", providerId: null, errorCode: "SMTP_DELIVERY_UNKNOWN" });
      }, 12000);
    });
    return await Promise.race([delivery, limit]);
  } catch (error) { return smtpFailure(error); }
  finally { if (deadline) clearTimeout(deadline); transport.close(); }
}
