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
