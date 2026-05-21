import { mkdir, writeFile, stat, readFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "data", "ourairports");

const SOURCES = [
  { name: "airports.csv", url: "https://davidmegginson.github.io/ourairports-data/airports.csv", expected: ["id", "ident", "type", "name"] },
  { name: "runways.csv", url: "https://davidmegginson.github.io/ourairports-data/runways.csv", expected: ["id", "airport_ref", "airport_ident", "le_heading_degT", "he_heading_degT"] },
  { name: "countries.csv", url: "https://davidmegginson.github.io/ourairports-data/countries.csv", expected: ["id", "code", "name"] },
  { name: "regions.csv", url: "https://davidmegginson.github.io/ourairports-data/regions.csv", expected: ["id", "code", "name"] }
];

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  for (const src of SOURCES) {
    const res = await fetch(src.url);
    if (!res.ok) throw new Error(`Download failed: ${src.name} (${res.status})`);
    const text = await res.text();
    const fullPath = path.join(OUT_DIR, src.name);
    await writeFile(fullPath, text, "utf8");

    const info = await stat(fullPath);
    if (info.size <= 0) throw new Error(`Empty file: ${src.name}`);

    const data = await readFile(fullPath, "utf8");
    const firstLine = data.split(/\r?\n/, 1)[0] || "";
    for (const h of src.expected) {
      if (!firstLine.includes(h)) {
        throw new Error(`Header check failed for ${src.name}. Missing: ${h}`);
      }
    }
    console.log(`[ok] ${src.name} (${info.size} bytes)`);
  }
}

main().catch((err) => {
  console.error(`[error] ${err.message}`);
  process.exit(1);
});
