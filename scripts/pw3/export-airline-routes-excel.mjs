import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import zlib from "node:zlib";
import { Client } from "pg";

const OUTPUT_PATH = path.join(process.cwd(), "docs", "exports", "PW3_AIRLINE_ROUTES_NETWORK.xlsx");
const CATALOG_PATH = path.join(process.cwd(), "src", "lib", "airline", "catalog.json");

const categoryLabels = {
  escuela_local: "Escuela local",
  regional: "Regional",
  interregional: "Interregional",
  patagonia: "Patagonia",
  nacional: "Nacional",
  internacional_regional: "Internacional regional",
  largo_radio: "Largo radio",
  carga_regional: "Carga regional",
  carga_interregional: "Carga interregional",
  carga_nacional: "Carga nacional",
  carga_internacional: "Carga internacional",
};

function readEnvValue(name) {
  const envPath = path.join(process.cwd(), ".env.local");
  const processValue = process.env[name];
  if (!fs.existsSync(envPath)) return processValue || "";
  const envText = fs.readFileSync(envPath, "utf8");
  const match = envText.match(new RegExp(`^\\s*${name}\\s*=\\s*["']?([^"'\r\n]+)["']?`, "m"));
  return match?.[1]?.trim() || processValue || "";
}

function toRad(value) {
  return (value * Math.PI) / 180;
}

function distanceNm(origin, destination, airportByIcao) {
  const a = airportByIcao.get(origin);
  const b = airportByIcao.get(destination);
  if (!a || !b) return 0;
  const radiusNm = 3440.065;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return Number((radiusNm * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))).toFixed(1));
}

function routePrefix(link) {
  return link.flightType === "cargo" ? "PW-CGO" : "PW-PAX";
}

function routeId(link, origin, destination) {
  return `${routePrefix(link)}-${origin}-${destination}`;
}

function expandLinks(links, type, catalog) {
  const airportByIcao = new Map(catalog.airports.map((airport) => [airport.icao, airport]));
  const aircraftByCode = new Map(catalog.aircraft.map((aircraft) => [aircraft.code, aircraft]));
  return links.flatMap((link) => [false, true].map((reverse) => {
    const origin = reverse ? link.destination : link.origin;
    const destination = reverse ? link.origin : link.destination;
    const distance = distanceNm(origin, destination, airportByIcao);
    const allowedAircraft = link.baseAircraft.filter((code) => {
      const aircraft = aircraftByCode.get(code);
      if (!aircraft?.active) return false;
      if (distance > aircraft.rangeNm) return false;
      if (type === "cargo" && !aircraft.supportsCargo) return false;
      if (type !== "cargo" && !aircraft.supportsPassenger) return false;
      return true;
    });
    const recommendedAircraft = link.recommendedAircraft.filter((code) => allowedAircraft.includes(code));
    return {
      routeId: routeId(link, origin, destination),
      origin,
      destination,
      originName: airportByIcao.get(origin)?.name || origin,
      destinationName: airportByIcao.get(destination)?.name || destination,
      originCity: airportByIcao.get(origin)?.city || "",
      destinationCity: airportByIcao.get(destination)?.city || "",
      distanceNm: distance,
      routeCategory: link.routeCategory,
      routeCategoryLabel: categoryLabels[link.routeCategory] || link.routeCategory,
      flightType: link.flightType,
      minRank: link.minRank,
      allowedAircraft,
      recommendedAircraft: recommendedAircraft.length ? recommendedAircraft : allowedAircraft.slice(0, 2),
      isPassengerRoute: type !== "cargo",
      isCargoRoute: type === "cargo",
      isReturnRoute: reverse,
      returnRouteId: routeId(link, destination, origin),
      viewSection: link.flightType === "training" || link.routeCategory === "escuela_local" ? "Escuela local separada" : "Vista principal",
    };
  }));
}

