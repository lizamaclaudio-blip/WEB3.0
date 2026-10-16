import type { MailConfiguration, MailJob, MailMessage } from "./mail";

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
const copy = {
  es: {
    contact_receipt: ["Hemos recibido tu mensaje", "Tu consulta está en buenas manos.", "Hemos guardado tu consulta sobre COPILOTO VECTOR. Nuestro equipo la revisará. Este correo confirma la recepción; no implica un plazo de respuesta ni una compra."],
    internal_contact: ["Nuevo mensaje de contacto", "Una nueva consulta para el equipo.", "Solicitud guardada correctamente. Contesta al remitente solo cuando corresponda; el envío de este aviso no modifica su consentimiento a novedades."],
    newsletter_confirm: ["Confirma que quieres recibir novedades", "Tu correo. Tu decisión.", "Confirma tu dirección para recibir novedades de COPILOTO VECTOR. No recibirás novedades hasta completar este paso. El enlace vence en 24 horas."],
    newsletter_welcome: ["Tu suscripción a novedades está confirmada", "Bienvenido a bordo.", "Tu dirección está verificada y tu inscripción a novedades de COPILOTO VECTOR está confirmada. Recibirás novedades de TAKEOFF, HORIZON y COMMANDER. Las implementaciones QA siguen sujetas a validación real y no anuncian disponibilidad comercial; este correo no activa ninguna licencia."],
    confirm: "Confirmar mi inscripción", unsubscribe: "Cancelar mi suscripción", ignore: "Si no lo solicitaste, ignora este correo. No se confirmará ninguna suscripción.",
    footer: "Patagonia Wings · COPILOTO VECTOR", message: "Mensaje", reference: "Referencia", preference: "Puedes cancelar las novedades con el enlace de este correo. El enlace vence en 30 días.",
  },
  en: {
    contact_receipt: ["We received your message", "Your question is with our team.", "We have saved your COPILOTO VECTOR enquiry. Our team will review it. This confirms receipt; it does not promise a response time or confirm a purchase."],
    internal_contact: ["New contact message", "A new enquiry for the team.", "The request has been saved. Reply to the sender when appropriate; sending this notification does not change their news consent."],
    newsletter_confirm: ["Confirm you want to receive updates", "Your email. Your choice.", "Confirm your address to receive COPILOTO VECTOR news. You will not receive news until you complete this step. The link expires in 24 hours."],
    newsletter_welcome: ["Your news subscription is confirmed", "Welcome aboard.", "Your address is verified and your COPILOTO VECTOR news subscription is confirmed. You will receive TAKEOFF, HORIZON and COMMANDER updates. QA implementations remain subject to live validation and do not announce commercial availability; this email does not activate a licence."],
    confirm: "Confirm my subscription", unsubscribe: "Unsubscribe from news", ignore: "If you did not request this, ignore this email. No subscription will be confirmed.",
    footer: "Patagonia Wings · COPILOTO VECTOR", message: "Message", reference: "Reference", preference: "You can unsubscribe using the link in this email. The link expires in 30 days.",
  },
  fr: {
    contact_receipt: ["Nous avons reçu votre message", "Votre demande est entre de bonnes mains.", "Votre demande concernant COPILOTO VECTOR a été enregistrée. Notre équipe l’examinera. Cet e-mail confirme sa réception ; il ne garantit ni délai de réponse ni achat."],
    internal_contact: ["Nouveau message de contact", "Une nouvelle demande pour l’équipe.", "La demande a été enregistrée. Répondez à l’expéditeur lorsque cela convient ; cette notification ne modifie pas son consentement aux actualités."],
    newsletter_confirm: ["Confirmez votre inscription aux actualités", "Votre adresse. Votre choix.", "Confirmez votre adresse pour recevoir les actualités de COPILOTO VECTOR. Aucun envoi d’actualités n’aura lieu avant cette étape. Le lien expire dans 24 heures."],
    newsletter_welcome: ["Votre inscription aux actualités est confirmée", "Bienvenue à bord.", "Votre adresse est vérifiée et votre inscription aux actualités de COPILOTO VECTOR est confirmée. Vous recevrez les actualités TAKEOFF, HORIZON et COMMANDER. Les implémentations QA restent soumises à validation réelle et n’annoncent pas de disponibilité commerciale ; cet e-mail n’active aucune licence."],
    confirm: "Confirmer mon inscription", unsubscribe: "Me désinscrire des actualités", ignore: "Si vous n’êtes pas à l’origine de cette demande, ignorez cet e-mail. Aucun abonnement ne sera confirmé.",
    footer: "Patagonia Wings · COPILOTO VECTOR", message: "Message", reference: "Référence", preference: "Vous pouvez vous désinscrire avec le lien de cet e-mail. Le lien expire dans 30 jours.",
  },
};

