import sharp from 'sharp';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

const root = process.env.VECTOR_QA_TOUR_ROOT;
if (!root) throw new Error('Set VECTOR_QA_TOUR_ROOT to the visually verified 1616x868 M28/M29 QA tour.');
const output = path.resolve('public/vector/m29');
await mkdir(output, { recursive: true });
const selected = [
  ['02-inicio-sesion-1616x868.png', 'home'],
  ['04-despacho-1616x868.png', 'dispatch'],
  ['07-operaciones-1616x868.png', 'operations'],
  ['08-copiloto-1616x868.png', 'copilot'],
  ['17-configuracion-1616x868.png', 'settings'],
];
const captures = [];
for (const [source, key] of selected) {
  const bytes = await readFile(path.join(root, source));
  const metadata = await sharp(bytes).metadata();
  if (metadata.width !== 1616 || metadata.height !== 868) throw new Error('Unexpected native dimensions: ' + source);
  // Preserve all native pixels, including QA banner and map attribution.
  const webp = await sharp(bytes).webp({ quality: 92, effort: 5 }).toBuffer();
  await writeFile(path.join(output, key + '.webp'), webp);
  captures.push({ key, file: key + '.webp', original: source,
    width: metadata.width, height: metadata.height, sourceLanguage: 'en',
    evidence: 'fixture', captureMode: 'Native WPF QA tour; virtual adapters, synthetic data',
    sourceSha256: createHash('sha256').update(bytes).digest('hex'),
    assetSha256: createHash('sha256').update(webp).digest('hex'), bytes: webp.length,
    license: 'Owner-authorized original WPF screenshot',
    ...(key === 'dispatch' ? { mapCredit: '© OpenStreetMap contributors', mapLicense: 'https://www.openstreetmap.org/copyright' } : {}),
  });
}
await writeFile(path.join(output, 'provenance.json'), JSON.stringify({
  product: 'Copiloto Vector', source: 'M28 QA tour with partial M29 interface',
  sourceLanguage: 'en', simulatorConnected: false, syntheticFlight: true,
  newCaptures: false, reusedVerifiedQaCaptures: true,
  contentAltered: false, privatePathsPresent: false,
  excluded: 'Later journal screenshots expose a private diagnostic path; earlier clean M27.2 captures remain in the gallery.',
  captures,
}, null, 2));
console.log(JSON.stringify({ captures: captures.length, bytes: captures.reduce((sum, item) => sum + item.bytes, 0), nativeSize: '1616x868' }));
