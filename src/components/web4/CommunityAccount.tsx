"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { localized, localeHref, type Language } from "./locale";

export function CommunityAccount({ language, enabled = false, registrationEnabled=false, qaRegistration=false }: { language: Language; enabled?: boolean; registrationEnabled?:boolean; qaRegistration?:boolean }) {
  const t = (es: string, en: string, fr: string) => localized(language, es, en, fr);
  const [register, setRegister] = useState(qaRegistration);
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(enabled);
  useEffect(() => {
    // Verification redirects must not leave bearer tokens in browser history.
    // A redirect is not proof of confirmation: login still checks Supabase.
    if (/(?:access_token|refresh_token|error|token_type)=/.test(window.location.hash)) {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  }, []);
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    fetch("/api/vector/community/session", { credentials: "same-origin", cache: "no-store", signal: controller.signal }).then(async response => { const result = await response.json(); if (response.ok && result.ok) setAuthenticated(result.authenticated === true); }).catch(() => {}).finally(() => { if (!controller.signal.aborted) setChecking(false); });
    return () => controller.abort();
  }, [enabled]);
  async function founderNotice(confirm: boolean) {
    if (pending) return;
    setPending(true); setStatus("");
    try {
      const response = await fetch("/api/vector/founders/confirm", { method: confirm ? "POST" : "DELETE", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ consent: confirm }) });
      const result = await response.json();
      if (response.ok && result.ok) setStatus(confirm ? t("Aviso de apertura confirmado para tu correo verificado. Esto no te inscribe en el concurso ni activa novedades comerciales.", "The opening notice is confirmed for your verified email. This does not enter you into the competition or enable marketing news.", "L’avis d’ouverture est confirmé pour votre adresse vérifiée. Cela ne vous inscrit pas au concours et n’active pas les actualités commerciales.") : t("Aviso de apertura cancelado. La preferencia de novedades se gestiona por separado desde sus enlaces de baja.", "Opening notice cancelled. News preferences are managed separately through their unsubscribe links.", "Avis d’ouverture annulé. Les préférences d’actualités se gèrent séparément via leurs liens de désabonnement."));
      else setStatus(t("No se pudo confirmar el cambio del aviso. Comprueba que registraste antes tu interés y que tu correo está verificado.", "The notice change could not be confirmed. Check that you registered your interest and verified your email first.", "La modification de l’avis n’a pas pu être confirmée. Vérifiez que vous avez d’abord enregistré votre intérêt et confirmé votre adresse."));
    } catch { setStatus(t("No pudimos confirmar el cambio por un error de conexión.", "A connection error prevented confirmation of the change.", "Une erreur de connexion a empêché la confirmation du changement.")); }
    finally { setPending(false); }
  }
  return <section className="pv51-account pw4-wrap"><div className="pv51-account-intro"><p className="pw4-eyebrow">VECTOR COMMUNITY LAB</p><h1>{t("Una voz. Una cuenta verificada.", "One voice. One verified account.", "Une voix. Un compte vérifié.")}</h1><p>{t("Para proponer y votar necesitamos una cuenta con correo verificado. Leer las ideas sigue siendo libre.", "Proposals and voting require an account with a verified email. Reading ideas remains open to everyone.", "Les propositions et les votes nécessitent un compte avec une adresse e-mail vérifiée. La lecture des idées reste ouverte à tous.")}</p><Link className="pw4-button" href={localeHref(language, "/comunidad")}>{t("Volver a las ideas", "Back to ideas", "Retour aux idées")}</Link><p className="pv51-help">{t("Esta cuenta comunitaria no crea una compra, licencia ni cuenta de la aplicación WPF.", "This community account does not create a purchase, a licence or a WPF application account.", "Ce compte communautaire ne crée ni achat, ni licence, ni compte dans l’application WPF.")}</p></div>
    <form className="pv51-form" onSubmit={async event => {
      event.preventDefault();
      if (!enabled || (register&&!registrationEnabled) || pending) return;
      const form = event.currentTarget;
      const data = new FormData(form);
      setPending(true); setStatus("");
      try {
        const credentials = { email: data.get("email"), password: data.get("password") };
        const payload = register ? { ...credentials, consent: data.get("consent") === "on", locale: language, website: data.get("website") || "" } : credentials;
        const qa = register && qaRegistration;
        const response = await fetch(register ? qa ? "/api/vector/community/qa-register" : "/api/vector/community/register" : "/api/vector/community/session", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json", ...(qa ? {Authorization: "Bearer " + String(data.get("invitation") || "")} : {}) }, body: JSON.stringify(payload) });
        const result = await response.json();
        if (response.ok && result.ok) {
          form.reset();
          if (register) setStatus(t("Si el registro puede completarse, recibirás las instrucciones de verificación. Esta pantalla no confirma la entrega del correo. Verifica tu dirección antes de iniciar sesión.", "If registration can proceed, you will receive verification instructions. This screen does not confirm delivery. Verify your email before signing in.", "Si l’inscription peut être effectuée, vous recevrez les instructions de vérification. Cet écran ne confirme pas l’envoi. Vérifiez votre adresse avant de vous connecter."));
          else window.location.assign(localeHref(language, "/comunidad"));
        } else if (response.status === 429) setStatus(t("Demasiados intentos. Espera antes de volver a intentarlo.", "Too many attempts. Please wait before trying again.", "Trop de tentatives. Veuillez patienter avant de réessayer."));
        else if (result.code === "EMAIL_UNVERIFIED") setStatus(t("Confirma tu dirección de correo antes de iniciar sesión.", "Confirm your email address before signing in.", "Confirmez votre adresse e-mail avant de vous connecter."));
        else if (response.status === 503) setStatus(t("Las cuentas comunitarias aún no están habilitadas en este entorno.", "Community accounts are not yet enabled in this environment.", "Les comptes communautaires ne sont pas encore activés dans cet environnement."));
        else setStatus(t("No pudimos completar la solicitud. Revisa tus datos y la verificación del correo.", "We could not complete the request. Check your details and email verification.", "Nous n’avons pas pu terminer la demande. Vérifiez vos informations et la confirmation de votre adresse."));
      } catch { setStatus(t("No se pudo confirmar la conexión. Inténtalo más tarde.", "The connection could not be confirmed. Please try later.", "La connexion n’a pas pu être confirmée. Veuillez réessayer plus tard.")); }
      finally { setPending(false); }
    }}>
      {!authenticated && <div className="pv51-account-mode" aria-label={t("Acceso a comunidad", "Community access", "Accès à la communauté")}><button type="button" aria-pressed={!register} onClick={() => { setRegister(false); setStatus(""); }}>{t("Iniciar sesión", "Sign in", "Connexion")}</button><button type="button" aria-pressed={register} onClick={() => { setRegister(true); setStatus(""); }}>{t("Crear cuenta", "Create account", "Créer un compte")}</button></div>}
      {checking ? <p className="pv51-notice" role="status">{t("Comprobando sesión…", "Checking session…", "Vérification de la session…")}</p> : !enabled ? <div className="pv51-notice" role="status"><h2>{t("Acceso en preparación", "Access is being prepared", "Accès en préparation")}</h2><p>{t("La autenticación segura debe estar habilitada antes de solicitar credenciales. No introduzcas aquí una contraseña.", "Secure authentication must be enabled before credentials are requested. Do not enter a password here.", "L’authentification sécurisée doit être activée avant de demander des identifiants. Ne saisissez pas de mot de passe ici.")}</p></div> : authenticated ? <>
        <h2>{t("Tu cuenta está verificada.", "Your account is verified.", "Votre compte est vérifié.")}</h2><p>{t("Puedes participar en el Community Lab. Si registraste tu interés en Founders 10, puedes confirmar o cancelar exclusivamente su aviso de apertura.", "You can contribute to the Community Lab. If you registered interest in Founders 10, you can confirm or cancel its opening notice separately.", "Vous pouvez contribuer au Community Lab. Si vous avez enregistré votre intérêt pour Founders 10, vous pouvez confirmer ou annuler séparément son avis d’ouverture.")}</p><button className="pw4-button pw4-button-primary" type="button" disabled={pending} onClick={() => founderNotice(true)}>{t("Confirmar aviso Founders 10", "Confirm Founders 10 notice", "Confirmer l’avis Founders 10")}</button><button className="pw4-button" type="button" disabled={pending} onClick={() => founderNotice(false)}>{t("Cancelar aviso Founders 10", "Cancel Founders 10 notice", "Annuler l’avis Founders 10")}</button><p className="pv51-help">{t("El concurso sigue cerrado. Confirmar el aviso no es participar en el sorteo ni garantiza una licencia.", "The competition remains closed. Confirming the notice is not entering the draw and does not guarantee a licence.", "Le concours reste fermé. Confirmer l’avis ne constitue pas une participation au tirage et ne garantit pas de licence.")}</p><Link className="pw4-button" href={localeHref(language, "/comunidad")}>{t("Explorar ideas", "Explore ideas", "Découvrir les idées")}</Link>
      </> : register&&!registrationEnabled ? <div className="pv51-notice" role="status"><h2>{t("Registro en preparación", "Registration is being prepared", "Inscription en préparation")}</h2><p>{t("Estamos comprobando el correo de verificación antes de abrir cuentas nuevas. Si ya tienes una cuenta verificada de Patagonia Wings, puedes iniciar sesión. Por ahora no te pediremos una contraseña nueva.", "We are checking verification email delivery before opening new accounts. If you already have a verified Patagonia Wings account, you can sign in. We will not ask for a new password yet.", "Nous vérifions l’envoi des e-mails de confirmation avant d’ouvrir les nouvelles inscriptions. Si vous avez déjà un compte Patagonia Wings vérifié, vous pouvez vous connecter. Aucun nouveau mot de passe n’est demandé pour le moment.")}</p></div> : <>
        <h2>{register ? t("Únete al Community Lab.", "Join the Community Lab.", "Rejoignez le Community Lab.") : t("Bienvenido de nuevo.", "Welcome back.", "Heureux de vous retrouver.")}</h2>
        {register && qaRegistration && <label>{t("Invitación privada QA", "Private QA invitation", "Invitation QA privée")}<input name="invitation" type="password" autoComplete="off" required minLength={32} maxLength={128} /></label>}
        <label>{t("Correo electrónico", "Email", "Adresse e-mail")}<input name="email" type="email" autoComplete="username" required maxLength={254} /></label>
        <label>{t("Contraseña", "Password", "Mot de passe")}<input key={register ? "new" : "current"} name="password" type="password" autoComplete={register ? "new-password" : "current-password"} required minLength={register ? 12 : undefined} maxLength={128} aria-describedby={register ? "pv51-password-help" : undefined} /></label>
        {register && <><p className="pv51-help" id="pv51-password-help">{t("Utiliza al menos 12 caracteres y una contraseña exclusiva. Se requiere verificación por correo; no se crea una suscripción comercial.", "Use at least 12 characters and a unique password. Email verification is required; no marketing subscription is created.", "Utilisez au moins 12 caractères et un mot de passe unique. La vérification par e-mail est requise ; aucun abonnement commercial n’est créé.")}</p><label className="pv51-consent"><input type="checkbox" name="consent" required /><span>{t("Acepto el tratamiento de mis datos de cuenta según la ", "I agree to processing of my account information under the ", "J’accepte le traitement de mes données de compte conformément à la ")}<Link href={localeHref(language, "/privacidad")}>{t("información de privacidad", "privacy notice", "notice de confidentialité")}</Link>.</span></label></>}
        <div className="pv51-trap" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
        <button className="pw4-button pw4-button-primary" disabled={pending} type="submit">{pending ? t("Comprobando…", "Checking…", "Vérification…") : register ? t("Solicitar cuenta verificada", "Request a verified account", "Demander un compte vérifié") : t("Iniciar sesión", "Sign in", "Se connecter")}</button>
      </>}
      <p className="pv51-feedback" aria-live="polite" role="status">{status}</p>
      <Link className="pv51-help" href={localeHref(language, "/soporte")}>{t("¿Necesitas ayuda con tu acceso?", "Need help with access?", "Besoin d’aide pour vous connecter ?")}</Link>
    </form>
  </section>;
}
