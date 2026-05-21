export type SimbriefAircraftMap = {
  code: string;
  simbriefCode: string;
  notes?: string;
};

const MAP: Record<string, SimbriefAircraftMap> = {
  C172: { code: "C172", simbriefCode: "C172" },
  C208: { code: "C208", simbriefCode: "C208" },
  BE58: { code: "BE58", simbriefCode: "BE58" },
  B350: { code: "B350", simbriefCode: "B350" },
  TBM9: { code: "TBM9", simbriefCode: "TBM9" },
  ATR72: { code: "ATR72", simbriefCode: "AT76", notes: "mapped to AT76" },
  AT76: { code: "AT76", simbriefCode: "AT76" },
  A320: { code: "A320", simbriefCode: "A320" },
  A20N: { code: "A20N", simbriefCode: "A20N" },
  B738: { code: "B738", simbriefCode: "B738" },
};

function normalize(value: string | null | undefined) {
  return (value ?? "").trim().toUpperCase();
}

// Mapeo de nombres/nicknames a códigos ICAO
const AIRCRAFT_NAME_MAP: Record<string, string> = {
  // Cessna 208 variants
  "CESSNA 208": "C208",
  "CESSNA 208B": "C208",
  "CESSNA CARAVAN": "C208",
  "CARAVAN": "C208",
  "C208B": "C208",
  "208": "C208",
  "208B": "C208",
  
  // Beechcraft Baron 58
  "BARON 58": "BE58",
  "BEECHCRAFT BARON 58": "BE58",
  "BEECH BARON": "BE58",
  
  // Cessna 172
  "CESSNA 172": "C172",
  "C172S": "C172",
  "172": "C172",
  "SKYHAWK": "C172",
  
  // King Air 350
  "KING AIR 350": "B350",
  "BEECHCRAFT KING AIR 350": "B350",
  "KINGAIR 350": "B350",
  "B300": "B350",
  
  // TBM 930
  "TBM 930": "TBM9",
  "TBM 900": "TBM9",
  "TBM930": "TBM9",
  "TBM": "TBM9",
  "SOCATA TBM": "TBM9",
  
  // ATR 72
  "ATR72": "AT76",
  "ATR 72": "AT76",
  "ATR 72-600": "AT76",
  "ATR72-600": "AT76",
  
  // Airbus A320
  "AIRBUS A320": "A320",
  "A320NEO": "A20N",
  "A320 NEO": "A20N",
  
  // Boeing 737
  "BOEING 737-800": "B738",
  "737-800": "B738",
  "737": "B738",
};

/**
 * Normaliza un nombre/código de aeronave a código ICAO
 * - "Cessna 208B" → "C208"
 * - "C208B" → "C208"
 * - "C208" → "C208"
 */
export function normalizeAircraftCode(input: string | null | undefined): string | null {
  if (!input) return null;
  const normalized = input.trim().toUpperCase();
  
  // Si ya es un código ICAO exacto en el mapeo, devolverlo
  if (MAP[normalized]) {
    return normalized;
  }
  
  // Buscar en el mapa de nombres
  for (const [name, code] of Object.entries(AIRCRAFT_NAME_MAP)) {
    if (normalized.includes(name) || name.includes(normalized)) {
      return code;
    }
  }
  
  // Extraer código ICAO si está al principio (ej: "C208 - Cessna 208B")
  const icaoMatch = normalized.match(/^(C208|C172|BE58|B350|TBM9|AT76|A320|A20N|B738)/);
  if (icaoMatch) {
    return icaoMatch[1];
  }
  
  // Si es exactamente 3-4 caracteres alfanuméricos, asumir que es ICAO
  if (/^[A-Z0-9]{3,4}$/.test(normalized)) {
    return normalized;
  }
  
  return null;
}

/**
 * Compara dos identificadores de aeronave para despacho
 * Acepta equivalencias como C208 vs Cessna 208B
 */
export function isSameDispatchAircraft(
  expectedCode: string | null | undefined,
  ofpAircraftRaw: string | null | undefined,
): boolean {
  const normExpected = normalizeAircraftCode(expectedCode);
  const normOfp = normalizeAircraftCode(ofpAircraftRaw);
  
  if (!normExpected || !normOfp) return false;
  
  // Comparación exacta de códigos normalizados
  return normExpected === normOfp;
}

export function mapAircraftCodeToSimbrief(aircraftCode: string | null | undefined) {
  const code = normalize(aircraftCode);
  if (!code) return { code: "", simbriefCode: "", matched: false, warning: "aircraft code missing" };
  const mapped = MAP[code];
  if (mapped) return { ...mapped, matched: true };
  return {
    code,
    simbriefCode: code,
    matched: false,
    warning: `no exact mapping for ${code}, using fallback`,
  };
}