function buildRows(catalog) {
  const airports = catalog.airports;
  const aircraft = catalog.aircraft;
  const ranks = catalog.ranks;
  const passengerRoutes = expandLinks(catalog.passengerLinks, "passenger", catalog);
  const cargoRoutes = expandLinks(catalog.cargoLinks, "cargo", catalog);
  const routes = [...passengerRoutes, ...cargoRoutes];
  const routeIds = new Set(routes.map((route) => route.routeId));
  const routeHeader = [
    "routeId", "origen", "ciudadOrigen", "destino", "ciudadDestino", "distanciaNm", "categoria", "tipoVuelo",
    "rangoMin", "aeronavesCompatibles", "aeronavesRecomendadas", "retornoValidado", "returnRouteId", "seccionVista",
  ];
  const toRouteRow = (route) => [
    route.routeId,
    route.origin,
    route.originCity,
    route.destination,
    route.destinationCity,
    route.distanceNm,
    route.routeCategoryLabel,
    route.flightType,
    route.minRank,
    route.allowedAircraft.join(", "),
    route.recommendedAircraft.join(", "),
    routeIds.has(route.returnRouteId) ? "OK" : "FALTA",
    route.returnRouteId,
    route.viewSection,
  ];
  const itineraryRoutes = passengerRoutes.filter((route) => route.flightType === "itinerary" || route.flightType === "charter");
  const schoolRoutes = passengerRoutes.filter((route) => route.flightType === "training" || route.routeCategory === "escuela_local");
  const missingReturns = routes.filter((route) => !routeIds.has(route.returnRouteId));
  const noCompatibleAircraft = routes.filter((route) => route.allowedAircraft.length === 0);

  return {
    summary: [
      ["Patagonia Wings 3.0 - Red operacional", "Valor"],
      ["Aeropuertos catalogo", airports.length],
      ["Rangos catalogo", ranks.length],
      ["Aeronaves catalogo operacional", aircraft.length],
      ["Rutas pasajeros total", passengerRoutes.length],
      ["Rutas pasajeros regulares", itineraryRoutes.length],
      ["Rutas escuela local separadas", schoolRoutes.length],
      ["Rutas carga", cargoRoutes.length],
      ["Total rutas", routes.length],
      ["Hubs pasajeros", airports.filter((airport) => airport.isPassengerHub).length],
      ["Hubs carga", airports.filter((airport) => airport.isCargoHub).length],
      ["Destinos", new Set(routes.flatMap((route) => [route.origin, route.destination])).size],
      ["Rutas sin retorno", missingReturns.length],
      ["Rutas sin aeronave compatible", noCompatibleAircraft.length],
      ["Estado", missingReturns.length === 0 && noCompatibleAircraft.length === 0 ? "OK" : "FAIL"],
      ["Excel generado", new Date().toISOString()],
    ],
    routes: [routeHeader, ...routes.sort((a, b) => a.routeId.localeCompare(b.routeId)).map(toRouteRow)],
    passengerRoutes: [routeHeader, ...itineraryRoutes.sort((a, b) => a.routeId.localeCompare(b.routeId)).map(toRouteRow)],
    cargoRoutes: [routeHeader, ...cargoRoutes.sort((a, b) => a.routeId.localeCompare(b.routeId)).map(toRouteRow)],
    schoolRoutes: [routeHeader, ...schoolRoutes.sort((a, b) => a.routeId.localeCompare(b.routeId)).map(toRouteRow)],
    ranks: [["rankCode", "rankName", "level", "allowedAircraft", "maxRouteCategory", "canFlyCargo", "canFlyInternational", "canFlyLongHaul"], ...ranks.map((rank) => [rank.rankCode, rank.rankName, rank.level, rank.allowedAircraft.join(", "), rank.maxRouteCategory, rank.canFlyCargo ? "SI" : "NO", rank.canFlyInternational ? "SI" : "NO", rank.canFlyLongHaul ? "SI" : "NO"])],
    aircraft: [["code", "name", "category", "rangeNm", "minRank", "allowedRanks", "supportsPassenger", "supportsCargo", "cargoCapacityKg", "passengerCapacity", "active"], ...aircraft.map((item) => [item.code, item.name, item.category, item.rangeNm, item.minRank, item.allowedRanks.join(", "), item.supportsPassenger ? "SI" : "NO", item.supportsCargo ? "SI" : "NO", item.supportsCargo ? item.cargoCapacityKg : "N/D", item.passengerCapacity, item.active ? "SI" : "NO"])],
    airports: [["icao", "name", "city", "country", "lat", "lon", "hubPasajeros", "hubCarga", "hubCategory", "airportCategory", "cargoCategory", "active"], ...airports.map((airport) => [airport.icao, airport.name, airport.city, airport.country, airport.lat, airport.lon, airport.isPassengerHub ? "SI" : "NO", airport.isCargoHub ? "SI" : "NO", airport.hubCategory, airport.airportCategory, airport.cargoCategory, airport.active ? "SI" : "NO"])],
    validation: [["check", "resultado"], ["Retornos faltantes", missingReturns.length], ["Rutas sin aeronave compatible", noCompatibleAircraft.length], ["Rutas carga sin aeronave carga", cargoRoutes.filter((route) => route.allowedAircraft.length === 0).length], ["Flight types validos", routes.every((route) => catalog.flightTypes.includes(route.flightType)) ? "OK" : "FAIL"], ["Training separado visualmente", schoolRoutes.every((route) => route.viewSection === "Escuela local separada") ? "OK" : "FAIL"], ["Estado", missingReturns.length === 0 && noCompatibleAircraft.length === 0 ? "OK" : "FAIL"]],
  };
}

