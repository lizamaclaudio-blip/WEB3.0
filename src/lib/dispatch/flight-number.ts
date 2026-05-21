/**
 * Helper para manejar números de vuelo PWG
 * Formato: PWG### o PWG#### (3-4 dígitos)
 * Airline ICAO: PWG
 */

const PWG_AIRLINE = "PWG";

/**
 * Extrae número de vuelo numérico de un route_code PWG
 * - "PWG695" → "695"
 * - "PWG1204" → "1204"
 * - "SCTE-SCIE" → null (inválido)
 * - "" → null
 */
export function extractPwgFlightNumber(routeCode: string | null | undefined): string | null {
  if (!routeCode) return null;
  const match = routeCode.match(/^PWG(\d{3,4})$/);
  return match ? match[1] : null;
}

/**
 * Construye callsign completo
 * - "695" → "PWG695"
 */
export function buildPwgCallsign(flightNumber: string): string {
  return `${PWG_AIRLINE}${flightNumber}`;
}

/**
 * Construye route_code completo
 * - "695" → "PWG695"
 */
export function buildPwgRouteCode(flightNumber: string): string {
  return `${PWG_AIRLINE}${flightNumber}`;
}

/**
 * Genera número de vuelo numérico pseudo-aleatorio basado en origen/destino
 * Output: 3 dígitos (100-999)
 */
export function generatePwgFlightNumber(origin: string, destination: string): string {
  const seed = `${origin}${destination}`.split("").reduce((total, char) => total + char.charCodeAt(0), 0);
  return String((seed % 900) + 100).padStart(3, "0");
}

/**
 * Valida si un string es número de vuelo PWG válido (3-4 dígitos)
 */
export function isValidPwgFlightNumber(value: string): boolean {
  return /^\d{3,4}$/.test(value);
}

/**
 * Normaliza un flight number para comparación
 * - "PWG695" → "695"
 * - "695" → "695"
 * - "PWG1204" → "1204"
 */
export function normalizePwgFlightNumber(value: string | null | undefined): string | null {
  if (!value) return null;
  // Quitar prefijo PWG si existe
  const withoutPrefix = value.replace(/^PWG/i, "");
  // Validar que queden 3-4 dígitos
  if (!/^\d{3,4}$/.test(withoutPrefix)) return null;
  return withoutPrefix;
}

/**
 * Compara dos flight numbers PWG de forma flexible
 * Acepta: "PWG695" vs "695" → true
 * Acepta: "PWG695" vs "PWG695" → true
 * Acepta: "695" vs "695" → true
 */
export function isSamePwgFlight(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  const normA = normalizePwgFlightNumber(a);
  const normB = normalizePwgFlightNumber(b);
  if (!normA || !normB) return false;
  return normA === normB;
}

/**
 * Obtiene número de vuelo para SimBrief desde route_code
 * Si route_code es inválido (SCTE-SCIE), genera uno nuevo
 */
export function getSimbriefFlightNumber(
  routeCode: string | null | undefined,
  origin: string,
  destination: string,
): { flightNumber: string; routeCode: string; callsign: string } {
  // Intentar extraer de route_code existente
  const existing = extractPwgFlightNumber(routeCode);
  if (existing) {
    return {
      flightNumber: existing,
      routeCode: buildPwgRouteCode(existing),
      callsign: buildPwgCallsign(existing),
    };
  }

  // Generar nuevo número
  const generated = generatePwgFlightNumber(origin, destination);
  return {
    flightNumber: generated,
    routeCode: buildPwgRouteCode(generated),
    callsign: buildPwgCallsign(generated),
  };
}
