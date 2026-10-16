import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const moduleUrl = source => 'data:text/javascript;base64,' + Buffer.from(ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React },
}).outputText).toString('base64');
const galleryModule = moduleUrl(await readFile(new URL('../../src/components/web4/gallery-data.ts', import.meta.url), 'utf8'));
const localeModule = moduleUrl(await readFile(new URL('../../src/components/web4/locale.ts', import.meta.url), 'utf8'));
const source = (await readFile(new URL('../../src/components/web4/CinematicDemo.tsx', import.meta.url), 'utf8'))
  .replace('"next/image"', JSON.stringify(moduleUrl('export default function Image() { return null; }')))
  .replace('"react"', JSON.stringify(pathToFileURL(require.resolve('react')).href))
  .replace('"./gallery-data"', JSON.stringify(galleryModule))
  .replace('"./locale"', JSON.stringify(localeModule));
const { demoScenes, demoSceneSeconds, demoDuration, demoSceneIndex, advanceDemo, demoNavigationIndex } = await import(moduleUrl(source));
const { galleryCaptures } = await import(galleryModule);

test('the screenshot tour runs for 36 seconds with complete chapter boundaries', () => {
  assert.equal(demoScenes.length, 9);
  assert.equal(demoDuration, 36);
  assert.equal(demoSceneSeconds, 4);
  for (let scene = 0; scene < demoScenes.length; scene++) {
    assert.equal(demoSceneIndex(scene * 4), scene);
    assert.equal(demoSceneIndex(scene * 4 + 3.999), scene);
  }
  assert.equal(demoSceneIndex(36), 8);
  assert.equal(demoSceneIndex(999), 8);
  assert.equal(demoSceneIndex(-5), 0);
  assert.equal(demoSceneIndex(Number.NaN), 0);
});

test('playback preserves a paused position and stops once at the end', () => {
  const paused = { seconds: 14.2, playing: false };
  assert.equal(advanceDemo(paused, 0.1), paused);
  assert.deepEqual(advanceDemo({ seconds: 35.9, playing: true }, 0.2), { seconds: 36, playing: false });
  assert.deepEqual(advanceDemo({ seconds: 4, playing: true }, 0.1), { seconds: 4.1, playing: true });
  assert.equal(advanceDemo(paused, Number.NaN), paused);
});

test('a delayed timer cannot skip chapters or continue indefinitely', () => {
  assert.deepEqual(advanceDemo({ seconds: 5, playing: true }, 90), { seconds: 5.3, playing: true });
  const playing = { seconds: 5, playing: true };
  assert.equal(advanceDemo(playing, -10), playing);
  assert.equal(advanceDemo(playing, Number.POSITIVE_INFINITY), playing);
  let current = { seconds: 0, playing: true };
  for (let tick = 0; tick < 400; tick++) current = advanceDemo(current, 0.1);
  assert.deepEqual(current, { seconds: 36, playing: false });
});

test('chapter keyboard navigation follows the focused chapter even when playback is elsewhere', () => {
  const activeScene = demoSceneIndex(0);
  const focusedChapter = 4;
  assert.equal(activeScene, 0);
  assert.equal(demoNavigationIndex('ArrowRight', focusedChapter), 5);
  assert.equal(demoNavigationIndex('ArrowLeft', focusedChapter), 3);
  assert.notEqual(demoNavigationIndex('ArrowRight', focusedChapter), demoNavigationIndex('ArrowRight', activeScene));
  assert.equal(demoNavigationIndex('End', focusedChapter), 8);
  assert.equal(demoNavigationIndex('Home', 8), 0);
  assert.equal(demoNavigationIndex('ArrowRight', 8), 0);
  assert.equal(demoNavigationIndex('ArrowLeft', 0), 8);
  assert.equal(demoNavigationIndex('Escape', 8), null, 'Escape remains available to the native dialog');
  assert.equal(demoNavigationIndex('Tab', 4), null, 'Tab remains available for native focus navigation');
  assert.equal(demoNavigationIndex(' ', 4), null, 'Space remains available to activate the focused chapter button');
});

test('all scenes have three-language copy and screenshot scenes point to QA evidence', () => {
  assert.deepEqual(demoScenes.map(scene => scene.capture).filter(Boolean), ['home', 'dispatch', 'cabin', 'copilot', 'monitor', 'landing', 'career']);
  for (const scene of demoScenes) {
    for (const language of ['es', 'en', 'fr']) {
      assert.ok(scene.title[language]?.trim());
      assert.ok(scene.description[language]?.trim());
      assert.doesNotMatch(scene.title[language] + scene.description[language], /\bM\d+(?:\.\d+)?\b/);
    }
    if (scene.capture) {
      const capture = galleryCaptures.find(capture => capture.key === scene.capture);
      assert.ok(capture, 'Missing verified screenshot: ' + scene.capture);
      assert.equal(capture.evidence, 'fixture', scene.capture);
      assert.ok(capture.src.startsWith('/vector/'));
    }
  }
});
