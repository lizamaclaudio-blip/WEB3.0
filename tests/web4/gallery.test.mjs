import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile, stat } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(new URL('../../src/components/web4/gallery-data.ts', import.meta.url), 'utf8');
const url = 'data:text/javascript;base64,' + Buffer.from(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText).toString('base64');
const { galleryCaptures, galleryGroups } = await import(url);
const provenance = JSON.parse(await readFile(new URL('../../public/vector/current/provenance.json', import.meta.url), 'utf8'));

test('each gallery image has current native WPF provenance, honest evidence and all three translations', async () => {
  assert.equal(galleryCaptures.length, 14);
  assert.deepEqual(galleryGroups.map(group => group.id), ['preparation','dispatch','ground','flight','copilot','landing','journal']);
  assert.equal(new Set(galleryCaptures.map(capture => capture.key)).size, 14);
  assert.equal(provenance.simulatorConnected, false);
  assert.equal(provenance.syntheticFlight, true);
  for (const capture of galleryCaptures) {
    const asset = provenance.captures.find(item => item.key === capture.key);
    assert.ok(asset, capture.key);
    assert.equal(asset.evidence, capture.evidence);
    assert.deepEqual(capture.size, {width:1920,height:1080});
    assert.equal(capture.evidence === 'real', false);
    for (const locale of ['es','en','fr']) {
      assert.ok(capture.title[locale]?.trim());
      assert.ok(capture.description[locale]?.trim());
      assert.ok(capture.tags[locale]?.length);
    }
    const file = await stat(new URL('../../public' + capture.src, import.meta.url));
    assert.equal(file.size, asset.bytes);
    assert.match(asset.sourceSha256, /^[a-f0-9]{64}$/);
  }
});
