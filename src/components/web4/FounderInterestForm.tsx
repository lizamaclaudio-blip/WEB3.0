"use client";

import Link from "next/link";
import { useState } from "react";
import { localized, localeHref, type Language } from "./locale";
import { useFormAvailability } from './useFormAvailability';

export function FounderInterestForm({ language, enabled: initialEnabled = false, preview: initialPreview = true }: { language: Language; enabled?: boolean; preview?: boolean }) {
  const { enabled, preview } = useFormAvailability({ enabled: initialEnabled, preview: initialPreview });
  const t = (es: string, en: string, fr: string) => localized(language, es, en, fr);
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState("");
  return <form className="pv51-form pv51-founders-form" onSubmit={async event => {
    event.preventDefault();
    if (!enabled || pending) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    setPending(true); setStatus("");
    try {
      const response = await fetch("/api/vector/founders", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify({ name: data.get("name"), email: data.get("email"), locale: language, country: data.get("country") || "", noticeConsent: data.get("noticeConsent") === "on", newsletterConsent: data.get("newsletterConsent") === "on", website: data.get("website") || "" }) });
      const result = await response.json();
      if (response.ok && result.ok && result.code === "SAVED_PENDING_VERIFICATION") {
        setStatus(t("Tu interés quedó registrado, pendiente de verificación. Confirma el aviso desde tu cuenta comunitaria con correo verificado. Esto no es una participación en el concurso ni confirma el envío de un correo.", "Your interest has been recorded, pending verification. Confirm the notice from your community account with a verified email. This is not a competition entry or confirmation of email delivery.", "Votre intérêt a été enregistré, en attente de vérification. Confirmez l’avis depuis votre compte communautaire avec une adresse vérifiée. Il ne s’agit pas d’une participation au concours ni d’une confirmation d’envoi d’e-mail.")); form.reset();
      } else if (response.status === 429) setStatus(t("Demasiadas solicitudes. Inténtalo más tarde.", "Too many requests. Please try again later.", "Trop de demandes. Veuillez réessayer plus tard."));
      else if (result.code === "CONSENT_REQUIRED" || result.code === "INVALID_INPUT") setStatus(t("Revisa los campos y acepta recibir el aviso de apertura. Las novedades son opcionales.", "Check your details and agree to receive the opening notice. News updates are optional.", "Vérifiez les champs et acceptez de recevoir l’avis d’ouverture. Les actualités sont facultatives."));
      else setStatus(t("No pudimos confirmar el registro. Inténtalo más tarde; no se ha confirmado una inscripción.", "We could not confirm storage. Please try later; no registration has been confirmed.", "Nous n’avons pas pu confirmer l’enregistrement. Réessayez plus tard ; aucune inscription n’a été confirmée."));
    } catch { setStatus(t("No pudimos confirmar la recepción. Revisa tu conexión e inténtalo más tarde.", "We could not confirm receipt. Check your connection and try again later.", "Nous n’avons pas pu confirmer la réception. Vérifiez votre connexion et réessayez plus tard.")); }
    finally { setPending(false); }
  }}>
    <h2>{t("Avísame cuando abra Founders 10.", "Let me know when Founders 10 opens.", "Prévenez-moi de l’ouverture de Founders 10.")}</h2>
    <p>{t("Solo un aviso de apertura. Sin compra, sin participación anticipada y sin suscripción automática a novedades.", "An opening notice only. No purchase, no early entry and no automatic news subscription.", "Un avis d’ouverture uniquement. Aucun achat, aucune participation anticipée et aucun abonnement automatique aux actualités.")}</p>
    {!enabled && <p className="pv51-notice" role="status">{t("El registro de avisos está en preparación. El formulario no envía ni guarda datos hasta que el almacenamiento seguro esté habilitado.", "Opening notifications are being prepared. This form cannot send or store information until secure storage is enabled.", "Les avis d’ouverture sont en préparation. Ce formulaire ne peut ni envoyer ni enregistrer de données avant l’activation du stockage sécurisé.")}</p>}
    {enabled && preview && <p className="pv51-notice">{t("Preview de revisión: utiliza datos ficticios. La campaña no está abierta y no se envían avisos comerciales masivos.", "Review Preview: use fictional details. The campaign is not open and no bulk marketing notices are sent.", "Preview de vérification : utilisez des données fictives. La campagne n’est pas ouverte et aucun avis commercial de masse n’est envoyé.")}</p>}
    <div className="pv51-form-grid"><label>{t("Nombre o alias", "Name or alias", "Nom ou pseudonyme")}<input name="name" autoComplete="nickname" required minLength={2} maxLength={100} disabled={!enabled} /></label><label>{t("Correo electrónico", "Email", "Adresse e-mail")}<input name="email" type="email" autoComplete="email" required maxLength={254} disabled={!enabled} /></label></div>
    <label>{t("País (opcional)", "Country (optional)", "Pays (facultatif)")}<input name="country" autoComplete="country-name" maxLength={80} disabled={!enabled} /></label>
    <p className="pv51-help">{t("Idioma del aviso: español.", "Notification language: English.", "Langue de l’avis : français.")}</p>
    <div className="pv51-trap" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
    <label className="pv51-consent"><input type="checkbox" name="noticeConsent" required disabled={!enabled} /><span>{t("Acepto que se guarden mis datos para recibir el aviso de apertura de Founders 10 según la ", "I agree to storage of my details to receive the Founders 10 opening notice, as explained in the ", "J’accepte l’enregistrement de mes données pour recevoir l’avis d’ouverture de Founders 10, conformément à la ")}<Link href={localeHref(language, "/privacidad")}>{t("información de privacidad", "privacy notice", "notice de confidentialité")}</Link>.</span></label>
    <label className="pv51-consent"><input type="checkbox" name="newsletterConsent" disabled={!enabled} /><span>{t("También quiero recibir novedades de VECTOR (opcional, requiere confirmación por correo).", "I would also like VECTOR news (optional, requires email confirmation).", "Je souhaite également recevoir les actualités de VECTOR (facultatif, confirmation par e-mail requise).")}</span></label>
    <button type="submit" className="pw4-button pw4-button-primary" disabled={!enabled || pending}>{pending ? t("Guardando…", "Saving…", "Enregistrement…") : t("Recibir el aviso de apertura", "Receive the opening notice", "Recevoir l’avis d’ouverture")}</button>
    <p className="pv51-feedback" aria-live="polite" role="status">{status}</p><Link className="pv51-help" href={localeHref(language, "/comunidad/cuenta")}>{t("Verificar mi cuenta y gestionar el aviso", "Verify my account & manage the notice", "Vérifier mon compte et gérer l’avis")}</Link>
  </form>;
}
