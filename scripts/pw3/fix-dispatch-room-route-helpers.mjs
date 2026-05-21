import fs from 'node:fs';
import path from 'node:path';

const filePath = path.join(process.cwd(), 'src', 'components', 'dispatch', 'DispatchRoomClient.tsx');

if (!fs.existsSync(filePath)) {
  console.error(`[error] No existe ${filePath}`);
  process.exit(1);
}

let source = fs.readFileSync(filePath, 'utf8');

const helpers = `
function isOfficialRouteCategory(category?: string | null) {
  const normalized = (category ?? '').trim().toUpperCase();

  if (!normalized) return true;

  const excludedCategories = new Set([
    'CHARTER',
    'CHARTER_OFFICIAL',
    'CARGO',
    'CARGO_OFFICIAL',
    'TRANSFER',
    'AIRCRAFT_TRANSFER',
    'TRASLADO',
    'PILOT_REPOSITION',
    'REPOSITION',
    'REPOSITIONING',
  ]);

  return !excludedCategories.has(normalized);
}

function routeCategoryDisplay(category?: string | null) {
  const normalized = (category ?? '').trim().toUpperCase();

  if (!normalized) return 'Ruta oficial';

  if (
    normalized === 'TRAINING' ||
    normalized === 'SCHOOL' ||
    normalized === 'CADET' ||
    normalized === 'ACADEMY' ||
    normalized === 'SCHOOL_OFFICIAL_ROUTE'
  ) {
    return 'Ruta oficial';
  }

  if (
    normalized === 'COMMERCIAL' ||
    normalized === 'PASSENGER' ||
    normalized === 'STANDARD' ||
    normalized === 'OFFICIAL' ||
    normalized === 'COMMERCIAL_OFFICIAL_ROUTE'
  ) {
    return 'Ruta oficial';
  }

  return normalizeText(category, 'Ruta oficial');
}
`;

if (!source.includes('function isOfficialRouteCategory(')) {
  const marker = 'function getModeFromSearch';
  if (!source.includes(marker)) {
    console.error('[error] No se encontró punto de inserción function getModeFromSearch.');
    process.exit(1);
  }
  source = source.replace(marker, `${helpers}\n${marker}`);
}

// Limpieza opcional: si la función legacy quedó sin uso tras el fix de hidratación, la dejamos para no arriesgar cambios grandes.
// El warning no bloquea build; los helpers anteriores corrigen los errores TS.

fs.writeFileSync(filePath, source, 'utf8');
console.log('[ok] Helpers isOfficialRouteCategory y routeCategoryDisplay disponibles en DispatchRoomClient.');