async function getNeonSheets(localAircraft) {
  const connectionString = readEnvValue("DATABASE_URL");
  if (!connectionString) return [];
  const client = new Client({ connectionString, ssl: connectionString.includes("sslmode=require") ? undefined : { rejectUnauthorized: false } });
  try {
    await client.connect();
    const aircraft = await client.query(`
      select
        am.model_code,
        am.model_name,
        am.category,
        app.practical_range_nm,
        app.seats,
        app.cargo_kg,
        app.is_cargo,
        app.is_training,
        app.is_commercial,
        count(distinct fa.id)::int as fleet_count,
        string_agg(distinct rap.rank_code, ', ' order by rap.rank_code) as ranks
      from public.aircraft_models am
      left join public.aircraft_performance_profiles app on app.model_id = am.id
      left join public.fleet_aircraft fa on fa.model_code = am.model_code
      left join public.rank_aircraft_permissions rap on rap.model_code = am.model_code
      group by am.model_code, am.model_name, am.category, app.practical_range_nm, app.seats, app.cargo_kg, app.is_cargo, app.is_training, app.is_commercial
      order by am.model_code
    `);
    const routes = await client.query(`
      select
        count(*)::int as total,
        count(*) filter (where route_code like 'PW-PAX-%')::int as passenger,
        count(*) filter (where route_code like 'PW-CGO-%')::int as cargo
      from public.network_routes
      where is_active = true and route_code like 'PW-%'
    `);
    const neonAircraftRows = [["model_code", "model_name", "category", "rangeNm", "seats", "cargoKg", "cargoFlag", "trainingFlag", "commercialFlag", "fleetCount", "ranks", "enRedLocal", "nota"], ...aircraft.rows.map((row) => {
      const localModel = localAircraft.get(row.model_code);
      const inLocal = Boolean(localModel);
      const supportsCargo = Boolean(localModel?.supportsCargo ?? row.is_cargo);
      return [
        row.model_code,
        row.model_name,
        row.category || "",
        Number(row.practical_range_nm || 0),
        Number(row.seats || 0),
        supportsCargo ? Number(localModel?.cargoCapacityKg ?? row.cargo_kg ?? 0) : "N/D",
        row.is_cargo ? "SI" : "NO",
        row.is_training ? "SI" : "NO",
        row.is_commercial ? "SI" : "NO",
        row.fleet_count,
        row.ranks || "",
        inLocal ? "SI" : "NO",
        inLocal ? "Incluida en la red operacional local" : "Detectada en Neon/semillas; fuera de red local por no estar en el catalogo operacional validado de este bloque",
      ];
    })];
    const neonRows = [["check", "resultado"], ["Neon rutas activas PW", routes.rows[0]?.total ?? 0], ["Neon rutas pasajeros PW", routes.rows[0]?.passenger ?? 0], ["Neon rutas carga PW", routes.rows[0]?.cargo ?? 0], ["Neon modelos aircraft_models", aircraft.rows.length], ["Neon modelos en red local", aircraft.rows.filter((row) => localAircraft.has(row.model_code)).length]];
    return [
      { name: "Aeronaves Neon", rows: neonAircraftRows },
      { name: "Neon resumen", rows: neonRows },
    ];
  } catch (error) {
    return [{ name: "Neon resumen", rows: [["check", "resultado"], ["Neon", `No consultado: ${error instanceof Error ? error.message : "error"}`]] }];
  } finally {
    await client.end().catch(() => undefined);
  }
}

