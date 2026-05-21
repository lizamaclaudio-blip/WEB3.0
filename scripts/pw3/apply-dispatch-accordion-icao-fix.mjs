import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const tsxPath = path.join(root, "src/components/dispatch/DispatchPageShell.tsx");
const cssPath = path.join(root, "src/components/dispatch/DispatchPageShell.module.css");

function fail(message) {
  console.error(`[error] ${message}`);
  process.exit(1);
}

function read(filePath) {
  if (!fs.existsSync(filePath)) fail(`No existe ${path.relative(root, filePath)}`);
  return fs.readFileSync(filePath, "utf8");
}

function write(filePath, content) {
  fs.writeFileSync(filePath, content, "utf8");
}

let source = read(tsxPath);
let css = read(cssPath);

const originalSource = source;
const originalCss = css;

// 1) Asegurar estado desplegable para aeronaves disponibles de ruta oficial.
source = source.replace(
  /(const \[openSections, setOpenSections\] = useState<Record<string, boolean>>\(\{\s*)/,
  `$1\n    officialAircraft: true,`,
);

// Evitar duplicado si el script se ejecuta mas de una vez.
source = source.replace(/officialAircraft: true,\s*officialAircraft: true,/g, "officialAircraft: true,");

// 2) Agregar badge ICAO con bandera dentro del componente, sin tocar iconos globales.
if (!source.includes("function AirportBadge(")) {
  const helper = `
function flagFromAirportIdent(ident?: string | null) {
  const code = (ident || "").trim().toUpperCase();
  if (code.startsWith("SC")) return "🇨🇱";
  if (code.startsWith("SA")) return "🇦🇷";
  if (code.startsWith("SU")) return "🇺🇾";
  if (code.startsWith("SP")) return "🇵🇪";
  if (code.startsWith("SL")) return "🇧🇴";
  if (code.startsWith("SG")) return "🇵🇾";
  if (code.startsWith("SB")) return "🇧🇷";
  if (code.startsWith("SK")) return "🇨🇴";
  if (code.startsWith("SE")) return "🇪🇨";
  if (code.startsWith("SV")) return "🇻🇪";
  if (code.startsWith("MP")) return "🇵🇦";
  if (code.startsWith("MM")) return "🇲🇽";
  if (code.startsWith("K")) return "🇺🇸";
  if (code.startsWith("C")) return "🇨🇦";
  if (code.startsWith("LE")) return "🇪🇸";
  if (code.startsWith("EG")) return "🇬🇧";
  if (code.startsWith("LF")) return "🇫🇷";
  if (code.startsWith("ED")) return "🇩🇪";
  if (code.startsWith("LI")) return "🇮🇹";
  if (code.startsWith("EH")) return "🇳🇱";
  return "🏳️";
}

function AirportBadge({ ident }: { ident?: string | null }) {
  const code = normalizeText(ident, "----").toUpperCase();
  return (
    <span className={styles.icaoBadge} title={code}>
      <span className={styles.icaoFlag} aria-hidden="true">{flagFromAirportIdent(code)}</span>
      <span className={styles.icaoCode}>{code}</span>
    </span>
  );
}
`;

  source = source.replace(/function StatusBadge\(/, `${helper}\nfunction StatusBadge(`);
}

// 3) Cambiar badges ICAO simples por badge con bandera.
source = source.replace(
  /<span className=\{styles\.airportBadge\}>\{normalizeText\(selectedRoute\.destination_ident, "----"\)\}<\/span>/g,
  `<AirportBadge ident={selectedRoute.destination_ident} />`,
);

source = source.replace(
  /<span className=\{styles\.statusInfo\}>\{normalizeText\(item\.current_airport_ident \|\| currentAirport\?\.ident, "Base"\)\}<\/span>/g,
  `<AirportBadge ident={item.current_airport_ident || currentAirport?.ident} />`,
);

// Reemplazos adicionales tolerantes para variantes creadas por Codex.
source = source.replace(
  /<span className=\{styles\.airportBadge\}>\{normalizeText\(([^}]+?), "----"\)\}<\/span>/g,
  `<AirportBadge ident={$1} />`,
);

source = source.replace(
  /<span className=\{styles\.statusInfo\}>\{normalizeText\(([^}]+?), "Base"\)\}<\/span>/g,
  `<AirportBadge ident={$1} />`,
);

// 4) Encapsular la tarjeta de aeronaves disponibles en acordeon, si aun esta como bloque fijo.
if (source.includes('<div className={styles.fleetBox}>') && !source.includes('section="officialAircraft"')) {
  const markerStart = '<div className={styles.fleetBox}>';
  const markerEnd = '\n      </section>\n\n      <section className={styles.accordionStack}>';
  const start = source.indexOf(markerStart);
  const end = source.indexOf(markerEnd, start);

  if (start >= 0 && end > start) {
    const segment = source.slice(start, end);
    const wrapped = `<SimpleAccordion title="Aeronaves disponibles en tu ubicación operacional" section="officialAircraft" openSections={openSections} toggle={toggle}>\n          ${segment}\n        </SimpleAccordion>`;
    source = `${source.slice(0, start)}${wrapped}${source.slice(end)}`;
  } else {
    console.warn("[warn] No se encontro el cierre esperado para envolver fleetBox. Se mantienen cambios de ICAO.");
  }
}

// 5) Quitar encabezado duplicado interno si el acordeon ya lo contiene.
source = source.replace(
  /<h3>Aeronaves disponibles en (?:su ubicación\/HUB|tu ubicación operacional)<\/h3>\s*/g,
  "",
);

// 6) Textos menores consistentes.
source = source.replace(/Selecciona aeronave compatible para la ruta oficial\./g, "Selecciona una aeronave compatible para la ruta oficial.");
source = source.replace(/Elegí aeronave y luego revisa las rutas disponibles desde tu ubicación\./g, "Selecciona una aeronave y luego revisa las rutas oficiales disponibles desde tu ubicación.");
source = source.replace(/Reservar Vuelos Regulares/g, "Rutas oficiales de aerolínea");

// 7) CSS para badge ICAO bandera y ajuste de bloque en acordeon.
if (!css.includes(".icaoBadge")) {
  css += `

/* PW3 WEB08E: badge ICAO unificado con bandera */
.icaoBadge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-width: 72px;
  min-height: 24px;
  padding: 3px 7px;
  border-radius: 4px;
  background: #253c75;
  color: #ffffff;
  font-weight: 900;
  font-size: 12px;
  line-height: 1;
  letter-spacing: .02em;
  white-space: nowrap;
  box-shadow: inset 0 -1px 0 rgba(0, 0, 0, .12);
}

.icaoFlag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 14px;
  font-size: 14px;
  line-height: 1;
}

.icaoCode {
  display: inline-block;
  transform: translateY(.5px);
}
`;
}

// Si existia airportBadge simple, dejarlo compatible visualmente.
css = css.replace(
  /.airportBadge \{\s*color: #fff;\s*background: #253c75;\s*min-width: 68px;\s*\}/,
  `.airportBadge {
  color: #fff;
  background: #253c75;
  min-width: 68px;
}`,
);

const badTokens = ["ðŸ", "âœ", "âš", "Ã", "Â", "�"];
for (const token of badTokens) {
  if (source.includes(token) || css.includes(token)) {
    fail(`Mojibake detectado despues del parche: ${token}`);
  }
}

if (source === originalSource && css === originalCss) {
  console.log("[info] No hubo cambios. Puede que el parche ya estuviera aplicado o el archivo tenga otra estructura.");
} else {
  write(tsxPath, source);
  write(cssPath, css);
  console.log("[ok] DispatchPageShell actualizado: aeronaves en acordeon y badges ICAO con bandera.");
}
