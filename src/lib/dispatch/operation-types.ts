import "server-only";
import { dbOne, dbQuery } from "@/lib/db/client";
import type { AuthenticatedPilot } from "@/lib/auth/service";

export type ScoreMode =
  | "REFERENCE_ONLY"
  | "SCHOOL_OFFICIAL"
  | "OFFICIAL"
  | "MISSION_OFFICIAL"
  | "NONE"
  | "EVENT_OFFICIAL";

export type FlightOperationType = {
  code: string;
  label: string;
  description: string | null;
  score_mode: ScoreMode;
  affects_pilot_position: boolean;
  affects_aircraft_position: boolean;
  affects_economy: boolean;
  affects_ranking: boolean;
  affects_progression: boolean;
  requires_real_aircraft_lock: boolean;
  requires_route: boolean;
  requires_aircraft: boolean;
  requires_payload: boolean;
  requires_simbrief: boolean;
  reservation_expires_minutes: number | null;
  is_active: boolean;
  sort_order: number;
};

export type RankOperationPermissions = {
  rank_code: string;
  display_name: string | null;
  allows_training_free: boolean;
  allows_school_routes: boolean;
  allows_commercial_routes: boolean;
  allows_charter: boolean;
  allows_cargo: boolean;
  allows_aircraft_transfer: boolean;
  allows_pilot_reposition: boolean;
  allows_international: boolean;
  allows_oceanic: boolean;
  allows_long_range: boolean;
  allows_widebody: boolean;
  allows_instructor: boolean;
  allows_admin: boolean;
};

export type OperationTypeForPilot = FlightOperationType & {
  allowed_for_rank: boolean;
  blocked_reason: string | null;
};

const FALLBACK_TRAINING_FREE: FlightOperationType = {
  code: "TRAINING_FREE",
  label: "Entrenamiento libre",
  description: "Vuelo de practica referencial. No mueve piloto ni aeronave.",
  score_mode: "REFERENCE_ONLY",
  affects_pilot_position: false,
  affects_aircraft_position: false,
  affects_economy: false,
  affects_ranking: false,
  affects_progression: false,
  requires_real_aircraft_lock: false,
  requires_route: false,
  requires_aircraft: true,
  requires_payload: false,
  requires_simbrief: false,
  reservation_expires_minutes: 15,
  is_active: true,
  sort_order: 10,
};

