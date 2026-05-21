import { restRpc, restSelect } from "@/lib/supabase/rest-server";

type Row = Record<string, unknown>;

export type PilotPermissionProfile = {
  id: string;
  callsign: string;
  rankCode: string;
  baseIcao: string;
  currentAirportIcao: string;
  licenses: string[];
  ratings: string[];
};

export type PilotPermissions = {
  pilot: PilotPermissionProfile;
  permittedAircraftTypes: string[];
  permittedAircraftSet: Set<string>;
  allowedDispatchAirports: string[];
  source: "supabase";
};

export type PermissionCheck = {
  allowed: boolean;
  reason: string | null;
};

const AIRCRAFT_PERMISSION_FAMILIES: Record<string, string[]> = {
  C172: ["C172", "C172_MSFS"],
  C208: ["C208", "C208_MSFS", "C208_BLACKSQUARE"],
  BE58: ["BE58", "BE58_MSFS", "BE58_BLACKSQUARE", "BE58_BS_PRO"],
  B350: ["B350", "B350_MSFS", "B350_BLACKSQUARE"],
  TBM9: ["TBM9", "TBM9_MSFS", "TBM8_BLACKSQUARE"],
  TBM8: ["TBM8", "TBM8_BLACKSQUARE", "TBM9_MSFS"],
  ATR72: ["ATR72", "AT76", "ATR72_MSFS"],
  AT76: ["AT76", "ATR72", "ATR72_MSFS"],
  E175: ["E175", "E175_FLIGHTSIM"],
  E190: ["E190", "E190_FLIGHTSIM"],
  E195: ["E195", "E195_FLIGHTSIM"],
  A319: ["A319", "A319_FENIX", "A319_LATINVFR"],
  A320: ["A320", "A320_FENIX", "A320_LATINVFR"],
  A20N: ["A20N", "A20N_FBW"],
  A321: ["A321", "A321_FENIX"],
  A21N: ["A21N", "A21N_LATINVFR"],
  A339: ["A339", "A339_HEADWIND"],
  A359: ["A359", "A359_INIBUILDS"],
  B736: ["B736", "B736_PMDG"],
  B737: ["B737", "B737_PMDG"],
  B738: ["B738", "B738_PMDG"],
  B739: ["B739", "B739_PMDG"],
  B38M: ["B38M", "B38M_IFLY"],
  B772: ["B772", "B772_PMDG"],
  B77W: ["B77W", "B77W_PMDG"],
  B789: ["B789", "B789_HORIZONS"],
  B78X: ["B78X", "B78X_MSFS"],
  MD82: ["MD82", "MD82_MADDOG"],
  MD83: ["MD83", "MD83_MADDOG"],
  MD88: ["MD88", "MD88_MADDOG"],
};

const RANK_ORDER = [
  "CADET",
  "SECOND_OFFICER",
  "JUNIOR_OFFICER",
  "FIRST_OFFICER",
  "SENIOR_FIRST_OFFICER",
  "CAPTAIN",
  "COMMANDER",
];

const LOW_RANK_DISPATCH_CODES = new Set(["CADET", "SECOND_OFFICER"]);

function normalizeUpper(value: unknown) {
  return typeof value === "string" ? value.trim().toUpperCase() : "";
}

function readText(row: Row, keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function tokenize(value: unknown) {
  if (Array.isArray(value)) return value.map(normalizeUpper).filter(Boolean);
  if (typeof value !== "string") return [];
  return value
    .split(/[,\n;|]+/)
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean);
}

function expandAircraftPermissionAliases(value: unknown) {
  const normalized = normalizeUpper(value);
  if (!normalized) return [];
  const family = normalized.split("_")[0] ?? normalized;
  const aliases = AIRCRAFT_PERMISSION_FAMILIES[family];
  return aliases ? Array.from(new Set([...aliases, normalized])) : [normalized];
}

function addPermittedTypeAliases(permitted: Set<string>, value: unknown) {
  for (const alias of expandAircraftPermissionAliases(value)) {
    permitted.add(alias);
  }
}

