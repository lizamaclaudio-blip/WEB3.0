import { completeEditionCopy } from "./complete-edition";
import { developmentMilestones, developmentStatus } from "./development-milestones";
import { Action } from "./Marketing";
import { localeHref, localized, type Language } from "./locale";

export function ReleaseStatus({ language }: { language: Language }) {
  const t = (es: string, en: string, fr: string) => localized(language, es, en, fr);
  return <div className="pw4-prose pv44-release">
    <span className="pw4-badge">{t("BETA / EN DESARROLLO", "BETA / IN DEVELOPMENT", "BÊTA / EN DÉVELOPPEMENT")}</span>
    <h2>{t("Desarrollo actual", "Current development", "Développement en cours")}</h2>
    <p>{t("Copiloto Vector es una aplicación Windows x64 en desarrollo activo. La galería muestra sesiones WPF locales reales, con el origen de los datos identificado. Una implementación en QA no representa una versión comercial publicada.", "Copiloto Vector is a Windows x64 application under active development. The gallery shows actual local WPF sessions with the data source labelled. QA implementation does not represent a released commercial version.", "Copiloto Vector est une application Windows x64 en cours de développement. La galerie présente de véritables sessions WPF locales dont les sources de données sont identifiées. Une implémentation en QA ne constitue pas une version commerciale publiée.")}</p>

    <section id="hitos" className="pv44-milestones" aria-labelledby="milestones-heading">
      <h2 id="milestones-heading">{t("Hitos M31–M33", "M31–M33 milestones", "Jalons M31–M33")}</h2>
      <p>{developmentStatus.scopeNote[language]}</p>
      <div className="pv44-milestone-grid">
        {developmentMilestones.map(area => <article key={area.id} className={"pv44-milestone" + (area.status === "future" ? " pv44-milestone-future" : "")}>
          <p className="pv44-milestone-id">{area.milestone} · {area.status === "future" ? developmentStatus.future[language] : developmentStatus.implementedQa[language]}</p>
          <h3>{area.name}</h3>
          {area.liveValidation === "pending" && <p className="pv44-validation-pending">{developmentStatus.livePending[language]}</p>}
          <p>{area.detail[language]}</p><p className="pv44-milestone-limit">{area.limitation[language]}</p>
        </article>)}
      </div>
    </section>

    <h2>{t("Historial y distribución", "Release history and distribution", "Historique et distribution")}</h2>
    <p>{t("Los hitos describen avances de desarrollo, no lanzamientos comerciales. Todavía no hay versiones comerciales públicas que listar. Las notas de versión y las sumas de verificación del instalador aparecerán cuando exista una versión distribuible.", "Milestones describe development progress, not commercial releases. There are no public commercial releases to list yet. Release notes and verified installer checksums will appear when a distributable version is available.", "Les jalons décrivent les avancées du développement, pas des lancements commerciaux. Aucune version commerciale publique n’est encore proposée. Les notes de version et les sommes de contrôle vérifiées de l’installateur seront publiées lorsqu’une version distribuable sera prête.")}</p>
    <h2>{t("Una licencia COMPLETE", "One COMPLETE licence", "Une licence COMPLETE")}</h2>
    <p>{completeEditionCopy[language].licenceSummary}</p>
    <p>{t("No están habilitados un instalador público de Vector, precios ni servicios de licencia. No se aceptan pagos. Las futuras cuentas de producto y recuperación de licencias se diseñarán por separado de los servicios existentes de pilotos.", "No public Vector installer, price or licence service is enabled. No payments are accepted. Future product accounts and licence recovery will be designed separately from existing pilot services.", "Aucun installateur public de Vector, tarif ou service de licence n’est proposé. Aucun paiement n’est accepté. Les futurs comptes produit et la récupération des licences seront conçus séparément des services pilotes existants.")}</p>
    <Action href={localeHref(language, "/soporte#novedades")} primary>{t("Seguir disponibilidad", "Follow availability", "Suivre la disponibilité")}</Action>
  </div>;
}
