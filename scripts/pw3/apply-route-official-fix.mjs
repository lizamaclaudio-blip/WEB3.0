import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const candidateDirs = [
  'src/components/dispatch',
  'src/components/dashboard',
  'src/app/dispatch',
  'src/app/dashboard',
];

const textFiles = [];
for (const dir of candidateDirs) {
  const abs = path.join(root, dir);
  if (!fs.existsSync(abs)) continue;
  walk(abs);
}

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
      continue;
    }
    if (/\.(tsx|ts|jsx|js|css|module\.css)$/.test(entry.name)) {
      textFiles.push(full);
    }
  }
}

const replacements = [
  // Visible headings / labels
  [/Itinerario oficial de aerolínea/g, 'Ruta oficial de aerolínea'],
  [/ITINERARIO OFICIAL DE AEROLÍNEA/g, 'RUTA OFICIAL DE AEROLÍNEA'],
  [/ITINERARIO OFICIAL DE AEROLINEA/g, 'RUTA OFICIAL DE AEROLINEA'],
  [/Itinerario oficial/g, 'Ruta oficial'],
  [/ITINERARIO OFICIAL/g, 'RUTA OFICIAL'],
  [/itinerario oficial/g, 'ruta oficial'],

  // Explanatory text
  [/Tu rango ([A-Z_]+) aún no permite vuelos oficiales de itinerario\./g, 'Tu rango $1 aún no permite operar rutas oficiales de aerolínea.'],
  [/Tu rango ([A-Z_]+) aun no permite vuelos oficiales de itinerario\./g, 'Tu rango $1 aún no permite operar rutas oficiales de aerolínea.'],
  [/Tu rango ([A-Z_]+) aún no permite itinerario oficial\./g, 'Tu rango $1 aún no permite operar rutas oficiales de aerolínea.'],
  [/Tu rango ([A-Z_]+) aun no permite itinerario oficial\./g, 'Tu rango $1 aún no permite operar rutas oficiales de aerolínea.'],
  [/vuelos oficiales de itinerario/g, 'rutas oficiales de aerolínea'],
  [/vuelos oficiales de aerolinea/g, 'rutas oficiales de aerolínea'],
  [/vuelos oficiales de aerolínea/g, 'rutas oficiales de aerolínea'],
  [/operar itinerarios oficiales/g, 'operar rutas oficiales de aerolínea'],
  [/operar itinerario oficial/g, 'operar rutas oficiales de aerolínea'],

  // Buttons / status
  [/Confirmar itinerario/g, 'Confirmar ruta oficial'],
  [/Crear itinerario oficial/g, 'Crear reserva oficial'],
  [/Reservar itinerario/g, 'Reservar ruta oficial'],
  [/Itinerario bloqueado/g, 'Ruta oficial bloqueada'],
  [/itinerario bloqueado/g, 'ruta oficial bloqueada'],

  // Section grouping
  [/Reservar Vuelos Regulares/g, 'Rutas oficiales de aerolínea'],
  [/Reservar vuelos regulares/g, 'Rutas oficiales de aerolínea'],
  [/Vuelo regular/g, 'Ruta oficial'],
  [/vuelo regular/g, 'ruta oficial'],
];

const mojibake = ['ðŸ', 'âœ', 'âš', 'Ã', 'Â', '�'];
let changed = [];
let warnings = [];

for (const file of textFiles) {
  const before = fs.readFileSync(file, 'utf8');
  let after = before;
  for (const [pattern, replacement] of replacements) {
    after = after.replace(pattern, replacement);
  }

  // Keep internal enum values intact. Only clean accidental duplicate wording.
  after = after.replace(/Ruta oficial disponible/g, 'Selección de ruta oficial');
  after = after.replace(/Ruta oficial desde tu ubicación/g, 'Ruta oficial desde tu ubicación operacional');

  if (after !== before) {
    fs.writeFileSync(file, after, 'utf8');
    changed.push(path.relative(root, file));
  }

  const content = fs.readFileSync(file, 'utf8');
  const found = mojibake.filter((bad) => content.includes(bad));
  if (found.length) {
    warnings.push(`${path.relative(root, file)}: ${found.join(', ')}`);
  }
}

console.log('[ok] Revisión de texto Ruta oficial completada.');
if (changed.length) {
  console.log('[ok] Archivos ajustados:');
  for (const file of changed) console.log(` - ${file}`);
} else {
  console.log('[warn] No se encontraron textos de Itinerario oficial para reemplazar.');
}

if (warnings.length) {
  console.log('[warn] Posible mojibake detectado:');
  for (const warning of warnings) console.log(` - ${warning}`);
  process.exitCode = 1;
} else {
  console.log('[ok] Sin mojibake detectado en archivos revisados.');
}
