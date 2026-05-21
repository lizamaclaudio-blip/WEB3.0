import fs from "node:fs";
import path from "node:path";

const filePath = path.join(process.cwd(), "src", "components", "dispatch", "DispatchPageShell.tsx");

if (!fs.existsSync(filePath)) {
  console.error(`[error] No existe ${filePath}`);
  process.exit(1);
}

let source = fs.readFileSync(filePath, "utf8");

if (!source.includes("<AirportBadge")) {
  console.log("[ok] DispatchPageShell no usa AirportBadge. No hay cambios que aplicar.");
  process.exit(0);
}

if (source.includes("function AirportBadge(") || source.includes("const AirportBadge")) {
  console.log("[ok] AirportBadge ya existe en DispatchPageShell.");
  process.exit(0);
}

const helper = `
function getFlagForAirportIdent(value?: string | null) {
  const ident = (value || "").trim().toUpperCase();

  if (ident.startsWith("SC")) return "🇨🇱";
  if (ident.startsWith("SA")) return "🇦🇷";
  if (ident.startsWith("SU")) return "🇺🇾";
  if (ident.startsWith("SP")) return "🇵🇪";
  if (ident.startsWith("SL")) return "🇧🇴";
  if (ident.startsWith("SG")) return "🇵🇾";
  if (ident.startsWith("SB")) return "🇧🇷";
  if (ident.startsWith("SK")) return "🇨🇴";
  if (ident.startsWith("SE")) return "🇪🇨";
  if (ident.startsWith("SV")) return "🇻🇪";
  if (ident.startsWith("MP")) return "🇵🇦";
  if (ident.startsWith("MM")) return "🇲🇽";
  if (ident.startsWith("K")) return "🇺🇸";
  if (ident.startsWith("C")) return "🇨🇦";
  if (ident.startsWith("LE")) return "🇪🇸";
  if (ident.startsWith("EG")) return "🇬🇧";
  if (ident.startsWith("LF")) return "🇫🇷";
  if (ident.startsWith("ED")) return "🇩🇪";
  if (ident.startsWith("LI")) return "🇮🇹";
  if (ident.startsWith("EH")) return "🇳🇱";

  return "🌐";
}

type AirportBadgeProps = {
  ident?: string | null;
};

function AirportBadge({ ident }: AirportBadgeProps) {
  const code = (ident || "N/D").trim().toUpperCase();

  return (
    <span
      title={code}
      style={{
        alignItems: "center",
        background: "#1e3a8a",
        borderRadius: "4px",
        color: "#ffffff",
        display: "inline-flex",
        fontSize: "11px",
        fontWeight: 800,
        gap: "4px",
        letterSpacing: "0.02em",
        lineHeight: 1,
        padding: "4px 7px",
        whiteSpace: "nowrap",
      }}
    >
      <span aria-hidden="true" style={{ fontSize: "12px", lineHeight: 1 }}>
        {getFlagForAirportIdent(code)}
      </span>
      <span>{code}</span>
    </span>
  );
}
`;

const match = source.match(/^(\s*["']use client["'];\s*)?(?:\s*import[\s\S]*?;\s*)+/);

if (match) {
  const insertAt = match[0].length;
  source = `${source.slice(0, insertAt)}${helper}\n${source.slice(insertAt)}`;
} else {
  source = `${helper}\n${source}`;
}

for (const bad of ["ðŸ", "âœ", "âš", "Ã", "Â", "�"]) {
  if (source.includes(bad)) {
    console.error(`[error] Mojibake detectado en DispatchPageShell después del parche: ${bad}`);
    process.exit(1);
  }
}

fs.writeFileSync(filePath, source, "utf8");
console.log("[ok] AirportBadge agregado a DispatchPageShell.tsx.");
