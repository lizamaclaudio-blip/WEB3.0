import sharp from 'sharp';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

const captureRoot = path.resolve(process.env.VECTOR_CAPTURE_ROOT || 'artifacts/web41-wpf/fixture-captures');
const sourceRoot = process.env.VECTOR_SOURCE_ROOT;
if (!sourceRoot) throw new Error('Set VECTOR_SOURCE_ROOT to the read-only desktop checkout.');
const captureManifest = JSON.parse(await readFile(path.join(captureRoot, 'capture-manifest.json'), 'utf8'));
if (captureManifest.SimulatorConnected !== false) throw new Error('Only isolated offline captures are approved.');
const assets = [
  ['01-home', 'home'], ['02-dispatch', 'dispatch'], ['03-monitor', 'monitor'],
  ['04-weather', 'weather'], ['05-cabin', 'cabin'], ['06-ground', 'ground'],
  ['07-operations', 'operations'], ['08-copilot', 'copilot'], ['09-journal', 'journal'],
  ['10-replay', 'replay'], ['11-landing', 'landing'], ['12-settings', 'settings'],
  ['13-report', 'report'], ['14-statistics', 'statistics'],
];
const output = path.resolve('public/vector/current');
await mkdir(path.join(output, 'icons'), { recursive: true });
const published = [];
for (const [source, key] of assets) {
  const evidence = captureManifest.Captures.find(item => item.File === source + '.png');
  if (!evidence?.NewCapture || evidence.Width !== 1920 || evidence.Height !== 1080) throw new Error('Missing native capture: ' + key);
  const bytes = await readFile(path.join(captureRoot, source + '.png'));
  const metadata = await sharp(bytes).metadata();
  if (metadata.width !== 1920 || metadata.height !== 1080) throw new Error('Unexpected screenshot size: ' + key);
  const webp = await sharp(bytes).webp({ quality: 90, effort: 5 }).toBuffer();
  await writeFile(path.join(output, key + '.webp'), webp);
  published.push({
    key, file: key + '.webp', original: source + '.png', width: 1920, height: 1080,
    captureMode: evidence.Mode, evidence: key === 'settings' ? 'offline' : 'fixture',
    sourceSha256: createHash('sha256').update(bytes).digest('hex'),
    bytes: webp.length, license: 'Owner-authorized original WPF screenshot',
  });
}
const iconPaths = [
  ['Modulos/11_Monitor_en_vivo.png', 'monitor'], ['Despacho/01_OFP_Plan_de_vuelo.png', 'ofp'],
  ['Despacho/04_Pasajeros.png', 'passengers'], ['Despacho/03_Aeropuerto.png', 'airport'],
  ['Modulos/12_Copiloto.png', 'copilot'], ['Despacho/08_Horario.png', 'clock'],
];
for (const [source, key] of iconPaths) {
  await sharp(path.join(sourceRoot, 'ProjectVector.Desktop/Assets/Icons', source))
    .resize({ width: 176, height: 176, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 90 }).toFile(path.join(output, 'icons', key + '.webp'));
}
await writeFile(path.join(output, 'provenance.json'), JSON.stringify({
  product: 'Copiloto Vector', screenshots: 'Authentic native WPF renderings',
  sourceLanguage: 'es', syntheticFlight: true, simulatorConnected: false,
  newCaptures: true, noExistingFlightDataChanged: true,
  privateDiagnosticLabelsHiddenBeforeRendering: true,
  icons: 'Owner-authorized M26 original artwork; same desktop identity',
  captures: published,
}, null, 2));
console.log(JSON.stringify({ captures: published.length, nativeSize: '1920x1080', totalWebpBytes: published.reduce((n, item) => n + item.bytes, 0), output: 'public/vector/current' }));
