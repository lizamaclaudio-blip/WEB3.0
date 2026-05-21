import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import zlib from "node:zlib";
import {
  buildAircraftEconomyProfiles,
  buildAirlineSummary,
  buildEconomyEstimates,
  buildEconomyEstimatesByAircraft,
  loadEconomyModel,
} from "./economy-model.mjs";

const OUTPUT_PATH = path.join(process.cwd(), "docs", "exports", "PW3_ECONOMY_MODEL.xlsx");

function validationRows(airline, economy, model, profiles) {
  const activeAircraft = airline.aircraft.filter((aircraft) => aircraft.active);
  const profileCodes = new Set(profiles.map((profile) => profile.aircraftCode));
  const aircraftByCode = new Map(activeAircraft.map((aircraft) => [aircraft.code, aircraft]));
  const passengerItineraryRoutes = model.passengerRoutes.filter((route) => route.flightType === "itinerary");
  const missingProfiles = activeAircraft.filter((aircraft) => !profileCodes.has(aircraft.code));
  const cargoCompatibilityErrors = model.cargoEstimates.filter((estimate) => !aircraftByCode.get(estimate.aircraftCode)?.supportsCargo);
  const accrualExceedsNet = model.estimates.filter((estimate) => estimate.pilotAccrualUsd > Math.max(0, estimate.netProfitUsd));
  const ineligibleRegularRoutes = model.estimates.filter((estimate) => !estimate.economyEligible);
  const profitablePassengerRoutes = model.passengerEstimates.filter((estimate) => estimate.airlineNetUsd > 0);
  const unprofitablePassengerRoutes = model.passengerEstimates.filter((estimate) => estimate.airlineNetUsd <= 0);
  const profitableCargoRoutes = model.cargoEstimates.filter((estimate) => estimate.airlineNetUsd > 0);
  const unprofitableCargoRoutes = model.cargoEstimates.filter((estimate) => estimate.airlineNetUsd <= 0);
  const passengerProfitabilityPct = model.passengerEstimates.length ? Number(((profitablePassengerRoutes.length / model.passengerEstimates.length) * 100).toFixed(2)) : 0;
  const cargoProfitabilityPct = model.cargoEstimates.length ? Number(((profitableCargoRoutes.length / model.cargoEstimates.length) * 100).toFixed(2)) : 0;
  const totalPilotAccrualUsd = Number(model.estimates.reduce((sum, estimate) => sum + estimate.pilotAccrualUsd, 0).toFixed(2));
  const summary = buildAirlineSummary(model.estimates, economy);
  const duplicateExpenseCodes = new Map();
  for (const expense of economy.progressionExpenses) duplicateExpenseCodes.set(expense.code, (duplicateExpenseCodes.get(expense.code) || 0) + 1);
  const duplicateProgressionExpenses = Array.from(duplicateExpenseCodes.values()).filter((count) => count > 1).length;
  const cargoRoutesWithPassengers = model.cargoEstimates.filter((estimate) => estimate.estimatedPassengers > 0).length;
  const cargoRoutesWithTicketRevenue = model.cargoEstimates.filter((estimate) => (estimate.estimatePayload?.passengerEconomy?.ticketRevenueUsd ?? 0) > 0).length;
  const routesWithWear = model.estimates.filter((estimate) => estimate.estimatePayload?.aircraftWear).length;
  const finalOk = missingProfiles.length === 0 &&
    cargoCompatibilityErrors.length === 0 &&
    accrualExceedsNet.length === 0 &&
    ineligibleRegularRoutes.length === 0 &&
    cargoRoutesWithPassengers === 0 &&
    cargoRoutesWithTicketRevenue === 0 &&
    routesWithWear === model.estimates.length &&
    duplicateProgressionExpenses === 0 &&
    passengerProfitabilityPct >= 60 &&
    cargoProfitabilityPct >= 60 &&
    totalPilotAccrualUsd > 0 &&
    summary.airlineCashUsd >= 0 &&
    summary.monthlyNetUsd >= 0;
  return [
    ["check", "resultado"],
    ["Aeronaves activas", activeAircraft.length],
    ["Perfiles economicos aeronaves", profiles.length],
    ["Aeronaves sin perfil", missingProfiles.length],
    ["Rutas pasajeros itinerary", passengerItineraryRoutes.length],
    ["Rutas pasajeros economia", model.passengerEstimates.length],
    ["Rutas carga economia", model.cargoEstimates.length],
    ["Rutas pasajeros positivas", profitablePassengerRoutes.length],
    ["Rutas pasajeros negativas", unprofitablePassengerRoutes.length],
    ["Porcentaje rentabilidad pasajeros", passengerProfitabilityPct],
    ["Rutas carga positivas", profitableCargoRoutes.length],
    ["Rutas carga negativas", unprofitableCargoRoutes.length],
    ["Rutas carga con pasajeros", cargoRoutesWithPassengers],
    ["Rutas carga con ticket revenue", cargoRoutesWithTicketRevenue],
    ["Rutas con aircraft wear", routesWithWear],
    ["Porcentaje rentabilidad carga", cargoProfitabilityPct],
    ["Devengo piloto total", totalPilotAccrualUsd],
    ["Caja virtual final", summary.airlineCashUsd],
    ["Utilidad mensual total", summary.monthlyNetUsd],
    ["Carga sin aeronave cargo", cargoCompatibilityErrors.length],
    ["Devengo supera utilidad", accrualExceedsNet.length],
    ["Rutas regulares no elegibles", ineligibleRegularRoutes.length],
    ["Gastos progresion duplicados", duplicateProgressionExpenses],
    ["Estado", finalOk ? "OK" : "FAIL"],
  ];
}

