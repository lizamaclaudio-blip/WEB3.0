import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const target = path.join(root, "src", "components", "dashboard", "sur", "tabs", "HubCenterTab.tsx");

if (!fs.existsSync(target)) {
  console.error(`[error] No existe ${target}`);
  process.exit(1);
}

let source = fs.readFileSync(target, "utf8");
const importLine = 'import { PilotRepositioningPanel } from "@/components/dashboard/sur/PilotRepositioningPanel";';

if (!source.includes("PilotRepositioningPanel")) {
  if (source.startsWith("\"use client\";") || source.startsWith("'use client';")) {
    source = source.replace(/(["']use client["'];\s*)/, `$1\n\n${importLine}\n`);
  } else {
    source = `${importLine}\n${source}`;
  }
}

if (!source.includes("<PilotRepositioningPanel />")) {
  const replacements = [
    {
      find: "\n      <article className=\"pw-sur-activity-card\">",
      replace: "\n      <PilotRepositioningPanel />\n\n      <article className=\"pw-sur-activity-card\">",
    },
    {
      find: "\n      <div className=\"pw-sur-two-col\">",
      replace: "\n      <PilotRepositioningPanel />\n\n      <div className=\"pw-sur-two-col\">",
    },
    {
      find: "\n      <section>\n        <h3 className=\"pw-sur-heading\">",
      replace: "\n      <PilotRepositioningPanel />\n\n      <section>\n        <h3 className=\"pw-sur-heading\">",
    },
  ];

  let applied = false;
  for (const item of replacements) {
    if (source.includes(item.find)) {
      source = source.replace(item.find, item.replace);
      applied = true;
      break;
    }
  }

  if (!applied) {
    console.error("[error] No se encontro punto seguro de insercion en HubCenterTab.tsx.");
    console.error("Inserta manualmente <PilotRepositioningPanel /> dentro del stack del HUB Center, idealmente debajo de la tarjeta del aeropuerto y antes de Actividad del Aeropuerto.");
    process.exit(1);
  }
}

fs.writeFileSync(target, source, "utf8");
console.log("[ok] PilotRepositioningPanel integrado en HubCenterTab.tsx");
