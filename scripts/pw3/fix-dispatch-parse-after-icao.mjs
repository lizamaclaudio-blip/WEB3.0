import fs from 'node:fs';
import path from 'node:path';

const file = path.join(process.cwd(), 'src', 'components', 'dispatch', 'DispatchPageShell.tsx');
if (!fs.existsSync(file)) {
  console.error(`[error] No existe ${file}`);
  process.exit(1);
}

let content = fs.readFileSync(file, 'utf8');

// 1) Ensure the global badge import exists.
if (!content.includes('components/ui/IcaoFlagBadge')) {
  const importLines = content.match(/^(import[^\n]+\n)+/m)?.[0] ?? '';
  if (importLines) {
    content = content.replace(importLines, `${importLines}import IcaoFlagBadge from '@/components/ui/IcaoFlagBadge';\n`);
  } else {
    content = `import IcaoFlagBadge from '@/components/ui/IcaoFlagBadge';\n${content}`;
  }
}

// 2) Remove leftover local AirportBadge type definitions.
content = content.replace(/\n?type\s+AirportBadgeProps\s*=\s*\{[\s\S]*?\};\s*/g, '\n');

// 3) Remove a complete local AirportBadge helper if it still exists.
content = content.replace(/\n?function\s+AirportBadge\s*\([\s\S]*?\n\}\s*(?=\n(?:function|const|export|type|interface|async|class)\b)/g, '\n');

// 4) Remove the broken remnant left by the previous automated replacement:
//    ": AirportBadgeProps) { ... }"
content = content.replace(/\n\s*:\s*AirportBadgeProps\)\s*\{[\s\S]*?\n\}\s*(?=\n(?:function|const|export|type|interface|async|class)\b)/g, '\n');

// 5) Fallback: if a standalone broken line remains, remove the minimal block by brace matching.
const brokenNeedle = ': AirportBadgeProps) {';
let idx = content.indexOf(brokenNeedle);
if (idx !== -1) {
  const start = content.lastIndexOf('\n', idx);
  let pos = content.indexOf('{', idx);
  let depth = 0;
  let end = -1;
  for (; pos < content.length; pos += 1) {
    const ch = content[pos];
    if (ch === '{') depth += 1;
    if (ch === '}') {
      depth -= 1;
      if (depth === 0) {
        end = pos + 1;
        break;
      }
    }
  }
  if (end !== -1) {
    content = `${content.slice(0, Math.max(0, start))}\n${content.slice(end)}`;
  }
}

// 6) Make sure no AirportBadge JSX usage remains. Prefer global IcaoFlagBadge.
content = content.replace(/<AirportBadge\s+ident=\{([^}]+)\}\s*\/?>/g, '<IcaoFlagBadge icao={$1} size="sm" />');
content = content.replace(/<AirportBadge\s+ident=\{([^}]+)\}\s+countryCode=\{([^}]+)\}\s*\/?>/g, '<IcaoFlagBadge icao={$1} countryCode={$2} size="sm" />');
content = content.replace(/<AirportBadge\s+countryCode=\{([^}]+)\}\s+ident=\{([^}]+)\}\s*\/?>/g, '<IcaoFlagBadge icao={$2} countryCode={$1} size="sm" />');

// 7) Remove duplicated blank lines created by cleanup.
content = content.replace(/\n{4,}/g, '\n\n\n');

if (content.includes('AirportBadgeProps')) {
  console.error('[error] Aun queda AirportBadgeProps en DispatchPageShell.tsx. Sube el archivo para correccion manual.');
  process.exit(1);
}
if (/<AirportBadge\b/.test(content)) {
  console.error('[error] Aun queda JSX <AirportBadge> en DispatchPageShell.tsx. Sube el archivo para correccion manual.');
  process.exit(1);
}

fs.writeFileSync(file, content, 'utf8');
console.log('[ok] DispatchPageShell parse fix aplicado. Usa IcaoFlagBadge global y elimina remanente AirportBadge.');
