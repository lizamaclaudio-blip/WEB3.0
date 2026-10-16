import { Action, Eyebrow, Shell } from "./Marketing";
import { NewsletterAction } from "./NewsletterAction";
import { localeHref, localized, type Language } from "./locale";

export function NewsletterPage({ language, action }: { language: Language; action: "confirm" | "unsubscribe" }) {
  const t = (es: string, en: string, fr: string) => localized(language, es, en, fr);
  return <Shell language={language}><section className="pw4-section"><div className="pw4-wrap pw4-information">
    <Eyebrow>COPILOTO VECTOR</Eyebrow>
    <h1>{action === "confirm" ? t("Confirma tus novedades.", "Confirm your news subscription.", "Confirmez votre inscription.") : t("Tus novedades, tu decisión.", "Your news. Your choice.", "Vos actualités, votre choix.")}</h1>
    <NewsletterAction language={language} action={action} />
    <Action href={localeHref(language, "/soporte")}>{t("Volver a soporte", "Back to support", "Retour à l’assistance")}</Action>
  </div></section></Shell>;
}
