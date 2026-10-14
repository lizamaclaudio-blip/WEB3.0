"use client";

import Link from "next/link";
import { useState } from "react";
import { localeHref, localized, type Language } from "./locale";

export function InquiryForm({ language, enabled }: { language: Language; enabled: boolean }) {
  const t = (es: string, en: string, fr: string) => localized(language, es, en, fr);
  const [kind, setKind] = useState("interest");
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState("");
  return <form className="pw4-form" onSubmit={async (event) => {
    event.preventDefault();
    if (pending || !enabled) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    setPending(true); setStatus("");
    try {
      const response = await fetch("/api/vector/inquiry", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, email: data.get("email"), name: data.get("name") || "", message: data.get("message") || "", website: data.get("website"), consent: data.get("consent") === "on", locale: language }) });
      const result = await response.json();
      if (response.ok && result.code === "ACCEPTED") { setStatus(t("Recibido. Tu solicitud quedó guardada.", "Received. Your request has been saved.", "Demande reçue. Elle a bien été enregistrée.")); form.reset(); }
      else if (response.status === 429) setStatus(t("Demasiadas solicitudes. Inténtalo más tarde.", "Too many requests. Please try again later.", "Trop de demandes. Veuillez réessayer plus tard."));
      else setStatus(t("No se pudo guardar tu solicitud. Inténtalo más tarde.", "Your request could not be saved. Please try again later.", "Votre demande n’a pas pu être enregistrée. Veuillez réessayer plus tard."));
    } catch { setStatus(t("Error de conexión. Tu solicitud no se ha enviado.", "Connection failed. Your request has not been sent.", "Erreur de connexion. Votre demande n’a pas été envoyée.")); }
    finally { setPending(false); }
  }}>
    {!enabled && <p className="pw4-form-notice" role="status">{t("Los envíos todavía no están abiertos. El formulario se habilitará cuando el almacenamiento seguro esté verificado. Lo que escribas aquí no se envía ni se guarda.", "Online submissions are not open yet. The form will be enabled after secure storage is verified. Nothing entered here is sent or saved.", "Les envois ne sont pas encore ouverts. Le formulaire sera activé après vérification du stockage sécurisé. Rien de ce que vous saisissez ici n’est envoyé ni enregistré.")}</p>}
    <div className="pw4-field"><label htmlFor="vector-kind">{t("¿Qué necesitas?", "How can we help?", "Comment pouvons-nous vous aider ?")}</label><select id="vector-kind" name="kind" value={kind} onChange={event => setKind(event.target.value)}><option value="interest">{t("Novedades y disponibilidad", "Product news & availability", "Actualités et disponibilité du produit")}</option><option value="contact">{t("Contacto y consulta técnica", "Contact & technical question", "Contact et question technique")}</option></select></div>
    <div className="pw4-form-row"><label>{t("Nombre (opcional)", "Name (optional)", "Nom (facultatif)")}<input name="name" autoComplete="name" maxLength={100} /></label><label>{t("Correo electrónico", "Email", "Adresse e-mail")}<input name="email" type="email" autoComplete="email" required maxLength={254} /></label></div>
    {kind === "contact" && <div className="pw4-field"><label htmlFor="vector-message">{t("Tu mensaje", "Your message", "Votre message")}</label><textarea id="vector-message" aria-describedby="vector-message-help" name="message" required minLength={10} maxLength={2000} rows={5} /><span id="vector-message-help" className="pw4-field-help">{t("No envíes contraseñas, claves, datos de pago ni registros privados de vuelo.", "Do not send passwords, keys, payment details or private flight logs.", "N’envoyez ni mots de passe, ni clés, ni données de paiement, ni journaux de vol privés.")}</span></div>}
    <div className="pw4-honeypot" aria-hidden="true"><label>{t("Website", "Website", "Site web")}<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
    <label className="pw4-consent"><input type="checkbox" name="consent" required /><span>{t("Acepto el tratamiento de esta solicitud según la ", "I agree to the processing of this request as described in the ", "J’accepte le traitement de cette demande conformément à la ")}<Link href={localeHref(language, "/privacidad")}>{t("información de privacidad", "privacy notice", "notice de confidentialité")}</Link>. {t("El consentimiento para novedades es voluntario.", "News consent is voluntary.", "Le consentement aux actualités est facultatif.")}</span></label>
    <button className="pw4-button pw4-button-primary" type="submit" disabled={!enabled || pending}>{pending ? (t("Enviando…", "Sending…", "Envoi en cours…")) : enabled ? (t("Enviar solicitud", "Send request", "Envoyer la demande")) : (t("Envíos próximamente", "Submissions coming soon", "Envois bientôt disponibles"))}</button>
    <p className="pw4-form-status" role="status" aria-live="polite">{status}</p>
  </form>;
}

