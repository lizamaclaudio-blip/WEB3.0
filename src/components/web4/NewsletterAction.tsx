"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { subscribeNewsletterFragment, type NewsletterLink } from "@/lib/web4/newsletter-fragment";
import { localized, type Language } from "./locale";

const hydrationSubscription = () => () => undefined;

export function NewsletterAction({ language, action }: { language: Language; action: "confirm" | "unsubscribe" }) {
  const t = (es: string, en: string, fr: string) => localized(language, es, en, fr);
  // The server and hydration HTML keep the action disabled. Only the browser
  // reads the fragment; the token never enters server-rendered markup.
  const ready = useSyncExternalStore(hydrationSubscription, () => true, () => false);
  const [token, setToken] = useState("");
  const activeLink = useRef<NewsletterLink | null>(null);
  const [pending, setPending] = useState(false);
  const [complete, setComplete] = useState(false);
  const [status, setStatus] = useState("");
  useEffect(() => subscribeNewsletterFragment(window, (link) => {
    activeLink.current = link;
    setToken(link.token);
    setPending(false);
    setComplete(false);
    setStatus("");
  }, activeLink.current?.token), []);
  const confirmation = action === "confirm";
  return <div className="pw4-form">
    <p>{confirmation
      ? t("Este paso verifica que la dirección de correo es tuya. Abrir el enlace no confirma nada: pulsa el botón para elegir recibir novedades.", "This step verifies that you own the email address. Opening the link confirms nothing: press the button to choose to receive news.", "Cette étape vérifie que l’adresse vous appartient. Ouvrir le lien ne confirme rien : appuyez sur le bouton pour choisir de recevoir les actualités.")
      : t("Pulsa el botón para cancelar las novedades. Esto no elimina tus solicitudes de contacto ni afecta a una licencia.", "Press the button to unsubscribe from news. This does not delete contact requests or affect a licence.", "Appuyez sur le bouton pour vous désinscrire des actualités. Vos demandes de contact et votre licence ne sont pas affectées.")}</p>
    {ready && !token && !complete && <p role="status">{t("El enlace falta o no es válido. Abre de nuevo el enlace de tu correo; los enlaces son personales y caducan.", "The link is missing or invalid. Reopen the link in your email; links are personal and expire.", "Le lien est absent ou invalide. Rouvrez le lien de votre e-mail ; les liens sont personnels et expirent.")}</p>}
    <button className="pw4-button pw4-button-primary" disabled={!ready || !token || pending || complete} onClick={async () => {
      const link = activeLink.current;
      if (!token || pending || complete || !link?.isCurrent() || link.token !== token) return;
      setPending(true); setStatus("");
      try {
        const response = await fetch(confirmation ? "/api/vector/newsletter/confirm" : "/api/vector/unsubscribe", {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: link.token }),
        });
        const result = await response.json();
        if (!link.isCurrent()) return;
        if (response.ok && result.code === (confirmation ? "CONFIRMED" : "UNSUBSCRIBED")) {
          setComplete(true); setToken("");
          setStatus(confirmation ? t("Dirección verificada. Tu inscripción a novedades está confirmada.", "Address verified. Your news subscription is confirmed.", "Adresse vérifiée. Votre inscription aux actualités est confirmée.")
            : t("Suscripción cancelada. No recibirás más novedades.", "You are unsubscribed. You will not receive further news.", "Vous êtes désinscrit. Vous ne recevrez plus d’actualités."));
        } else if (response.status === 410) setStatus(t("El enlace ya se utilizó o caducó. No se ha cambiado ninguna preferencia.", "The link has already been used or has expired. No preference was changed.", "Le lien a déjà été utilisé ou a expiré. Aucune préférence n’a été modifiée."));
        else if (response.status === 429) setStatus(t("Demasiados intentos. Inténtalo más tarde.", "Too many attempts. Please try again later.", "Trop de tentatives. Veuillez réessayer plus tard."));
        else setStatus(t("No se pudo confirmar el cambio. Inténtalo más tarde.", "The change could not be confirmed. Please try again later.", "La modification n’a pas pu être confirmée. Veuillez réessayer plus tard."));
      } catch { if (link.isCurrent()) setStatus(t("No pudimos comprobar el resultado. Revisa la conexión y vuelve a intentarlo.", "We could not verify the result. Check your connection and try again.", "Nous n’avons pas pu vérifier le résultat. Vérifiez votre connexion puis réessayez.")); }
      finally { if (link.isCurrent()) setPending(false); }
    }}>{pending ? t("Procesando…", "Processing…", "Traitement…") : confirmation ? t("Confirmar mi inscripción", "Confirm my subscription", "Confirmer mon inscription") : t("Cancelar mi suscripción", "Unsubscribe from news", "Me désinscrire des actualités")}</button>
    <p role="status" aria-live="polite" className="pw4-form-status">{status}</p>
  </div>;
}