function buildRows() {
  const { airline, economy } = loadEconomyModel();
  const profiles = buildAircraftEconomyProfiles(airline, economy);
  const model = buildEconomyEstimates(airline, economy);
  const byAircraft = buildEconomyEstimatesByAircraft(airline, economy);
  const summary = buildAirlineSummary(model.estimates, economy);
  const routeHeader = [
    "routeId", "origen", "destino", "flightType", "aeronave", "distanciaNm", "capPasajeros", "paxEstimados",
    "capCargaKg", "cargaEstimadaKg", "ingresoUsd", "ticketRevenueUsd", "excessBaggageRevenueUsd", "onboardSalesUsd", "cargoRevenueUsd", "combustibleUsd", "feesUsd", "mantenimientoUsd", "reservaMantenimientoUsd",
    "tripulacionUsd", "cateringUsd", "handlingCargaUsd", "costoTotalUsd", "utilidadNetaUsd",
    "devengoPilotoUsd", "netoAerolineaUsd", "aircraftWearPercent", "wearReason", "economyEligible", "notas",
  ];
  const routeRow = (estimate) => [
    estimate.routeId,
    estimate.origin,
    estimate.destination,
    estimate.flightType,
    estimate.aircraftCode,
    estimate.distanceNm,
    estimate.passengerCapacity,
    estimate.estimatedPassengers,
    estimate.cargoCapacityKg,
    estimate.estimatedCargoKg,
    estimate.grossRevenueUsd,
    estimate.estimatePayload?.passengerEconomy?.ticketRevenueUsd ?? 0,
    estimate.estimatePayload?.passengerEconomy?.excessBaggageRevenueUsd ?? 0,
    estimate.estimatePayload?.passengerEconomy?.onboardSalesUsd ?? 0,
    estimate.estimatePayload?.cargoEconomy?.cargoRevenueUsd ?? 0,
    estimate.fuelCostUsd,
    estimate.airportFeesUsd,
    estimate.maintenanceCostUsd,
    estimate.maintenanceReserveUsd,
    estimate.crewCostUsd,
    estimate.cateringCostUsd,
    estimate.cargoHandlingCostUsd,
    estimate.totalCostUsd,
    estimate.netProfitUsd,
    estimate.pilotAccrualUsd,
    estimate.airlineNetUsd,
    estimate.estimatePayload?.aircraftWear?.totalWearPercent ?? 0,
    estimate.estimatePayload?.aircraftWear?.wearReason ?? "",
    estimate.economyEligible ? "SI" : "NO",
    estimate.notes.join("; "),
  ];

  const wearRows = [
    ["routeId", "aircraftCode", "flightType", "wearPercent", "maintenanceReserveUsd", "wearReason", "acarsLinked"],
    ...model.estimates.map((estimate) => [
      estimate.routeId,
      estimate.aircraftCode,
      estimate.flightType,
      estimate.estimatePayload?.aircraftWear?.totalWearPercent ?? 0,
      estimate.maintenanceReserveUsd,
      estimate.estimatePayload?.aircraftWear?.wearReason ?? "",
      estimate.estimatePayload?.aircraftWear?.acarsLinked ? "SI" : "NO",
    ]),
  ];

  const baggageRows = [
    ["routeId", "aircraftCode", "passengers", "baggageIncludedKg", "estimatedBaggageKg", "excessBaggageKg", "excessBaggageRevenueUsd"],
    ...model.passengerEstimates.map((estimate) => [
      estimate.routeId,
      estimate.aircraftCode,
      estimate.estimatedPassengers,
      estimate.estimatePayload?.passengerEconomy?.baggageIncludedKg ?? 0,
      estimate.estimatePayload?.passengerEconomy?.estimatedBaggageKg ?? 0,
      estimate.estimatePayload?.passengerEconomy?.excessBaggageKg ?? 0,
      estimate.estimatePayload?.passengerEconomy?.excessBaggageRevenueUsd ?? 0,
    ]),
  ];

  return {
    summary: [
      ["Patagonia Wings 3.0 - Economia virtual", "Valor"],
      ["Version catalogo", economy.version],
      ["Moneda", economy.currency],
      ["Solo virtual", economy.virtualOnly ? "SI" : "NO"],
      ["Capital inicial piloto USD", economy.initialPilotWalletGrantUsd ?? 25000],
      ["Aeronaves con perfil economico", profiles.length],
      ["Rutas pasajeros economia", model.passengerEstimates.length],
      ["Rutas carga economia", model.cargoEstimates.length],
      ["Combinaciones pax+aeronave", byAircraft.passengerCombinations.length],
      ["Combinaciones cargo+aeronave", byAircraft.cargoCombinations.length],
      ["Gastos progresion", economy.progressionExpenses.length],
      ["Codigos traslado", economy.progressionExpenses.filter((e) => e.appliesTo === "pilot_transfer").length],
      ["Codigos penalidad", economy.progressionExpenses.filter((e) => e.appliesTo === "penalty").length],
      ["Caja aerolinea virtual", summary.airlineCashUsd],
      ["Ingresos mes", summary.monthlyRevenueUsd],
      ["Costos mes", summary.monthlyCostUsd],
      ["Utilidad mes", summary.monthlyNetUsd],
      ["Ingresos pasajeros", summary.passengerRevenueUsd],
      ["Ingresos carga", summary.cargoRevenueUsd],
      ["Devengos pilotos pendientes", summary.pilotAccrualLiabilityUsd],
      ["Reserva mantenimiento", summary.maintenanceReserveUsd],
      ["Excel generado", new Date().toISOString()],
    ],
    aircraftProfiles: [
      ["aircraftCode", "aircraftName", "category", "rangeNm", "passengerCapacity", "cargoCapacityKg", "supportsPassenger", "supportsCargo", "minRank", "fuelCostPerNm", "maintenanceCostPerNm", "maintenanceReservePerNm", "fixedTurnCostUsd", "crewCostMultiplier"],
      ...profiles.map((profile) => [
        profile.aircraftCode,
        profile.aircraftName,
        profile.category,
        profile.rangeNm,
        profile.passengerCapacity,
        profile.supportsCargo ? profile.cargoCapacityKg : "N/D",
        profile.supportsPassenger ? "SI" : "NO",
        profile.supportsCargo ? "SI" : "NO",
        profile.minRank,
        profile.fuelCostPerNm,
        profile.maintenanceCostPerNm,
        profile.maintenanceReservePerNm,
        profile.fixedTurnCostUsd,
        profile.crewCostMultiplier,
      ]),
    ],
    categoryCosts: [
      ["routeCategory", "paxRevenuePerPaxNm", "cargoRevenuePerKgNm", "loadFactor", "cargoLoadFactor", "airportFeeUsd", "crewCostUsd", "cateringUsdPerPax", "cargoHandlingUsdPerKg", "pilotAccrualRate", "pilotAccrualMinUsd", "costFactor"],
      ...Object.entries(economy.routeCategoryRates).map(([category, rate]) => [
        category,
        rate.passengerRevenuePerPassengerNm,
        rate.cargoRevenuePerKgNm,
        rate.loadFactor,
        rate.cargoLoadFactor,
        rate.airportFeeUsd,
        rate.crewCostUsd,
        rate.cateringUsdPerPassenger,
        rate.cargoHandlingUsdPerKg,
        rate.pilotAccrualRate,
        rate.pilotAccrualMinimumUsd,
        rate.costFactor,
      ]),
    ],
    passengerRoutes: [routeHeader, ...model.passengerEstimates.map(routeRow)],
    cargoRoutes: [routeHeader, ...model.cargoEstimates.map(routeRow)],
    pilotAccruals: [
      ["routeId", "aircraftCode", "flightType", "pilotAccrualUsd", "walletEffect", "payoutRule"],
      ...model.estimates.map((estimate) => [
        estimate.routeId,
        estimate.aircraftCode,
        estimate.flightType,
        estimate.pilotAccrualUsd,
        "NO wallet vuelo a vuelo",
        "Se paga por liquidacion mensual futura",
      ]),
    ],
    progressionExpenses: [
      ["code", "type", "label", "amountUsd", "appliesTo", "metadata"],
      ...economy.progressionExpenses.map((expense) => [expense.code, expense.type, expense.label, expense.amountUsd, expense.appliesTo, JSON.stringify(expense.metadata ?? {})]),
    ],
    walletInitial: [
      ["concepto", "valor"],
      ["Capital inicial piloto USD", economy.initialPilotWalletGrantUsd ?? 25000],
      ["Idempotency key pattern", "pilot_initial_grant:<pilot_id>"],
      ["Ledger type", "adjustment"],
      ["Ledger category", "pilot_initial_grant"],
      ["Direction", "credit"],
      ["Description", "Capital inicial carrera Patagonia Wings 3.0"],
      ...["PILOT_TRANSFER_HUB_TO_HUB", "PILOT_TRANSFER_REGIONAL", "PILOT_TRANSFER_NATIONAL", "PILOT_TRANSFER_NON_HUB_RECOVERY", "PILOT_TRANSFER_INTERNATIONAL"].map((code) => {
        const exp = economy.progressionExpenses.find((e) => e.code === code);
        return [code, exp ? exp.amountUsd : "N/D"];
      }),
      ...["AIRCRAFT_ABANDONED_NON_HUB", "ADMIN_CANCELLATION_FEE", "PRIORITY_REPOSITION_REQUEST"].map((code) => {
        const exp = economy.progressionExpenses.find((e) => e.code === code);
        return [code, exp ? exp.amountUsd : "N/D"];
      }),
    ],
    paxByAircraft: [
      ["routeId", "origen", "destino", "aircraftCode", "pasajerosEstimados", "ingresoUsd", "costoUsd", "utilidadUsd", "devengoPilotoUsd", "desgastePct", "reservaMantenimientoUsd", "esRecomendado"],
      ...byAircraft.passengerCombinations.map((c) => [
        c.routeId,
        c.estimate.origin,
        c.estimate.destination,
        c.aircraftCode,
        c.estimate.estimatedPassengers,
        c.estimate.grossRevenueUsd,
        c.estimate.totalCostUsd,
        c.estimate.airlineNetUsd,
        c.estimate.pilotAccrualUsd,
        c.estimate.estimatePayload?.aircraftWear?.totalWearPercent ?? 0,
        c.estimate.maintenanceReserveUsd,
        c.isRecommended ? "SI" : "NO",
      ]),
    ],
    cargoByAircraft: [
      ["routeId", "origen", "destino", "aircraftCode", "cargoKg", "cargoRevenueUsd", "costoUsd", "utilidadUsd", "devengoPilotoUsd", "desgastePct", "reservaMantenimientoUsd", "esRecomendado"],
      ...byAircraft.cargoCombinations.map((c) => [
        c.routeId,
        c.estimate.origin,
        c.estimate.destination,
        c.aircraftCode,
        c.estimate.estimatedCargoKg,
        c.estimate.estimatePayload?.cargoEconomy?.cargoRevenueUsd ?? c.estimate.grossRevenueUsd,
        c.estimate.totalCostUsd,
        c.estimate.airlineNetUsd,
        c.estimate.pilotAccrualUsd,
        c.estimate.estimatePayload?.aircraftWear?.totalWearPercent ?? 0,
        c.estimate.maintenanceReserveUsd,
        c.isRecommended ? "SI" : "NO",
      ]),
    ],
    validation: validationRows(airline, economy, model, profiles),
    wearRows,
    baggageRows,
  };
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
  const entries = sheets.map((sheet, index) => `<sheet name="${escapeXml(sheet.name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${entries}</sheets></workbook>`;
}

function workbookRelsXml(sheets) {
  const rels = sheets.map((_, index) => `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rels}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;
}

function contentTypesXml(sheets) {
  const overrides = sheets.map((_, index) => `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${overrides}</Types>`;
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
  return {
    dosTime: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
    dosDate: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  };
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
    const localHeader = Buffer.concat([u32(0x04034b50), u16(20), u16(0), u16(8), u16(dosTime), u16(dosDate), u32(crc), u32(compressed.length), u32(data.length), u16(name.length), u16(0), name]);
    chunks.push(localHeader, compressed);
    central.push(Buffer.concat([u32(0x02014b50), u16(20), u16(20), u16(0), u16(8), u16(dosTime), u16(dosDate), u32(crc), u32(compressed.length), u32(data.length), u16(name.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset), name]));
    offset += localHeader.length + compressed.length;
  }
  const centralOffset = offset;
  const centralDirectory = Buffer.concat(central);
  const end = Buffer.concat([u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length), u32(centralDirectory.length), u32(centralOffset), u16(0)]);
  return Buffer.concat([...chunks, centralDirectory, end]);
}

function main() {
  const rows = buildRows();
  const sheets = [
    { name: "Resumen", rows: rows.summary },
    { name: "Perfil aeronaves economico", rows: rows.aircraftProfiles },
    { name: "Costos por categoria", rows: rows.categoryCosts },
    { name: "Rutas pasajeros economia", rows: rows.passengerRoutes },
    { name: "Rutas carga economia", rows: rows.cargoRoutes },
    { name: "Pax por aeronave", rows: rows.paxByAircraft },
    { name: "Carga por aeronave", rows: rows.cargoByAircraft },
    { name: "Devengos piloto estimados", rows: rows.pilotAccruals },
    { name: "Gastos progresion", rows: rows.progressionExpenses },
    { name: "Wallet inicial y traslados", rows: rows.walletInitial },
    { name: "Desgaste aeronave", rows: rows.wearRows },
    { name: "Equipaje y sobrepeso", rows: rows.baggageRows },
    { name: "Validaciones", rows: rows.validation },
  ];
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
  console.log(`[check] rutas_pasajeros_economia=${rows.passengerRoutes.length - 1}`);
  console.log(`[check] rutas_carga_economia=${rows.cargoRoutes.length - 1}`);
  console.log(`[check] aeronaves_perfil_economico=${rows.aircraftProfiles.length - 1}`);
}

try {
  main();
} catch (error) {
  console.error(`[error] ${error instanceof Error ? error.message : "UNKNOWN"}`);
  process.exitCode = 1;
}
