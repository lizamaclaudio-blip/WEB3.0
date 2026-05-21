import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const target = path.join(root, 'src', 'components', 'dispatch', 'DispatchPageShell.tsx');

if (!fs.existsSync(target)) {
  console.error(`[error] No existe ${target}`);
  process.exit(1);
}

let source = fs.readFileSync(target, 'utf8');
const original = source;

function ensureImport(text) {
  if (text.includes('@/components/ui/IcaoFlagBadge') || text.includes('IcaoFlagBadge from')) {
    return text;
  }

  const importLine = 'import IcaoFlagBadge from "@/components/ui/IcaoFlagBadge";\n';

  if (text.startsWith('"use client";') || text.startsWith("'use client';")) {
    const firstNewline = text.indexOf('\n');
    return text.slice(0, firstNewline + 1) + importLine + text.slice(firstNewline + 1);
  }

  const importMatch = text.match(/import[\s\S]*?;\n/);
  if (importMatch?.index !== undefined) {
    const insertAt = importMatch.index;
    return text.slice(0, insertAt) + importLine + text.slice(insertAt);
  }

  return importLine + text;
}

function removeFunctionDeclaration(text, name) {
  const marker = `function ${name}`;
  const start = text.indexOf(marker);
  if (start < 0) return text;

  const open = text.indexOf('{', start);
  if (open < 0) return text;

  let depth = 0;
  let end = -1;
  for (let i = open; i < text.length; i += 1) {
    const char = text[i];
    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        end = i + 1;
        break;
      }
    }
  }

  if (end < 0) return text;

  // Remove following blank lines, but keep file readable.
  while (text[end] === '\n' || text[end] === '\r') end += 1;
  return `${text.slice(0, start).trimEnd()}\n\n${text.slice(end).trimStart()}`;
}

function removeConstComponent(text, name) {
  const marker = `const ${name}`;
  const start = text.indexOf(marker);
  if (start < 0) return text;

  const eq = text.indexOf('=', start);
  if (eq < 0) return text;

  const open = text.indexOf('{', eq);
  if (open < 0) return text;

  let depth = 0;
  let end = -1;
  for (let i = open; i < text.length; i += 1) {
    const char = text[i];
    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        end = i + 1;
        break;
      }
    }
  }

  if (end < 0) return text;
  const semicolon = text.indexOf(';', end);
  if (semicolon >= 0 && semicolon - end < 5) end = semicolon + 1;
  while (text[end] === '\n' || text[end] === '\r') end += 1;
  return `${text.slice(0, start).trimEnd()}\n\n${text.slice(end).trimStart()}`;
}

source = ensureImport(source);
source = removeFunctionDeclaration(source, 'AirportBadge');
source = removeConstComponent(source, 'AirportBadge');

// Reemplazar todos los badges locales por el componente global que ya usa la API/fuente de banderas central.
source = source.replace(/<AirportBadge\s+ident=({[^}]+})\s*\/?>/g, '<IcaoFlagBadge icao=$1 size="sm" />');
source = source.replace(/<AirportBadge\s+ident=({[^}]+})\s+countryCode=({[^}]+})\s*\/?>/g, '<IcaoFlagBadge icao=$1 countryCode=$2 size="sm" />');

// Si quedaron badges simples con formato manual "CL SCPF", no intentamos inferirlos; reportamos para revisión.
const badPatterns = [
  /<span[^>]*>\s*CL\s*{?[^<]*}?\s*<\/span>/,
  /className={[^}]*icao[^}]*}/i,
];

if (source === original) {
  console.warn('[warn] No se aplicaron cambios. Revisa si DispatchPageShell.tsx ya fue corregido o si cambió la estructura.');
} else {
  fs.writeFileSync(target, source, 'utf8');
  console.log('[ok] DispatchPageShell ahora usa IcaoFlagBadge global para los ICAO del despacho.');
}

if (source.includes('<AirportBadge')) {
  console.warn('[warn] Todavía quedan usos de <AirportBadge>. Revisa manualmente DispatchPageShell.tsx.');
}

if (badPatterns.some((pattern) => pattern.test(source))) {
  console.warn('[warn] Puede quedar algún badge ICAO manual. Busca "CL " o clases locales ICAO en DispatchPageShell.tsx.');
}
