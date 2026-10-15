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
  assert.deepEqual(completeEdition.areas.filter(area => area.status === 'planned').map(area => area.name), ['Academy', 'Performance']);
  assert.deepEqual(Object.keys(completeEditionCopy), languages);
  const expected = {
    es: ['Una licencia', 'Aún no disponible', 'Por anunciar', 'implementadas y validadas'],
    en: ['One licence', 'Not yet available', 'To be announced', 'implemented and validated'],
    fr: ['Une licence', 'Pas encore disponible', 'À annoncer', 'implémentés et validés'],
  };
  for (const language of languages) {
    const copy = completeEditionCopy[language];
    for (const value of Object.values(copy)) assert.ok(typeof value === 'string' && value.length > 0);
    for (const phrase of expected[language]) assert.ok(Object.values(copy).some(value => value.includes(phrase)), language + ': ' + phrase);
    assert.match(copy.introduction, /Academy.*Performance/);
    assert.match(copy.waitlistNote, /consentimiento|consent|consentement/);
    assert.doesNotMatch(Object.values(copy).join(' '), /\b(?:USD|EUR|CLP|lifetime|perpetua|perpétuelle)\b|[$€]/i);
    assert.ok(localeHref(language, '/soporte#novedades').endsWith('/soporte#novedades'));
  }
});
