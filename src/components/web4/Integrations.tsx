import Link from './PublicLink';
import {localized,localeHref,type Language} from './locale';

export function Integrations({language}:{language:Language}){
 const t=(es:string,en:string,fr:string)=>localized(language,es,en,fr);
 const goals=[
  t('Consultar el historial de comunicaciones ATC y del piloto mediante SAPI.','Retrieve ATC and pilot communication history through SAPI.','Consulter l’historique des communications ATC et pilote via SAPI.'),
  t('Mostrar transcripciones persistentes bajo STREAMER BAR hasta la respuesta del piloto.','Display persistent transcripts below STREAMER BAR until the pilot responds.','Afficher les transcriptions sous STREAMER BAR jusqu’à la réponse du pilote.'),
  t('Identificar cambios de pista, aproximación, altitud y frecuencia para actualizar el contexto.','Identify runway, approach, altitude and frequency changes to update flight context.','Identifier les changements de piste, d’approche, d’altitude et de fréquence pour actualiser le contexte.'),
  t('Facilitar readbacks y conservar comunicaciones relevantes en DIARIO y FLIGHT DEBRIEF.','Support readbacks and retain relevant communications in DIARIO and FLIGHT DEBRIEF.','Faciliter les readbacks et conserver les communications pertinentes dans DIARIO et FLIGHT DEBRIEF.'),
 ];
 return <div className="pw4-wrap pw4-section">
  <p className="pw4-eyebrow">PATAGONIA WINGS · {t('DESARROLLO E INTEGRACIONES','DEVELOPMENT & INTEGRATIONS','DÉVELOPPEMENT ET INTÉGRATIONS')}</p>
  <h1>{t('Un copiloto. Un ecosistema abierto.','One companion. An open ecosystem.','Un copilote. Un écosystème ouvert.')}</h1>
  <p className="pv51-notice">{t('PRELANZAMIENTO · Release candidate privada · Sin venta ni descarga comercial.','PRE-LAUNCH · Private release candidate · No commercial sales or downloads.','PRÉLANCEMENT · Release candidate privée · Aucune vente ni téléchargement commercial.')}</p>
  <p>{t('COPILOTO VECTOR, desarrollado por Patagonia Wings, es una aplicación Windows que reúne planificación, contexto operacional y análisis para pilotos de Microsoft Flight Simulator 2020/2024. La compatibilidad y las capacidades se validan por simulador y aeronave.','Developed by Patagonia Wings, COPILOTO VECTOR is a Windows desktop companion that brings planning, operational context and analysis together for Microsoft Flight Simulator 2020/2024 pilots. Compatibility and capabilities are validated per simulator and aircraft.','Développé par Patagonia Wings, COPILOTO VECTOR est un compagnon Windows qui réunit planification, contexte opérationnel et analyse pour les pilotes de Microsoft Flight Simulator 2020/2024. La compatibilité et les fonctions sont validées par simulateur et aéronef.')}</p>
  <section className="pw4-section" aria-labelledby="vector-tools"><h2 id="vector-tools">{t('Desarrollo propio, demostrable.','Our own demonstrable development.','Un développement propre et démontrable.')}</h2>
   <p>STREAMER BAR · LIVE PANEL · GSX AUTO SYNC · DESPACHO / SimBrief · DIARIO · ACARS LOCAL · CAREER LOCAL · FLIGHT DEBRIEF</p>
   <p>{t('Pantallas de vuelo para varios monitores, sincronización de servicios GSX, OFP planificado, registro local y revisión posterior al vuelo. Implementaciones y pruebas internas disponibles; no equivalen a validación universal en MSFS.','Multi-monitor flight displays, GSX ground-service synchronization, planned OFP, local logging and post-flight review. Implementations and internal tests exist; they do not imply universal MSFS validation.','Affichages de vol multi-écrans, synchronisation des services GSX, OFP planifié, journal local et analyse après vol. Des implémentations et tests internes existent ; ils ne constituent pas une validation universelle dans MSFS.')}</p>
   <Link className="pw4-button" href={localeHref(language,'/copiloto-vector#galeria')}>{t('Ver capturas auténticas','View authentic screenshots','Voir les captures authentiques')}</Link>
   <p>TAKEOFF · HORIZON · COMMANDER</p><Link className="pw4-button" href={localeHref(language,'/ediciones')}>{t('Explorar las ediciones','Explore editions','Découvrir les éditions')}</Link>
  </section>
  <section className="pw4-section" aria-labelledby="atc-link"><p className="pw4-eyebrow">VECTOR ATC LINK</p><h2 id="atc-link">Planned SayIntentions Integration</h2>
   <p className="pv51-notice">{t('PLANIFICADA · Sujeta a aprobación y disponibilidad de API.','PLANNED · Subject to approval and API availability.','PLANIFIÉE · Sous réserve d’approbation et de disponibilité de l’API.')}</p>
   <ul>{goals.map(goal=><li key={goal}>{goal}</li>)}</ul>
   <p>{t('Las instrucciones ATC permanecerán como asistencia al piloto. La integración propuesta no transmitirá respuestas ni controlará sistemas del avión sin autorización apropiada del piloto.','ATC instructions will remain advisory. The proposed integration will not transmit responses or control aircraft systems without appropriate pilot authorization.','Les instructions ATC resteront une assistance au pilote. L’intégration proposée ne transmettra pas de réponses et ne commandera pas les systèmes de l’avion sans autorisation appropriée du pilote.')}</p>
   <p>{t('No existe una asociación oficial ni una integración aprobada con SayIntentions.AI. La arquitectura admite adaptadores reemplazables y conserva el soporte genérico.','There is no official partnership or approved integration with SayIntentions.AI. The architecture supports replaceable adapters and retains generic support.','Il n’existe ni partenariat officiel ni intégration approuvée avec SayIntentions.AI. L’architecture prévoit des adaptateurs interchangeables et conserve le support générique.')}</p>
  </section>
  <section className="pw4-section" id="contacto-empresarial"><h2>{t('Hablemos de integraciones.','Let’s talk integrations.','Parlons intégrations.')}</h2>
   <p>{t('Contacto para empresas, desarrolladores y alianzas técnicas.','Contact for companies, developers and technical partnerships.','Contact pour entreprises, développeurs et collaborations techniques.')}</p>
   <a className="pw4-button pw4-button-primary" href="mailto:patagonia@patagoniaw.com?subject=COPILOTO%20VECTOR%20-%20Developer%20contact">patagonia@patagoniaw.com</a>
   <p>{t('El buzón empresarial está operativo. El enlace abre tu cliente de correo; no promete respuestas ni confirmaciones automáticas.','The business mailbox is operational. This link opens your email client; it does not promise responses or automatic confirmations.','La boîte professionnelle est opérationnelle. Ce lien ouvre votre client e-mail ; il ne promet ni réponse ni confirmation automatique.')}</p>
  </section>
 </div>;
}
