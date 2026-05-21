import fs from "fs";
import path from "path";

const root = process.cwd();
const pageShellPath = path.join(root, "src", "components", "dispatch", "DispatchPageShell.tsx");
const cssPath = path.join(root, "src", "components", "dispatch", "DispatchPageShell.module.css");

function writeIfChanged(filePath, next) {
  const current = fs.readFileSync(filePath, "utf8");
  if (current === next) {
    console.log(`[skip] sin cambios: ${path.relative(root, filePath)}`);
    return false;
  }
  fs.writeFileSync(filePath, next, "utf8");
  console.log(`[ok] actualizado: ${path.relative(root, filePath)}`);
  return true;
}

if (!fs.existsSync(pageShellPath)) {
  throw new Error(`No se encontró ${pageShellPath}`);
}

let tsx = fs.readFileSync(pageShellPath, "utf8");

// Elimina la franja superior duplicada: "Flujo de despacho activo".
// Mantiene el DispatchRoomClient embebido y su botón interno "Volver a despachos".
const noticeBlockPattern = /\n\s*<div\s+className=\{styles\.embeddedDispatchNotice\}>[\s\S]*?<\/div>\s*(?=\n\s*<DispatchRoomClient)/m;
const beforeNotice = tsx;
tsx = tsx.replace(noticeBlockPattern, "");

// Fallback por si el formateo quedó distinto: elimina solo la tarjeta que contiene el texto visible.
if (tsx === beforeNotice && tsx.includes("Flujo de despacho activo")) {
  tsx = tsx.replace(/\n\s*<div[^>]*>\s*<strong>Flujo de despacho activo<\/strong>[\s\S]*?<\/div>\s*(?=\n\s*<DispatchRoomClient)/m, "");
}

if (tsx.includes("Flujo de despacho activo")) {
  throw new Error("No se pudo eliminar la tarjeta 'Flujo de despacho activo'. Revisa DispatchPageShell.tsx manualmente.");
}

writeIfChanged(pageShellPath, tsx);

if (fs.existsSync(cssPath)) {
  let css = fs.readFileSync(cssPath, "utf8");

  // Deja el CSS limpio: elimina las reglas asociadas a la tarjeta duplicada.
  css = css.replace(/\n\/\* PW3 embedded dispatch room inside dashboard tab \*\/[\s\S]*?\.embeddedLayoutGrid \{/m, "\n/* PW3 embedded dispatch room inside dashboard tab */\n");

  // Si el patrón anterior no aplica, elimina reglas individuales de embeddedDispatchNotice.
  css = css
    .replace(/\n\.embeddedDispatchNotice\s*\{[\s\S]*?\n\}/g, "")
    .replace(/\n\.embeddedDispatchNotice\s+strong\s*\{[\s\S]*?\n\}/g, "")
    .replace(/\n\.embeddedDispatchNotice\s+span\s*\{[\s\S]*?\n\}/g, "")
    .replace(/\n\.embeddedDispatchNotice\s+button\s*\{[\s\S]*?\n\}/g, "");

  // Limpia cualquier mención residual a embeddedDispatchNotice dentro de media queries.
  css = css
    .replace(/\n\s*\.embeddedDispatchNotice\s*\{[\s\S]*?\n\s*\}/g, "")
    .replace(/\n\s*\.embeddedDispatchNotice\s+button\s*\{[\s\S]*?\n\s*\}/g, "");

  writeIfChanged(cssPath, css);
}

console.log("[done] Tarjeta superior duplicada eliminada. El flujo embebido conserva el botón interno Volver a despachos.");