function collectPermittedTypesFromRows(rows: Row[]) {
  const permitted = new Set<string>();
  for (const row of rows) {
    addPermittedTypeAliases(permitted, row.aircraft_type_code);
    addPermittedTypeAliases(permitted, row.variant_aircraft_type_code);
    addPermittedTypeAliases(permitted, row.aircraft_family_code);
    addPermittedTypeAliases(permitted, row.family_code);
    addPermittedTypeAliases(permitted, row.variant_code);
  }
  return permitted;
}

function rankMeetsRequirement(currentRank: string, requiredRank: string) {
  if (!requiredRank) return true;
  const currentIndex = RANK_ORDER.indexOf(normalizeUpper(currentRank));
  const requiredIndex = RANK_ORDER.indexOf(normalizeUpper(requiredRank));
  if (requiredIndex < 0) return true;
  return currentIndex >= requiredIndex;
}

function normalizeRankCode(value: unknown) {
  return normalizeUpper(value) || "CADET";
}

function getProfileAirport(profile: Row) {
  return normalizeUpper(profile.current_airport_icao ?? profile.current_airport_code ?? profile.base_hub);
}

async function fetchPilotPermittedAircraftTypes(profile: PilotPermissionProfile, token: string | null) {
  const rankCode = normalizeRankCode(profile.rankCode);

  const directPermissions = collectPermittedTypesFromRows(
    await restSelect<Row>(
      "pilot_rank_aircraft_permissions",
      `select=*&rank_code=eq.${encodeURIComponent(rankCode)}`,
      { bearer: token },
    ),
  );
  if (directPermissions.size > 0) return directPermissions;

  const rankVariants = collectPermittedTypesFromRows(
    await restSelect<Row>(
      "pw_v_rank_allowed_variants",
      `select=*&rank_code=eq.${encodeURIComponent(rankCode)}`,
      { bearer: token },
    ),
  );
  if (rankVariants.size > 0) return rankVariants;

  const families = await restSelect<Row>(
    "pw_pilot_rank_aircraft_families",
    `select=*&rank_code=eq.${encodeURIComponent(rankCode)}&or=(is_active.is.true,is_active.is.null)`,
    { bearer: token },
  );
  const familyCodes = families
    .map((row) => readText(row, ["aircraft_family_code", "family_code"]))
    .filter(Boolean);

  if (familyCodes.length > 0) {
    const familyVariants = collectPermittedTypesFromRows(
      await restSelect<Row>(
        "pw_aircraft_family_variants",
        `select=*&family_code=in.(${familyCodes.map(encodeURIComponent).join(",")})&or=(is_active.is.true,is_active.is.null)`,
        { bearer: token },
      ),
    );
    if (familyVariants.size > 0) return familyVariants;
  }

  const rpcRows = await restRpc<Row[]>(
    "pw_get_available_aircraft_display",
    { p_callsign: profile.callsign },
    { bearer: token, fallback: [] },
  );
  const rpcPermissions = collectPermittedTypesFromRows(Array.isArray(rpcRows) ? rpcRows : []);
  return rpcPermissions;
}

async function resolveDispatchOriginAirports(profile: PilotPermissionProfile, token: string | null, permittedTypes: Set<string>) {
  const primaryAirport = normalizeUpper(profile.currentAirportIcao || profile.baseIcao);
  if (!primaryAirport) return [];

  if (!LOW_RANK_DISPATCH_CODES.has(profile.rankCode) || permittedTypes.size === 0) {
    return [primaryAirport];
  }

  const schoolHubs = await restSelect<Row>(
    "airports",
    "select=*&is_hub=eq.true&or=(category.ilike.*ESCUELA*,hub_code.ilike.*ESCUELA*)&order=ident.asc&limit=20",
    { bearer: token },
  );
  const codes = schoolHubs.map((row) => normalizeUpper(row.ident ?? row.icao_code)).filter(Boolean);
  return Array.from(new Set([primaryAirport, ...codes]));
}

