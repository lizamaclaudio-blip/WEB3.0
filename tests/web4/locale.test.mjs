import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const moduleUrl = source => 'data:text/javascript;base64,' + Buffer.from(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText).toString('base64');
const localeModule = moduleUrl(await readFile(new URL('../../src/components/web4/locale.ts', import.meta.url), 'utf8'));
const { languages, localeHref, unlocalizedPath } = await import(localeModule);
const loadRoute = async path => import(moduleUrl((await readFile(new URL(path, import.meta.url), 'utf8')).replace('@/components/web4/locale', localeModule)));
const { default: sitemap } = await loadRoute('../../src/app/sitemap.ts');
const { default: robots } = await loadRoute('../../src/app/robots.ts');
const { completeEdition, completeEditionCopy } = await import(moduleUrl(await readFile(new URL('../../src/components/web4/complete-edition.ts', import.meta.url), 'utf8')));
const milestonesModule = moduleUrl(await readFile(new URL('../../src/components/web4/development-milestones.ts', import.meta.url), 'utf8'));
const { developmentMilestones, developmentStatus } = await import(milestonesModule);
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

test('all 18 public locale pages have reciprocal sitemap alternates; previews stay excluded', () => {
  const previous = process.env.VERCEL_ENV;
  try {
    process.env.VERCEL_ENV = 'production';
    const entries = sitemap();
    assert.equal(entries.length, 18);
    assert.equal(new Set(entries.map(entry => entry.url)).size, 18);
    for (const entry of entries) {
      assert.deepEqual(Object.keys(entry.alternates.languages), ['es', 'en', 'fr']);
      for (const alternate of Object.values(entry.alternates.languages)) assert.ok(entries.some(item => item.url === alternate));
    }
    assert.ok(robots().rules.allow.includes('/fr/soporte$'));
    assert.ok(!robots().rules.allow.some(path => path.includes('dispatch')));
    process.env.VERCEL_ENV = 'preview';
    assert.deepEqual(sitemap(), []);
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
  assert.deepEqual(completeEdition.areas.filter(area => area.status === 'implemented_qa').map(area => area.id), ['academy', 'performance', 'aircraft-studio']);
  assert.deepEqual(completeEdition.areas.filter(area => area.status === 'future').map(area => area.id), ['career']);
  assert.deepEqual(Object.keys(completeEditionCopy), languages);
  const expected = {
    es: ['Una licencia', 'implementadas en QA', 'Por anunciar', 'validación real sigue pendiente'],
    en: ['One licence', 'implemented in QA', 'To be announced', 'live validation is pending'],
    fr: ['Une licence', 'implémentés en QA', 'À annoncer', 'validation réelle reste à effectuer'],
  };
  for (const language of languages) {
    const copy = completeEditionCopy[language];
    for (const value of Object.values(copy)) assert.ok(typeof value === 'string' && value.length > 0);
    for (const phrase of expected[language]) assert.ok(Object.values(copy).some(value => value.includes(phrase)), language + ': ' + phrase);
    assert.match(copy.introduction, /Academy.*Performance.*Aircraft Studio/);
    assert.match(copy.waitlistNote, /consentimiento|consent|consentement/);
    assert.doesNotMatch(Object.values(copy).join(' '), /\b(?:USD|EUR|CLP|lifetime|perpetua|perpétuelle)\b|[$€]/i);
    assert.ok(localeHref(language, '/soporte#novedades').endsWith('/soporte#novedades'));
  }
});

test('QA implementation never becomes live verification or a commercial release across ES/EN/FR', () => {
  assert.equal(new Set(developmentMilestones.map(area => area.id)).size, 4);
  for (const area of developmentMilestones) {
    const editionArea = completeEdition.areas.find(item => item.id === area.id);
    const feature = capabilities.find(item => item.id === area.id);
    assert.equal(editionArea?.status, area.status, area.id);
    assert.ok(feature, area.id);
    if (area.id === 'career') {
      assert.equal(area.milestone, 'M33');
      assert.equal(area.status, 'future');
      assert.equal(area.evidence, null);
      assert.equal(area.liveValidation, 'not_applicable');
      assert.equal(feature.status, 'planned');
    } else {
      assert.equal(area.status, 'implemented_qa');
      assert.equal(area.liveValidation, 'pending');
      assert.equal(feature.status, 'validation');
      assert.match(area.evidence, /^M3[12]-[a-z-]+\.md$/);
    }
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
