"use client";

import Link from "next/link";
import { useState } from "react";
import { localeHref, type Language } from "./locale";

export function InquiryForm({ language, enabled }: { language: Language; enabled: boolean }) {
  const en = language === "en";
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
      if (response.ok && result.code === "ACCEPTED") { setStatus(en ? "Received. Your request has been saved." : "Recibido. Tu solicitud quedó guardada."); form.reset(); }
      else if (response.status === 429) setStatus(en ? "Too many requests. Please try again later." : "Demasiadas solicitudes. Inténtalo más tarde.");
      else setStatus(en ? "Your request could not be saved. Please try again later." : "No se pudo guardar tu solicitud. Inténtalo más tarde.");
    } catch { setStatus(en ? "Connection failed. Your request has not been sent." : "Error de conexión. Tu solicitud no se ha enviado."); }
    finally { setPending(false); }
  }}>
    {!enabled && <p className="pw4-form-notice" role="status">{en ? "Online submissions are not open yet. The form will be enabled after secure storage is verified. Nothing entered here is sent or saved." : "Los envíos todavía no están abiertos. El formulario se habilitará cuando el almacenamiento seguro esté verificado. Lo que escribas aquí no se envía ni se guarda."}</p>}
    <div className="pw4-field"><label htmlFor="vector-kind">{en ? "How can we help?" : "¿Qué necesitas?"}</label><select id="vector-kind" name="kind" value={kind} onChange={event => setKind(event.target.value)}><option value="interest">{en ? "Product news & availability" : "Novedades y disponibilidad"}</option><option value="contact">{en ? "Contact & technical question" : "Contacto y consulta técnica"}</option></select></div>
    <div className="pw4-form-row"><label>{en ? "Name (optional)" : "Nombre (opcional)"}<input name="name" autoComplete="name" maxLength={100} /></label><label>{en ? "Email" : "Correo electrónico"}<input name="email" type="email" autoComplete="email" required maxLength={254} /></label></div>
    {kind === "contact" && <div className="pw4-field"><label htmlFor="vector-message">{en ? "Your message" : "Tu mensaje"}</label><textarea id="vector-message" aria-describedby="vector-message-help" name="message" required minLength={10} maxLength={2000} rows={5} /><span id="vector-message-help" className="pw4-field-help">{en ? "Do not send passwords, keys, payment details or private flight logs." : "No envíes contraseñas, claves, datos de pago ni registros privados de vuelo."}</span></div>}
    <div className="pw4-honeypot" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
    <label className="pw4-consent"><input type="checkbox" name="consent" required /><span>{en ? "I agree to the processing of this request as described in the " : "Acepto el tratamiento de esta solicitud según la "}<Link href={localeHref(language, "/privacidad")}>{en ? "privacy notice" : "información de privacidad"}</Link>. {en ? "News consent is voluntary." : "El consentimiento para novedades es voluntario."}</span></label>
    <button className="pw4-button pw4-button-primary" type="submit" disabled={!enabled || pending}>{pending ? (en ? "Sending…" : "Enviando…") : enabled ? (en ? "Send request" : "Enviar solicitud") : (en ? "Submissions coming soon" : "Envíos próximamente")}</button>
    <p className="pw4-form-status" role="status" aria-live="polite">{status}</p>
  </form>;
}

