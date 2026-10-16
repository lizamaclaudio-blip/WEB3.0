import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const moduleUrl = source => 'data:text/javascript;base64,' + Buffer.from(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText).toString('base64');
const localeModule = moduleUrl(await readFile(new URL('../../src/components/web4/locale.ts', import.meta.url), 'utf8'));
const { languages, localeHref, unlocalizedPath } = await import(localeModule);
const routesModule=moduleUrl(await readFile(new URL('../../src/components/web4/public-routes.ts',import.meta.url),'utf8'));
const publicIdeasStub=moduleUrl('export async function getPublicProposalIds(){return [];}');
const loadRoute = async path => import(moduleUrl((await readFile(new URL(path, import.meta.url), 'utf8')).replace('@/components/web4/locale', localeModule).replace('@/components/web4/public-routes',routesModule).replace('@/lib/web51/public-ideas',publicIdeasStub)));
const { default: sitemap } = await loadRoute('../../src/app/sitemap.ts');
const { default: robots } = await loadRoute('../../src/app/robots.ts');
const { completeEdition, completeEditionCopy } = await import(moduleUrl(await readFile(new URL('../../src/components/web4/complete-edition.ts', import.meta.url), 'utf8')));
const milestonesModule = moduleUrl(await readFile(new URL('../../src/components/web4/development-milestones.ts', import.meta.url), 'utf8'));
const { developmentMilestones, developmentStatus, futureOnlinePlatform } = await import(milestonesModule);
const { capabilities } = await import(moduleUrl((await readFile(new URL('../../src/components/web4/capabilities.ts', import.meta.url), 'utf8')).replace('./development-milestones', milestonesModule)));

test('switching ES, EN and FR keeps the same public page without repeated locale prefixes', () => {
  assert.deepEqual(languages, ['es', 'en', 'fr']);
  for (const [source, expected] of [['/', ''], ['/en', ''], ['/fr', ''], ['/copiloto-vector', '/copiloto-vector'], ['/en/soporte', '/soporte'], ['/fr/condiciones', '/condiciones']]) {
    assert.equal(localeHref('es', unlocalizedPath(source)), expected || '/');
    assert.equal(localeHref('en', unlocalizedPath(source)), '/en' + expected);
    assert.equal(localeHref('fr', unlocalizedPath(source)), '/fr' + expected);
  }
  assert.equal(unlocalizedPath('/enquiries'), '/enquiries');
  assert.equal(localeHref('fr', '/soporte#novedades'), '/fr/soporte#novedades');
});