function bool(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function safeText(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

export async function listFlightOperationTypes(): Promise<
  FlightOperationType[]
> {
  const result = await dbQuery<FlightOperationType>(
    `select
       code,
       label,
       null::text as description,
       score_mode,
       affects_pilot_position,
       affects_aircraft_position,
       affects_economy,
       affects_ranking,
       affects_progression,
       requires_real_aircraft_lock,
       requires_route,
       requires_aircraft,
       requires_payload,
       requires_simbrief,
       reservation_expires_minutes,
       is_active,
       sort_order
     from public.pw_flight_operation_rules
     where is_active = true
     order by sort_order asc, code asc`,
  );

  return result.rows;
}

export async function getFlightOperationType(
  code: string,
): Promise<FlightOperationType> {
  const normalized = safeText(code).toUpperCase();
  if (!normalized) return FALLBACK_TRAINING_FREE;

  const row = await dbOne<FlightOperationType>(
    `select
       code,
       label,
       null::text as description,
       score_mode,
       affects_pilot_position,
       affects_aircraft_position,
       affects_economy,
       affects_ranking,
       affects_progression,
       requires_real_aircraft_lock,
       requires_route,
       requires_aircraft,
       requires_payload,
       requires_simbrief,
       reservation_expires_minutes,
       is_active,
       sort_order
     from public.pw_flight_operation_rules
     where code = $1
     limit 1`,
    [normalized],
  );

  return (
    row ??
    (normalized === "TRAINING_FREE"
      ? FALLBACK_TRAINING_FREE
      : { ...FALLBACK_TRAINING_FREE, code: normalized, label: normalized })
  );
}

export async function getRankOperationPermissions(
  rankCode: string | null | undefined,
): Promise<RankOperationPermissions | null> {
  const normalized = safeText(rankCode).toUpperCase();
  if (!normalized) return null;

  return await dbOne<RankOperationPermissions>(
    `select
       rank_code,
       display_name,
       coalesce(allows_training_free, true) as allows_training_free,
       coalesce(allows_school_routes, false) as allows_school_routes,
       coalesce(allows_commercial_routes, false) as allows_commercial_routes,
       coalesce(allows_charter, false) as allows_charter,
       coalesce(allows_cargo, false) as allows_cargo,
       coalesce(allows_aircraft_transfer, false) as allows_aircraft_transfer,
       coalesce(allows_pilot_reposition, true) as allows_pilot_reposition,
       coalesce(allows_international, false) as allows_international,
       coalesce(allows_oceanic, false) as allows_oceanic,
       coalesce(allows_long_range, false) as allows_long_range,
       coalesce(allows_widebody, false) as allows_widebody,
       coalesce(allows_instructor, false) as allows_instructor,
       coalesce(allows_admin, false) as allows_admin
     from public.pilot_ranks
     where rank_code = $1
     limit 1`,
    [normalized],
  );
}

export function canRankUseOperation(
  operationCode: string,
  permissions: RankOperationPermissions | null,
): { allowed: boolean; reason: string | null } {
  const code = safeText(operationCode).toUpperCase();
  if (!permissions) return { allowed: false, reason: "Rango no configurado." };

  if (code === "TRAINING_FREE")
    return bool(permissions.allows_training_free, true)
      ? { allowed: true, reason: null }
      : { allowed: false, reason: "Tu rango no permite entrenamiento libre." };

  if (code === "SCHOOL_OFFICIAL_ROUTE")
    return bool(permissions.allows_school_routes, false)
      ? { allowed: true, reason: null }
      : { allowed: false, reason: "Tu rango aun no permite rutas oficiales." };

  if (code === "COMMERCIAL_OFFICIAL_ROUTE")
    return bool(permissions.allows_commercial_routes, false)
      ? { allowed: true, reason: null }
      : {
          allowed: false,
          reason: "Tu rango aun no permite rutas oficiales comerciales.",
        };

  if (code === "CHARTER_OFFICIAL")
    return bool(permissions.allows_charter, false)
      ? { allowed: true, reason: null }
      : {
          allowed: false,
          reason: "Tu rango actual aun no permite charter oficial.",
        };

  if (code === "CARGO_OFFICIAL")
    return bool(permissions.allows_cargo, false)
      ? { allowed: true, reason: null }
      : {
          allowed: false,
          reason: "Tu rango actual aun no permite operaciones de carga.",
        };

  if (code === "AIRCRAFT_TRANSFER")
    return bool(permissions.allows_aircraft_transfer, false)
      ? { allowed: true, reason: null }
      : {
          allowed: false,
          reason: "Tu rango actual aun no permite traslados de aeronave.",
        };

  if (code === "PILOT_REPOSITION")
    return bool(permissions.allows_pilot_reposition, true)
      ? { allowed: true, reason: null }
      : {
          allowed: false,
          reason: "Tu rango actual no permite reposicionamiento del piloto.",
        };

  if (code === "EVENT_TOUR") return { allowed: true, reason: null };

  return { allowed: false, reason: "Tipo de operacion no reconocido." };
}

export async function listOperationTypesForPilot(
  user: AuthenticatedPilot,
): Promise<{
  operationTypes: OperationTypeForPilot[];
  permissions: RankOperationPermissions | null;
}> {
  const [operationTypes, permissions] = await Promise.all([
    listFlightOperationTypes(),
    getRankOperationPermissions(user.rankCode),
  ]);

  return {
    permissions,
    operationTypes: operationTypes.map((operation) => {
      const rank = canRankUseOperation(operation.code, permissions);
      return {
        ...operation,
        allowed_for_rank: rank.allowed,
        blocked_reason: rank.reason,
      };
    }),
  };
}
