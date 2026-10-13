import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const root = process.env.VECTOR_SOURCE_ROOT;
const artwork = process.env.VECTOR_HERO_SOURCE;
if (!root || !artwork) throw new Error('Set VECTOR_SOURCE_ROOT and VECTOR_HERO_SOURCE to owner-provided source paths.');
const output = path.resolve('public/vector');
await mkdir(path.join(output, 'icons'), { recursive: true });
const assets = [
  [artwork, 'hero.webp', 1920],
  [path.join(root, 'artifacts/m26-validation/app-real-inicio.png'), 'overview.webp', 1600],
  [path.join(root, 'artifacts/m23-3-validation/m23-3-app-real-despacho.png'), 'dispatch.webp', 1600],
  [path.join(root, 'artifacts/m26-validation/app-real-vector-ground.png'), 'cabin.webp', 1600],
  [path.join(root, 'artifacts/ofp-times/live/beta-Copilot.png'), 'monitor.webp', 1600],
  [path.join(root, 'artifacts/m23-6-validation/m23-6-operaciones-observado.png'), 'operations.webp', 1600],
  [path.join(root, 'artifacts/m24-validation/m24-copiloto.png'), 'copilot.webp', 1600],
  [path.join(root, 'artifacts/ofp-times/live/beta-Journal.png'), 'journal.webp', 1600],
  [path.join(root, 'ProjectVector.Desktop/Assets/Aircraft/king-air-350-cabin.png'), 'king-air-cabin.webp', 1440],
];
for (const [source, name, width] of assets) {
  await sharp(source).resize({ width, withoutEnlargement: true }).webp({ quality: 84 }).toFile(path.join(output, name));
}
for (const [source, name] of [['11_Monitor_en_vivo', 'monitor'], ['12_Copiloto', 'copilot']]) {
  await sharp(path.join(root, 'ProjectVector.Desktop/Assets/Icons/Modulos', `${source}.png`))
    .resize({ width: 300 }).webp({ quality: 88 }).toFile(path.join(output, 'icons', `${name}.webp`));
}
console.log('Owner-provided artwork and real WPF captures optimized.');