export async function getPilotPermissions(
  pilotId: string,
  token: string | null,
  profileRow?: Row | null,
): Promise<PilotPermissions | null> {
  const profile =
    profileRow ??
    (await restSelect<Row>(
      "pilot_profiles",
      `select=*&id=eq.${encodeURIComponent(pilotId)}&limit=1`,
      { bearer: token },
    ))[0] ??
    null;

  if (!profile) return null;

  const rankCode = normalizeRankCode(profile.career_rank_code ?? profile.rank_code);
  const callsign = normalizeUpper(profile.callsign);
  const baseIcao = normalizeUpper(profile.base_hub);
  const currentAirportIcao = getProfileAirport(profile) || baseIcao;
  const pilot: PilotPermissionProfile = {
    id: pilotId,
    callsign,
    rankCode,
    baseIcao,
    currentAirportIcao,
    licenses: tokenize(profile.active_qualifications ?? profile.licenses),
    ratings: tokenize(profile.active_certifications ?? profile.ratings),
  };
  const permittedAircraftSet = await fetchPilotPermittedAircraftTypes(pilot, token);
  const allowedDispatchAirports = await resolveDispatchOriginAirports(pilot, token, permittedAircraftSet);

  return {
    pilot,
    permittedAircraftTypes: Array.from(permittedAircraftSet).sort(),
    permittedAircraftSet,
    allowedDispatchAirports,
    source: "supabase",
  };
}

export function canPilotFlyAircraft(
  permissions: PilotPermissions | null,
  aircraft: Row,
): PermissionCheck {
  if (!permissions) return { allowed: false, reason: "Perfil pendiente" };
  const active = aircraft.is_active !== false;
  if (!active) return { allowed: false, reason: "Aeronave no disponible" };

  const status = normalizeUpper(aircraft.status || "available");
  if (status && !["AVAILABLE", "DISPONIBLE", "ACTIVE"].includes(status)) {
    return { allowed: false, reason: "Aeronave no disponible" };
  }

  const typeCode = readText(aircraft, ["aircraft_model_code", "aircraft_type_code", "icao_code", "airframe_code"]);
  const isPermitted = expandAircraftPermissionAliases(typeCode).some((code) => permissions.permittedAircraftSet.has(code));
  if (!isPermitted) return { allowed: false, reason: "Licencia no registrada" };

  const currentAirport = normalizeUpper(aircraft.current_airport_code ?? aircraft.current_airport_icao);
  if (currentAirport && permissions.allowedDispatchAirports.length > 0 && !permissions.allowedDispatchAirports.includes(currentAirport)) {
    return { allowed: false, reason: "La aeronave no está en tu aeropuerto de origen" };
  }

  return { allowed: true, reason: null };
}

export function canPilotFlyRoute(
  permissions: PilotPermissions | null,
  route: Row,
): PermissionCheck {
  if (!permissions) return { allowed: false, reason: "Perfil pendiente" };
  if (route.is_active === false) return { allowed: false, reason: "Ruta no habilitada" };

  const requiredRank = normalizeUpper(route.min_rank_code ?? route.rank_required ?? route.required_rank);
  if (!rankMeetsRequirement(permissions.pilot.rankCode, requiredRank)) {
    return { allowed: false, reason: `Requiere rango ${requiredRank.replaceAll("_", " ")}` };
  }

  const origin = normalizeUpper(route.origin_ident ?? route.origin_icao);
  if (origin && permissions.allowedDispatchAirports.length > 0 && !permissions.allowedDispatchAirports.includes(origin)) {
    return { allowed: false, reason: "Ruta fuera de tu aeropuerto actual" };
  }

  const compatibleRaw = route.compatible_aircraft_types;
  const compatibleTypes = Array.isArray(compatibleRaw)
    ? compatibleRaw.map(normalizeUpper).filter(Boolean)
    : tokenize(compatibleRaw ?? route.aircraft_type_code);
  if (compatibleTypes.length > 0 && !compatibleTypes.some((type) => expandAircraftPermissionAliases(type).some((code) => permissions.permittedAircraftSet.has(code)))) {
    return { allowed: false, reason: "Requiere habilitación de aeronave" };
  }

  return { allowed: true, reason: null };
}

export function canPilotStartTraining(permissions: PilotPermissions | null, training: Row): PermissionCheck {
  if (!permissions) return { allowed: false, reason: "Perfil pendiente" };
  const requiredRank = normalizeUpper(training.rank_required ?? training.required_rank);
  if (!rankMeetsRequirement(permissions.pilot.rankCode, requiredRank)) {
    return { allowed: false, reason: `Requiere rango ${requiredRank.replaceAll("_", " ")}` };
  }
  return { allowed: true, reason: null };
}

export function getBlockedReason(check: PermissionCheck) {
  return check.allowed ? null : check.reason ?? "No disponible";
}