function escapeXml(value) {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function columnName(index) {
  let name = "";
  let n = index + 1;
  while (n > 0) {
    const rem = (n - 1) % 26;
    name = String.fromCharCode(65 + rem) + name;
    n = Math.floor((n - 1) / 26);
  }
  return name;
}

function sheetXml(rows) {
  const lastRow = Math.max(rows.length, 1);
  const lastCol = Math.max(...rows.map((row) => row.length), 1);
  const dimension = `A1:${columnName(lastCol - 1)}${lastRow}`;
  const body = rows.map((row, rowIndex) => {
    const cells = row.map((value, colIndex) => {
      const ref = `${columnName(colIndex)}${rowIndex + 1}`;
      if (typeof value === "number" && Number.isFinite(value)) return `<c r="${ref}"${rowIndex === 0 ? ' s="1"' : ""}><v>${value}</v></c>`;
      return `<c r="${ref}" t="inlineStr"${rowIndex === 0 ? ' s="1"' : ""}><is><t>${escapeXml(value)}</t></is></c>`;
    }).join("");
    return `<row r="${rowIndex + 1}">${cells}</row>`;
  }).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="${dimension}"/><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="15"/><sheetData>${body}</sheetData></worksheet>`;
}

function workbookXml(sheets) {
  const sheetEntries = sheets.map((sheet, index) => `<sheet name="${escapeXml(sheet.name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheetEntries}</sheets></workbook>`;
}

function workbookRelsXml(sheets) {
  const sheetRels = sheets.map((_, index) => `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheetRels}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;
}

function contentTypesXml(sheets) {
  const sheetOverrides = sheets.map((_, index) => `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheetOverrides}</Types>`;
}

function stylesXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><color theme="1"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF111827"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
}

const crcTable = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime(date = new Date()) {
  const year = Math.max(date.getFullYear(), 1980);
  const dosTime = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const dosDate = ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { dosTime, dosDate };
}

function u16(value) {
  const b = Buffer.alloc(2);
  b.writeUInt16LE(value, 0);
  return b;
}

function u32(value) {
  const b = Buffer.alloc(4);
  b.writeUInt32LE(value >>> 0, 0);
  return b;
}

function buildZip(files) {
  const chunks = [];
  const central = [];
  let offset = 0;
  const { dosTime, dosDate } = dosDateTime();
  for (const file of files) {
    const name = Buffer.from(file.name, "utf8");
    const data = Buffer.isBuffer(file.data) ? file.data : Buffer.from(file.data, "utf8");
    const compressed = zlib.deflateRawSync(data);
    const crc = crc32(data);
    const localHeader = Buffer.concat([
      u32(0x04034b50), u16(20), u16(0), u16(8), u16(dosTime), u16(dosDate), u32(crc), u32(compressed.length), u32(data.length), u16(name.length), u16(0), name,
    ]);
    chunks.push(localHeader, compressed);
    central.push(Buffer.concat([
      u32(0x02014b50), u16(20), u16(20), u16(0), u16(8), u16(dosTime), u16(dosDate), u32(crc), u32(compressed.length), u32(data.length), u16(name.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset), name,
    ]));
    offset += localHeader.length + compressed.length;
  }
  const centralOffset = offset;
  const centralDirectory = Buffer.concat(central);
  const end = Buffer.concat([u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length), u32(centralDirectory.length), u32(centralOffset), u16(0)]);
  return Buffer.concat([...chunks, centralDirectory, end]);
}

async function main() {
  const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, "utf8"));
  const rows = buildRows(catalog);
  const baseSheets = [
    { name: "Resumen", rows: rows.summary },
    { name: "Rangos", rows: rows.ranks },
    { name: "Aeronaves", rows: rows.aircraft },
    { name: "Aeropuertos", rows: rows.airports },
    { name: "Rutas pasajeros", rows: rows.passengerRoutes },
    { name: "Rutas carga", rows: rows.cargoRoutes },
    { name: "Rutas consolidado", rows: rows.routes },
    { name: "Validaciones", rows: rows.validation },
    { name: "Rutas escuela local", rows: rows.schoolRoutes },
  ];
  const neonSheets = await getNeonSheets(new Map(catalog.aircraft.map((item) => [item.code, item])));
  const sheets = [...baseSheets, ...neonSheets];
  const files = [
    { name: "[Content_Types].xml", data: contentTypesXml(sheets) },
    { name: "_rels/.rels", data: "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\"><Relationship Id=\"rId1\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument\" Target=\"xl/workbook.xml\"/></Relationships>" },
    { name: "xl/workbook.xml", data: workbookXml(sheets) },
    { name: "xl/_rels/workbook.xml.rels", data: workbookRelsXml(sheets) },
    { name: "xl/styles.xml", data: stylesXml() },
    ...sheets.map((sheet, index) => ({ name: `xl/worksheets/sheet${index + 1}.xml`, data: sheetXml(sheet.rows) })),
  ];
  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, buildZip(files));
  console.log(`[ok] excel=${OUTPUT_PATH}`);
  console.log(`[check] hojas=${sheets.map((sheet) => sheet.name).join(" | ")}`);
  console.log(`[check] rutas=${rows.routes.length - 1}`);
  console.log(`[check] rutas_pasajeros_regulares=${rows.passengerRoutes.length - 1}`);
  console.log(`[check] rutas_carga=${rows.cargoRoutes.length - 1}`);
  console.log(`[check] rutas_escuela_local=${rows.schoolRoutes.length - 1}`);
}

main().catch((error) => {
  console.error(`[error] ${error instanceof Error ? error.message : "UNKNOWN"}`);
  process.exitCode = 1;
});
