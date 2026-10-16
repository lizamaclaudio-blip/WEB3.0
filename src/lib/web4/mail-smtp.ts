import "server-only";
import nodemailer from "nodemailer";
import type { SMTPTransportGetSocket } from "nodemailer/lib/smtp-transport";
import type { Socket } from 'node:net';
import type { MailConfiguration, MailMessage, MailResult } from "./mail";
import { nativeSmtpConnector, openNativeSmtpSocket, type NativeTlsConnect } from "./mail-native-socket";

// Also used by dispatcher admission control. Do not raise independently of the
// serverless budget or the last persistence acknowledgement can be interrupted.
export const SMTP_TIMEOUT_MS = 12000;

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

// Sending and credential preflight use identical transport/TLS requirements.
function smtpTransport(configuration: MailConfiguration, onDataCommand?: () => void) {
  const native = process.env.VECTOR_HOSTING_PLATFORM === 'cloudflare';
  const connect = (globalThis as typeof globalThis & { [nativeSmtpConnector]?: NativeTlsConnect })[nativeSmtpConnector];
  if (native && !connect) throw Object.assign(new Error('SMTP_NATIVE_TRANSPORT_UNAVAILABLE'), { code: 'ECONNECTION', command: 'CONN' });
  const sockets = new Set<Socket>();
  let closed = false;
  const getSocket: SMTPTransportGetSocket | undefined = native && connect ? (_options, callback) => {
    openNativeSmtpSocket(connect, configuration.host, configuration.port, onDataCommand)
      .then(connection => {
        if (closed) { connection.destroy(); callback(new Error('SMTP_TRANSPORT_CLOSED')); return; }
        sockets.add(connection); connection.once('close', () => sockets.delete(connection));
        callback(null, { connection, secured: true });
      })
      .catch(() => callback(Object.assign(new Error('SMTP_NATIVE_TLS_UNAVAILABLE'), { code: 'ETLS', command: 'CONN' })));
  } : undefined;
  const transport = nodemailer.createTransport({
    host: configuration.host, port: configuration.port, secure: configuration.port === 465,
    requireTLS: true, auth: { user: configuration.user, pass: configuration.password },
    tls: { minVersion: "TLSv1.2", rejectUnauthorized: true, servername: configuration.host },
    connectionTimeout: 8000, greetingTimeout: 8000, socketTimeout: SMTP_TIMEOUT_MS, dnsTimeout: 5000,
    logger: false, debug: false, disableFileAccess: true, disableUrlAccess: true,
    ...(getSocket ? { getSocket } : {}),
  });
  const close = transport.close.bind(transport);
  transport.close = () => { closed = true; for (const socket of sockets) socket.destroy(); close(); };
  return transport;
}

function smtpVerificationError(error: unknown): string {
  const failure = error && typeof error === "object" ? error as { code?: string; command?: string } : {};
  if (failure.code === "EAUTH" || failure.command === "AUTH") return "SMTP_AUTHENTICATION";
  if (["CERT_HAS_EXPIRED", "UNABLE_TO_VERIFY_LEAF_SIGNATURE", "DEPTH_ZERO_SELF_SIGNED_CERT",
    "ERR_TLS_CERT_ALTNAME_INVALID", "SELF_SIGNED_CERT_IN_CHAIN", "UNABLE_TO_GET_ISSUER_CERT",
    "UNABLE_TO_GET_ISSUER_CERT_LOCALLY", "ERR_SSL_WRONG_VERSION_NUMBER", "ERR_SSL_UNKNOWN_PROTOCOL"].includes(failure.code || "")) return "SMTP_TLS_VERIFICATION";
  if (failure.code === "ETIMEDOUT") return "SMTP_VERIFICATION_TIMEOUT";
  return "SMTP_VERIFICATION_UNAVAILABLE";
}

// Establish TLS and authenticate only. This does not send an email, claim work,
// prove inbox delivery or check the sender's SPF/DKIM/DMARC authentication.
export async function verifySmtp(configuration: MailConfiguration): Promise<{ verified: boolean; errorCode: string | null }> {
  let deadline: ReturnType<typeof setTimeout> | undefined;
  let transport: ReturnType<typeof smtpTransport> | undefined;
  try {
    transport = smtpTransport(configuration);
    const verified = transport.verify().then(() => ({ verified: true, errorCode: null }));
    const limit = new Promise<{ verified: boolean; errorCode: string }>(resolve => {
      deadline = setTimeout(() => {
        transport?.close();
        resolve({ verified: false, errorCode: "SMTP_VERIFICATION_TIMEOUT" });
      }, SMTP_TIMEOUT_MS);
    });
    return await Promise.race([verified, limit]);
  } catch (error) { return { verified: false, errorCode: smtpVerificationError(error) }; }
  finally { if (deadline) clearTimeout(deadline); transport?.close(); }
}

// SMTP is replaceable without changing forms or persistence. No logging, remote
// content, attachments, pooling, arbitrary TLS overrides or recipient lists.
export async function sendSmtp(message: MailMessage, configuration: MailConfiguration): Promise<MailResult> {
  let deadline: ReturnType<typeof setTimeout> | undefined;
  let transport: ReturnType<typeof smtpTransport> | undefined;
  let dataStarted = false;
  try {
    transport = smtpTransport(configuration, () => { dataStarted = true; });
    const delivery = transport.sendMail({ ...message, from: { name: "Patagonia Wings · COPILOTO VECTOR", address: message.from },
      envelope: { from: message.from, to: [message.to] }, disableFileAccess: true, disableUrlAccess: true }).then<MailResult>(info => {
        if (info.accepted.length === 1 && info.rejected.length === 0) return { result: "sent", providerId: message.messageId, errorCode: null };
        return { result: "failed", providerId: null, errorCode: "SMTP_RECIPIENT_REJECTED" };
      });
    const limit = new Promise<MailResult>(resolve => {
      deadline = setTimeout(() => {
        transport?.close();
        resolve({ result: "delivery_unknown", providerId: null, errorCode: "SMTP_DELIVERY_UNKNOWN" });
      }, SMTP_TIMEOUT_MS);
    });
    return await Promise.race([delivery, limit]);
  } catch (error) {
    const responseCode = error && typeof error === 'object' ? (error as { responseCode?: number }).responseCode : undefined;
    // Nodemailer can label a broken native stream CONN after DATA. The actual
    // write boundary takes precedence: an ambiguous delivery must never retry.
    if (dataStarted && !(responseCode && responseCode >= 400 && responseCode < 600))
      return { result: 'delivery_unknown', providerId: null, errorCode: 'SMTP_DELIVERY_UNKNOWN' };
    return smtpFailure(error);
  }
  finally { if (deadline) clearTimeout(deadline); transport?.close(); }
}
