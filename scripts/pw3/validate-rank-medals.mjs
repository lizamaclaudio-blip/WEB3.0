import fs from "node:fs";
import path from "node:path";

const webRoot = path.resolve(process.cwd());
const acarsRoot = path.resolve(webRoot, "..", "ACARS NUEVO");
const medalsFile = path.join(webRoot, "src", "lib", "ranks", "medals.ts");
const webRanksDir = path.join(webRoot, "public", "images", "ranks");
const acarsRanksDir = path.join(acarsRoot, "PatagoniaWings.Acars.Master", "Assets", "Ranks");

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function exists(file) {
  return fs.existsSync(file);
}

function parseMedalUrls(source) {
  const matches = [...source.matchAll(/medalUrl:\s*"([^"]+)"/g)];
  return matches.map((m) => m[1]);
}

function parseRankCodes(source) {
  const matches = [...source.matchAll(/code:\s*"([^"]+)"/g)];
  return matches.map((m) => m[1]);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
  console.log(`[OK] ${message}`);
}

const src = read(medalsFile);
const medalUrls = parseMedalUrls(src);
const rankCodes = parseRankCodes(src);

assert(rankCodes.length >= 10, "catalogo de rangos contiene al menos 10 rangos");
assert(new Set(rankCodes).size === rankCodes.length, "rank codes sin duplicados");
assert(medalUrls.length === rankCodes.length, "cada rank tiene medalUrl");

const missingWeb = [];
for (const url of medalUrls) {
  const rel = url.replace(/^\//, "");
  const file = path.join(webRoot, "public", rel);
  if (!exists(file)) missingWeb.push(url);
}
assert(missingWeb.length === 0, `medallas web presentes (${medalUrls.length})`);

const missingAcars = [];
for (const url of medalUrls) {
  const fileName = path.basename(url);
  const localAsset = path.join(acarsRanksDir, fileName);
  if (!exists(localAsset)) missingAcars.push(fileName);
}
assert(missingAcars.length === 0, "medallas ACARS resolubles con nombres equivalentes");

console.log("\nValidation passed.");
