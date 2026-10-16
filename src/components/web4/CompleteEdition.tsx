import Link from "next/link";
import { completeEdition, completeEditionCopy } from "./complete-edition";
import { developmentMilestones, developmentStatus, futureOnlinePlatform } from "./development-milestones";
import { Glyph } from "./Glyph";
import { localeHref, type Language } from "./locale";
import { modules } from "./modules";

export function CompleteEdition({ language }: { language: Language }) {
  const copy = completeEditionCopy[language];
  return <section className="pw4-section pv43-complete" id="complete" aria-labelledby="complete-heading">
    <div className="pw4-wrap">
      <div className="pw4-section-header">
        <div><p className="pw4-eyebrow"><span className="pw4-dot" />{copy.label}</p><h2 id="complete-heading">{copy.title}</h2></div>
        <p>{copy.introduction}</p>
      </div>
      <div className="pv43-edition-grid">
        <div className="pv43-edition-scope" role="group" aria-label={copy.scopeTitle}>
          <article className="pv43-edition-local">
            <div className="pv43-edition-area-head"><Glyph name="monitor" size={26} /><span className="pv43-edition-state">{copy.development}</span></div>
            <h3>{copy.localTitle}</h3><p>{copy.localDescription}</p>
            <ul className="pv43-edition-modules">{modules.map(module => <li key={module.id}><Glyph name="check" size={13} />{module[language][0]}</li>)}</ul>
          </article>
          <div className="pv43-edition-future">
            {developmentMilestones.map(area => <article key={area.id}>
              <p className="pv43-edition-state">{area.milestone} · {developmentStatus.implementedQa[language]}</p>
              <h3>{area.name}</h3><p>{area.summary[language]}</p>
              {area.liveValidation === "pending" && <p className="pv44-validation-pending">{developmentStatus.livePending[language]}</p>}
            </article>)}
          </div>
          <p className="pv44-validation-note">{copy.validationNote}</p>
          <p className="pv44-validation-note">{futureOnlinePlatform.name} · {developmentStatus.future[language]}. {futureOnlinePlatform.summary[language]} {futureOnlinePlatform.limitation[language]}</p>
        </div>
        <aside className="pv43-edition-card" aria-label={completeEdition.name}>
          <div className="pv43-edition-wordmark"><Glyph name="mountain" size={31} /><span>COPILOTO VECTOR<strong>COMMANDER</strong></span></div>
          <div className="pv43-edition-price"><span>{copy.priceLabel}</span><strong>{copy.pricePending}</strong><p>{copy.pricingNote}</p></div>
          <Link className="pw4-button pw4-button-primary" href={localeHref(language, "/soporte#novedades")}>{copy.waitlist}<Glyph name="arrow" size={18} /></Link>
          <p className="pv43-edition-waitlist-note">{copy.waitlistNote}</p>
          <Link className="pw4-text-link" href={localeHref(language, "/versiones#hitos")}>{copy.statusLink}<Glyph name="arrow" size={16} /></Link>
        </aside>
      </div>
    </div>
  </section>;
}