export function renderMail(job: MailJob, configuration: MailConfiguration, actionUrl?: string): MailMessage {
  const t = copy[job.locale];
  const [subject, title, body] = t[job.kind];
  const internal = job.kind === "internal_contact";
  const confirmation = job.kind === "newsletter_confirm";
  const welcome = job.kind === "newsletter_welcome";
  if ((confirmation || welcome) && !actionUrl) throw new Error("Missing mail action");
  const label = confirmation ? t.confirm : t.unsubscribe;
  const details = internal ? `${job.name || "—"}\n${job.email}\n\n${t.message}:\n${job.message}` : "";
  const note = confirmation ? t.ignore : welcome ? t.preference : "";
  const escapedDetails = internal ? `<div style="margin:24px 0;padding:18px;background:#081b2b;border:1px solid #1d4e68;border-radius:10px;white-space:pre-wrap;overflow-wrap:anywhere">${escapeHtml(details)}</div>` : "";
  const action = actionUrl ? `<p style="margin:28px 0"><a href="${escapeHtml(actionUrl)}" style="display:inline-block;background:#00e0c7;color:#061522;text-decoration:none;padding:14px 22px;border-radius:7px;font-weight:700">${escapeHtml(label)}</a></p><p style="font-size:12px;overflow-wrap:anywhere">${escapeHtml(actionUrl)}</p>` : "";
  const html = `<!doctype html><html lang="${job.locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#061522;color:#eaf6ff;font-family:Arial,Helvetica,sans-serif"><div style="display:none;max-height:0;overflow:hidden">${escapeHtml(title)}</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:32px 14px"><table role="presentation" width="600" cellspacing="0" cellpadding="0" style="width:100%;max-width:600px;background:#0d2434;border:1px solid #1d4e68;border-top:4px solid #00e0c7;border-radius:12px"><tr><td style="padding:32px"><p style="color:#00e0c7;font-size:12px;letter-spacing:2px">COPILOTO VECTOR</p><h1 style="font-size:28px;line-height:1.2;margin:22px 0">${escapeHtml(title)}</h1><p style="color:#b8d0e0;line-height:1.7">${escapeHtml(body)}</p>${escapedDetails}${action}<p style="font-size:13px;color:#b8d0e0;line-height:1.6">${escapeHtml(note)}</p><hr style="border:0;border-top:1px solid #1d4e68;margin:28px 0"><p style="font-size:11px;color:#b8d0e0">${escapeHtml(t.footer)}<br>${escapeHtml(t.reference)}: ${job.id}</p></td></tr></table></td></tr></table></body></html>`;
  return {
    to: internal ? configuration.internalTo : job.email, from: configuration.from,
    ...(internal ? { replyTo: job.email } : {}), subject, html,
    text: ["COPILOTO VECTOR", title, body, details, actionUrl ? `${label}: ${actionUrl}` : "", note, `${t.reference}: ${job.id}`, t.footer].filter(Boolean).join("\n\n"),
    messageId: `<vector-${job.id}@${configuration.from.split("@")[1].toLowerCase()}>`,
  };
}