test('all 36 public locale pages have reciprocal sitemap alternates; previews and private routes stay excluded', async () => {
  const previous = process.env.VERCEL_ENV;
  try {
    process.env.VERCEL_ENV = 'production';
    const entries = await sitemap();
    assert.equal(entries.length, 36);
    assert.equal(new Set(entries.map(entry => entry.url)).size, 36);
    for (const entry of entries) {
      assert.deepEqual(Object.keys(entry.alternates.languages), ['es', 'en', 'fr']);
      for (const alternate of Object.values(entry.alternates.languages)) assert.ok(entries.some(item => item.url === alternate));
    }
    assert.ok(robots().rules.allow.includes('/fr/soporte$'));
    assert.ok(!robots().rules.allow.some(path => path.includes('dispatch')));
    assert.ok(robots().rules.disallow.includes('/fr/comunidad/admin'));
    assert.ok(robots().rules.disallow.includes('/api/'));
    assert.ok(entries.every(entry=>!entry.url.includes('/admin')&&!entry.url.includes('/cuenta')));
    process.env.VERCEL_ENV = 'preview';
    assert.deepEqual(await sitemap(), []);
    assert.equal(robots().rules.disallow, '/');
  } finally {
    if (previous === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = previous;
  }
});

test('COMPLETE presents one future licence in all languages without an active commercial offer', () => {
  assert.equal(completeEdition.name, 'COPILOTO VECTOR COMPLETE');
  assert.equal(completeEdition.licenceCount, 1);
  assert.equal(completeEdition.status, 'planned');
  assert.equal(completeEdition.checkoutEnabled, false);
  assert.equal(completeEdition.price, null);
  assert.deepEqual(completeEdition.areas.filter(area => area.status === 'implemented_qa').map(area => area.id), ['academy', 'performance', 'aircraft-studio', 'career', 'acars']);
  assert.ok(!completeEdition.areas.some(area => area.id === 'career-online'));
  assert.deepEqual(Object.keys(completeEditionCopy), languages);
  const expected = {
    es: ['COMMANDER', 'implementadas en QA', 'Por anunciar', 'validación real sigue pendiente'],
    en: ['COMMANDER', 'implemented in QA', 'To be announced', 'live validation is pending'],
    fr: ['COMMANDER', 'implémentés en QA', 'À annoncer', 'validation réelle reste à effectuer'],
  };
  for (const language of languages) {
    const copy = completeEditionCopy[language];
    for (const value of Object.values(copy)) assert.ok(typeof value === 'string' && value.length > 0);
    for (const phrase of expected[language]) assert.ok(Object.values(copy).some(value => value.includes(phrase)), language + ': ' + phrase);
    assert.match(copy.introduction, /Academy.*Performance.*Aircraft Studio.*Career Local.*ACARS Local/);
    assert.match(copy.licenceSummary, /Career Local.*ACARS Local/);
    assert.match(copy.introduction, /no están disponibles comercialmente|not commercially available|ne sont pas disponibles commercialement/);
    assert.match(copy.waitlistNote, /consentimiento|consent|consentement/);
    assert.doesNotMatch(Object.values(copy).join(' '), /\b(?:USD|EUR|CLP|lifetime|perpetua|perpétuelle)\b|[$€]/i);
    assert.ok(localeHref(language, '/soporte#novedades').endsWith('/soporte#novedades'));
  }
});

test('QA implementation never becomes live verification or a commercial release across ES/EN/FR', () => {
  assert.deepEqual(developmentMilestones.map(area => [area.id, area.milestone]), [['academy', 'M31'], ['performance', 'M31'], ['aircraft-studio', 'M32'], ['career', 'M33'], ['acars', 'M34']]);
  for (const area of developmentMilestones) {
    const editionArea = completeEdition.areas.find(item => item.id === area.id);
    const feature = capabilities.find(item => item.id === area.id);
    assert.equal(editionArea?.status, area.status, area.id);
    assert.ok(feature, area.id);
    assert.equal(area.status, 'implemented_qa');
    assert.equal(area.liveValidation, 'pending');
    assert.equal(feature.status, 'validation');
    assert.match(area.evidence, /^M3[1-4]-[a-z-]+\.md$/);
    for (const language of languages) {
      assert.ok(area.summary[language]?.trim());
      assert.ok(area.detail[language]?.trim());
      assert.ok(area.limitation[language]?.trim());
      assert.ok(feature.detail[language].includes(area.limitation[language]));
      if (area.status === 'implemented_qa') {
        assert.ok(feature.detail[language].includes(developmentStatus.implementedQa[language]));
        assert.match(area.detail[language], /QA/);
        assert.match(area.detail[language], /sin MSFS|without live MSFS|sans MSFS/);
      }
    }
  }
});

test('CAREER and ACARS local claims preserve offline, idempotent and real-validation limits', () => {
  const career = developmentMilestones.find(area => area.id === 'career');
  const acars = developmentMilestones.find(area => area.id === 'acars');
  assert.equal(career.name, 'VECTOR CAREER LOCAL');
  assert.equal(acars.name, 'VECTOR ACARS LOCAL');
  for (const language of languages) {
    assert.match(career.summary[language], /piloto|pilot|pilote/i);
    assert.match(career.detail[language], /PIREP/);
    assert.match(career.detail[language], /sin duplicados|without duplicates|sans doublons/);
    assert.match(career.limitation[language], /créditos virtuales|virtual credits|crédits virtuels/);
    assert.match(acars.detail[language], /DIARIO|LOGBOOK|JOURNAL/);
    assert.match(acars.detail[language], /offline|hors ligne/);
    assert.match(acars.summary[language], /exportación e importación|export\/import/);
    assert.match(acars.limitation[language], /Ningún PIREP se envía fuera|No PIREP leaves|Aucun PIREP ne quitte/);
    for (const area of [career, acars]) {
      assert.match(area.limitation[language], /MSFS real|Live MSFS validation pending|MSFS réel/);
      assert.match(area.limitation[language], /no disponible comercialmente|not commercially available|non disponible commercialement/);
    }
  }
});

test('future CAREER ONLINE and multi-user airlines remain separate from the local single-licence scope', () => {
  const feature = capabilities.find(item => item.id === futureOnlinePlatform.id);
  assert.equal(futureOnlinePlatform.status, 'future');
  assert.equal(futureOnlinePlatform.evidence, null);
  assert.equal(futureOnlinePlatform.liveValidation, 'not_applicable');
  assert.equal(feature.status, 'planned');
  assert.ok(!developmentMilestones.some(item => item.id === futureOnlinePlatform.id));
  assert.ok(!completeEdition.areas.some(item => item.id === futureOnlinePlatform.id));
  for (const language of languages) {
    assert.match(futureOnlinePlatform.summary[language], /multiusuario|multi-user|multiutilisateurs/);
    assert.match(futureOnlinePlatform.summary[language], /no implementado|not implemented|pas encore implémenté/);
    assert.match(futureOnlinePlatform.limitation[language], /Sin fecha ni precio definitivo|No definitive date or price|Sans date ni tarif définitifs/);
    assert.ok(feature.detail[language].includes(futureOnlinePlatform.detail[language]));
  }
});

test('new preparation areas retain their documented simulation and measurement limits in every language', () => {
  const academy = developmentMilestones.find(area => area.id === 'academy');
  const performance = developmentMilestones.find(area => area.id === 'performance');
  const studio = developmentMilestones.find(area => area.id === 'aircraft-studio');
  for (const language of languages) {
    assert.match(academy.limitation[language], /manual|manuel/i);
    for (const speed of ['V1', 'VR', 'V2', 'VREF', 'VAPP']) assert.ok(performance.limitation[language].includes(speed));
    assert.match(performance.limitation[language], /No calcula|does not calculate|Ne calcule/);
    assert.match(studio.summary[language], /persist/);
    assert.match(studio.detail[language], /CARGA Y CABINA|LOAD & CABIN|CHARGEMENT ET CABINE/);
    assert.match(studio.limitation[language], /ilustrativa|illustrative|illustrative/);
    assert.match(studio.limitation[language], /GSX/);
  }
});
