import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const file = path.join(root, 'src', 'components', 'dispatch', 'DispatchPageShell.tsx');

if (!fs.existsSync(file)) {
  console.error('[error] No existe src/components/dispatch/DispatchPageShell.tsx');
  process.exit(1);
}

let content = fs.readFileSync(file, 'utf8');
const before = content;

const replacements = [
  ['Rutas oficiales de escuela', 'Ruta oficial'],
  ['Rutas oficiales escuela', 'Ruta oficial'],
  ['Ruta oficial escuela', 'Ruta oficial'],
  ['Ruta oficial de escuela', 'Ruta oficial'],
  ['Rutas de entrenamiento detectadas', 'Rutas oficiales detectadas'],
  ['rutas oficiales de escuela', 'rutas oficiales'],
  ['ruta oficial escuela', 'ruta oficial'],
  ['ruta oficial de escuela', 'ruta oficial'],
  ['Tu rango CADET solo permite rutas oficiales de escuela. Las rutas comerciales se habilitaran en rangos superiores.', 'Tu rango CADET puede operar rutas oficiales habilitadas para su etapa. Las rutas comerciales se habilitaran en rangos superiores.'],
  ['Tu rango CADET solo permite rutas oficiales de escuela. Las rutas comerciales se habilitarán en rangos superiores.', 'Tu rango CADET puede operar rutas oficiales habilitadas para su etapa. Las rutas comerciales se habilitarán en rangos superiores.'],
];

for (const [from, to] of replacements) {
  content = content.split(from).join(to);
}

// Limpieza preventiva de frases duplicadas si quedaron por concatenaciones.
content = content
  .replace(/Ruta oficial\s+oficial/g, 'Ruta oficial')
  .replace(/Rutas oficiales\s+oficiales/g, 'Rutas oficiales');

const mojibake = ['ðŸ', 'âœ', 'âš', 'Ã', 'Â', '�'];
const foundMojibake = mojibake.filter((token) => content.includes(token));
if (foundMojibake.length > 0) {
  console.error(`[error] Mojibake detectado en DispatchPageShell.tsx: ${foundMojibake.join(', ')}`);
  process.exit(1);
}

if (content === before) {
  console.log('[warn] No se encontraron textos para reemplazar. El archivo puede estar ya corregido.');
} else {
  fs.writeFileSync(file, content, 'utf8');
  console.log('[ok] Textos de Ruta oficial normalizados en DispatchPageShell.tsx');
}
