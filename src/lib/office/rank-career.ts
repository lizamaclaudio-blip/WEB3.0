import "server-only";

import { dbOne, dbQuery, existingColumns, tableExists } from "@/lib/db/client";
import type { AuthenticatedPilot } from "@/lib/auth/service";

const DEFAULT_RANKS = [
  { rank_code: "CADET", display_name: "Cadet", rank_order: 1, required_hours_in_rank: 10, required_flights_in_rank: 8 },
  { rank_code: "SECOND_OFFICER", display_name: "Second Officer", rank_order: 2, required_hours_in_rank: 20, required_flights_in_rank: 10 },
  { rank_code: "FIRST_OFFICER", display_name: "First Officer", rank_order: 3, required_hours_in_rank: 40, required_flights_in_rank: 15 },
  { rank_code: "SENIOR_FIRST_OFFICER", display_name: "Senior First Officer", rank_order: 4, required_hours_in_rank: 75, required_flights_in_rank: 20 },
  { rank_code: "CAPTAIN", display_name: "Captain", rank_order: 5, required_hours_in_rank: 150, required_flights_in_rank: 30 },
  { rank_code: "SENIOR_CAPTAIN", display_name: "Senior Captain", rank_order: 6, required_hours_in_rank: 200, required_flights_in_rank: 35 },
  { rank_code: "TRAINING_CAPTAIN", display_name: "Training Captain", rank_order: 7, required_hours_in_rank: 250, required_flights_in_rank: 40 },
  { rank_code: "COMMANDER", display_name: "Commander", rank_order: 8, required_hours_in_rank: 300, required_flights_in_rank: 45 },
  { rank_code: "SENIOR_COMMANDER", display_name: "Senior Commander", rank_order: 9, required_hours_in_rank: 500, required_flights_in_rank: 60 },
  { rank_code: "CHIEF_PILOT", display_name: "Chief Pilot", rank_order: 10, required_hours_in_rank: 500, required_flights_in_rank: 60 },
];

const RANK_ACCENTS: Record<string, "green" | "blue" | "red"> = {
  CADET: "green",
  SECOND_OFFICER: "green",
  FIRST_OFFICER: "green",
  SENIOR_FIRST_OFFICER: "green",
  CAPTAIN: "green",
  SENIOR_CAPTAIN: "green",
  TRAINING_CAPTAIN: "blue",
  COMMANDER: "blue",
  SENIOR_COMMANDER: "red",
  CHIEF_PILOT: "red",
};

const RANK_CERT_REQUIREMENTS: Record<string, string[]> = {
  CADET: ["C172", "BE58"],
  SECOND_OFFICER: ["C208", "B350", "TBM9"],
  FIRST_OFFICER: ["AT76", "E175"],
  SENIOR_FIRST_OFFICER: ["A319", "B737"],
  CAPTAIN: ["A320", "A20N", "B738"],
  SENIOR_CAPTAIN: ["B739", "B38M", "MD88"],
  TRAINING_CAPTAIN: ["A320", "B738"],
  COMMANDER: ["B78X", "B789", "A339"],
  SENIOR_COMMANDER: ["A359", "B77W"],
  CHIEF_PILOT: ["B78X", "A359"],
};

const RANK_RATING_REQUIREMENTS: Record<string, string[]> = {
  CADET: ["Licencia Regular", "VFR local"],
  SECOND_OFFICER: ["Instrumental I", "Viento cruzado 20KT"],
  FIRST_OFFICER: ["Instrumental II", "Turboprop"],
  SENIOR_FIRST_OFFICER: ["Jet Narrowbody inicial"],
  CAPTAIN: ["Instrumental CAT I", "Jet Narrowbody"],
  SENIOR_CAPTAIN: ["Instrumental CAT II", "Operación internacional"],
  TRAINING_CAPTAIN: ["Instructor interno", "SOP evaluador"],
  COMMANDER: ["Widebody", "Operación oceánica"],
  SENIOR_COMMANDER: ["Widebody avanzado", "Long range"],
  CHIEF_PILOT: ["Administración operacional", "Instructor jefe"],
};

const RANK_THEORY_REQUIREMENTS: Record<string, string[]> = {
  CADET: ["Normativa Patagonia Wings", "Comunicaciones básicas"],
  SECOND_OFFICER: ["Meteorología operacional", "Plan de vuelo"],
  FIRST_OFFICER: ["SimBrief / OFP", "Procedimientos IFR"],
  SENIOR_FIRST_OFFICER: ["SOP regional", "Performance jet inicial"],
  CAPTAIN: ["Performance narrowbody", "CRM operacional"],
  SENIOR_CAPTAIN: ["Operaciones internacionales", "ETOPS básico"],
  TRAINING_CAPTAIN: ["Evaluación de pilotos", "Metodología instruccional"],
  COMMANDER: ["Operaciones widebody", "Oceánico / long range"],
  SENIOR_COMMANDER: ["Gestión operacional avanzada", "Seguridad operacional"],
  CHIEF_PILOT: ["Administración de flota", "Normativa interna avanzada"],
};

type RankRow = {
  rank_code: string;
  display_name: string | null;
  rank_order: number | string | null;
  required_hours_in_rank: number | string | null;
  required_flights_in_rank: number | string | null;
  allows_training_free?: boolean | null;
  allows_school_routes?: boolean | null;
  allows_commercial_routes?: boolean | null;
  allows_charter?: boolean | null;
  allows_cargo?: boolean | null;
  allows_aircraft_transfer?: boolean | null;
  allows_pilot_reposition?: boolean | null;
  allows_international?: boolean | null;
  allows_oceanic?: boolean | null;
  allows_long_range?: boolean | null;
  allows_widebody?: boolean | null;
  allows_instructor?: boolean | null;
  allows_admin?: boolean | null;
};

type ProfileMetricsRow = {
  total_hours: number | string | null;
  career_hours: number | string | null;
  transferred_hours: number | string | null;
  total_pireps: number | string | null;
  completed_flights: number | string | null;
  pw_score: number | string | null;
  score: number | string | null;
};

type AircraftPermissionRow = {
  rank_code: string;
  model_code: string;
  model_name: string | null;
  practical_range_nm: number | string | null;
  seats: number | string | null;
  is_widebody: boolean | null;
  is_cargo: boolean | null;
  is_training: boolean | null;
};

export type OfficeRankAircraft = {
  code: string;
  name: string;
  rangeNm: number | null;
  seats: number | null;
  status: "AVAILABLE" | "LOCKED";
  label: string;
};

export type OfficeRankRequirement = {
  label: string;
  required: string;
  current: string;
  complete: boolean;
};

export type OfficeRankProgress = {
  rankCode: string;
  displayName: string;
  rankOrder: number;
  accent: "green" | "blue" | "red";
  state: "ACHIEVED" | "CURRENT" | "LOCKED";
  progressPercent: number;
  requirements: OfficeRankRequirement[];
  certifications: string[];
  ratings: string[];
  theoryExams: string[];
  aircraft: OfficeRankAircraft[];
  permissions: {
    training: boolean;
    schoolRoutes: boolean;
    commercialRoutes: boolean;
    charter: boolean;
    cargo: boolean;
    aircraftTransfer: boolean;
    pilotReposition: boolean;
    international: boolean;
    oceanic: boolean;
    longRange: boolean;
    widebody: boolean;
    instructor: boolean;
    admin: boolean;
  };
};

export type OfficeCareerPayload = {
  pilot: {
    callsign: string | null;
    displayName: string | null;
    rankCode: string;
    totalHours: number;
    totalFlights: number;
    score: number;
  };
  ranks: OfficeRankProgress[];
  updatedAt: string;
};

function text(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function upper(value: unknown, fallback = "") {
  return text(value, fallback).toUpperCase();
}

function toNumber(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function bool(value: unknown) {
  return value === true || value === "true" || value === 1 || value === "1";
}

function rankLabel(code: string, fallback?: string | null) {
  const normalized = code.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  return text(fallback, normalized || code);
}

function normalizeRanks(rows: RankRow[]) {
  const source = rows.length ? rows : DEFAULT_RANKS;
  return source
    .map((row): RankRow => ({
      ...row,
      rank_code: upper(row.rank_code),
      display_name: text(row.display_name, rankLabel(upper(row.rank_code))),
      rank_order: toNumber(row.rank_order, 99),
      required_hours_in_rank: toNumber(row.required_hours_in_rank, 0),
      required_flights_in_rank: toNumber(row.required_flights_in_rank, 0),
    }))
    .filter((row) => row.rank_code)
    .sort((a, b) => toNumber(a.rank_order, 99) - toNumber(b.rank_order, 99));
}

async function loadRanks(): Promise<RankRow[]> {
  if (!(await tableExists("pilot_ranks"))) return normalizeRanks([]);

  const columns = await existingColumns("pilot_ranks", [
    "rank_code",
    "display_name",
    "rank_order",
    "required_hours_in_rank",
    "required_flights_in_rank",
    "allows_training_free",
    "allows_training",
    "allows_school_routes",
    "allows_commercial_routes",
    "allows_passenger",
    "allows_charter",
    "allows_cargo",
    "allows_aircraft_transfer",
    "allows_pilot_reposition",
    "allows_positioning",
    "allows_international",
    "allows_oceanic",
    "allows_long_range",
    "allows_widebody",
    "allows_instructor",
    "allows_admin",
  ]);

  if (!columns.has("rank_code")) return normalizeRanks([]);

  const select = [
    "rank_code",
    columns.has("display_name") ? "display_name" : "rank_code as display_name",
    columns.has("rank_order") ? "rank_order" : "99::int as rank_order",
    columns.has("required_hours_in_rank") ? "required_hours_in_rank" : "0::numeric as required_hours_in_rank",
    columns.has("required_flights_in_rank") ? "required_flights_in_rank" : "0::int as required_flights_in_rank",
    columns.has("allows_training_free") ? "allows_training_free" : columns.has("allows_training") ? "allows_training as allows_training_free" : "true as allows_training_free",
    columns.has("allows_school_routes") ? "allows_school_routes" : "false as allows_school_routes",
    columns.has("allows_commercial_routes") ? "allows_commercial_routes" : columns.has("allows_passenger") ? "allows_passenger as allows_commercial_routes" : "false as allows_commercial_routes",
    columns.has("allows_charter") ? "allows_charter" : "false as allows_charter",
    columns.has("allows_cargo") ? "allows_cargo" : "false as allows_cargo",
    columns.has("allows_aircraft_transfer") ? "allows_aircraft_transfer" : "false as allows_aircraft_transfer",
    columns.has("allows_pilot_reposition") ? "allows_pilot_reposition" : columns.has("allows_positioning") ? "allows_positioning as allows_pilot_reposition" : "true as allows_pilot_reposition",
    columns.has("allows_international") ? "allows_international" : "false as allows_international",
    columns.has("allows_oceanic") ? "allows_oceanic" : "false as allows_oceanic",
    columns.has("allows_long_range") ? "allows_long_range" : "false as allows_long_range",
    columns.has("allows_widebody") ? "allows_widebody" : "false as allows_widebody",
    columns.has("allows_instructor") ? "allows_instructor" : "false as allows_instructor",
    columns.has("allows_admin") ? "allows_admin" : "false as allows_admin",
  ];

  const result = await dbQuery<RankRow>(
    `select ${select.join(",\n       ")}
     from public.pilot_ranks
     order by ${columns.has("rank_order") ? "rank_order" : "rank_code"} asc`,
  );

  return normalizeRanks(result.rows);
}

async function loadPilotMetrics(user: AuthenticatedPilot): Promise<{ totalHours: number; totalFlights: number; score: number }> {
  if (!(await tableExists("pilot_profiles")) || !user.userId) return { totalHours: 0, totalFlights: 0, score: 0 };

  const columns = await existingColumns("pilot_profiles", [
    "total_hours",
    "career_hours",
    "transferred_hours",
    "total_pireps",
    "completed_flights",
    "pw_score",
    "score",
  ]);

  const select = [
    columns.has("total_hours") ? "total_hours" : "0::numeric as total_hours",
    columns.has("career_hours") ? "career_hours" : "0::numeric as career_hours",
    columns.has("transferred_hours") ? "transferred_hours" : "0::numeric as transferred_hours",
    columns.has("total_pireps") ? "total_pireps" : "0::int as total_pireps",
    columns.has("completed_flights") ? "completed_flights" : "0::int as completed_flights",
    columns.has("pw_score") ? "pw_score" : "0::numeric as pw_score",
    columns.has("score") ? "score" : "0::numeric as score",
  ];

  const row = await dbOne<ProfileMetricsRow>(
    `select ${select.join(", ")}
     from public.pilot_profiles
     where id = $1::uuid
     limit 1`,
    [user.userId],
  );

  return {
    totalHours: toNumber(row?.total_hours) || toNumber(row?.career_hours) || toNumber(row?.transferred_hours),
    totalFlights: toNumber(row?.total_pireps) || toNumber(row?.completed_flights),
    score: toNumber(row?.pw_score) || toNumber(row?.score),
  };
}

async function loadAircraftPermissions(): Promise<Map<string, OfficeRankAircraft[]>> {
  const byRank = new Map<string, OfficeRankAircraft[]>();
  if (!(await tableExists("rank_aircraft_permissions"))) return byRank;

  const hasModels = await tableExists("aircraft_models");
  const hasPerformance = await tableExists("aircraft_performance_profiles");

  const modelJoin = hasModels ? "left join public.aircraft_models am on am.model_code = rap.model_code" : "left join lateral (select rap.model_code as model_code, null::text as model_name, null::uuid as id) am on true";
  const performanceJoin = hasModels && hasPerformance
    ? "left join public.aircraft_performance_profiles app on app.model_id = am.id"
    : "left join lateral (select null::numeric as practical_range_nm, null::integer as seats, false as is_widebody, false as is_cargo, false as is_training) app on true";

  const result = await dbQuery<AircraftPermissionRow>(
    `select
       rap.rank_code,
       rap.model_code,
       am.model_name,
       app.practical_range_nm,
       app.seats,
       app.is_widebody,
       app.is_cargo,
       app.is_training
     from public.rank_aircraft_permissions rap
     ${modelJoin}
     ${performanceJoin}
     order by rap.rank_code asc, rap.model_code asc`,
  );

  for (const row of result.rows) {
    const rankCode = upper(row.rank_code);
    const code = upper(row.model_code, "N/D");
    const items = byRank.get(rankCode) ?? [];
    items.push({
      code,
      name: text(row.model_name, code),
      rangeNm: row.practical_range_nm == null ? null : toNumber(row.practical_range_nm),
      seats: row.seats == null ? null : toNumber(row.seats),
      status: "LOCKED",
      label: "No disponible",
    });
    byRank.set(rankCode, items);
  }

  return byRank;
}

function buildRequirement(label: string, required: number, current: number, suffix = ""): OfficeRankRequirement {
  return {
    label,
    required: `${required.toLocaleString("es-CL")}${suffix}`,
    current: `${Math.min(current, required).toLocaleString("es-CL")}${suffix}`,
    complete: current >= required,
  };
}

function buildCountRequirement(label: string, required: number, current: number): OfficeRankRequirement {
  return {
    label,
    required: required ? String(required) : "No requerido",
    current: required ? String(Math.min(current, required)) : "OK",
    complete: required ? current >= required : true,
  };
}

function completionFromRequirements(requirements: OfficeRankRequirement[]) {
  if (!requirements.length) return 100;
  const completed = requirements.filter((item) => item.complete).length;
  return Math.round((completed / requirements.length) * 100);
}

export async function loadOfficeCareer(user: AuthenticatedPilot): Promise<OfficeCareerPayload> {
  const [ranks, metrics, aircraftByRank] = await Promise.all([
    loadRanks(),
    loadPilotMetrics(user),
    loadAircraftPermissions(),
  ]);

  const currentRankCode = upper(user.rankCode, "CADET");
  const currentRank = ranks.find((rank) => upper(rank.rank_code) === currentRankCode) ?? ranks[0];
  const currentOrder = toNumber(currentRank?.rank_order, 1);

  const rankPayload = ranks.map((rank): OfficeRankProgress => {
    const rankCode = upper(rank.rank_code);
    const rankOrder = toNumber(rank.rank_order, 99);
    const hoursRequired = toNumber(rank.required_hours_in_rank, 0);
    const flightsRequired = toNumber(rank.required_flights_in_rank, 0);
    const certifications = RANK_CERT_REQUIREMENTS[rankCode] ?? [];
    const ratings = RANK_RATING_REQUIREMENTS[rankCode] ?? [];
    const theoryExams = RANK_THEORY_REQUIREMENTS[rankCode] ?? [];
    const isReached = currentOrder >= rankOrder;
    const isCurrent = currentRankCode === rankCode;

    const requirements: OfficeRankRequirement[] = [
      buildRequirement("Horas en rango", hoursRequired, metrics.totalHours, " h"),
      buildCountRequirement("PIREPs / vuelos", flightsRequired, metrics.totalFlights),
      buildCountRequirement("Certificaciones", certifications.length, isReached ? certifications.length : 0),
      buildCountRequirement("Habilitaciones", ratings.length, isReached ? Math.min(ratings.length, isCurrent ? 0 : ratings.length) : 0),
      buildCountRequirement("Teoricos", theoryExams.length, isReached ? Math.min(theoryExams.length, isCurrent ? 0 : theoryExams.length) : 0),
    ];

    const aircraft = (aircraftByRank.get(rankCode) ?? []).map((item) => ({
      ...item,
      status: isReached ? "AVAILABLE" as const : "LOCKED" as const,
      label: isReached ? "Disponible" : "Bloqueada",
    }));

    return {
      rankCode,
      displayName: rankLabel(rankCode, rank.display_name),
      rankOrder,
      accent: RANK_ACCENTS[rankCode] ?? "green",
      state: isCurrent ? "CURRENT" : isReached ? "ACHIEVED" : "LOCKED",
      progressPercent: isReached ? 100 : completionFromRequirements(requirements),
      requirements,
      certifications,
      ratings,
      theoryExams,
      aircraft,
      permissions: {
        training: bool(rank.allows_training_free),
        schoolRoutes: bool(rank.allows_school_routes),
        commercialRoutes: bool(rank.allows_commercial_routes),
        charter: bool(rank.allows_charter),
        cargo: bool(rank.allows_cargo),
        aircraftTransfer: bool(rank.allows_aircraft_transfer),
        pilotReposition: bool(rank.allows_pilot_reposition),
        international: bool(rank.allows_international),
        oceanic: bool(rank.allows_oceanic),
        longRange: bool(rank.allows_long_range),
        widebody: bool(rank.allows_widebody),
        instructor: bool(rank.allows_instructor),
        admin: bool(rank.allows_admin),
      },
    };
  });

  return {
    pilot: {
      callsign: user.callsign,
      displayName: user.displayName,
      rankCode: currentRankCode,
      totalHours: Math.round(metrics.totalHours * 10) / 10,
      totalFlights: metrics.totalFlights,
      score: Math.round(metrics.score),
    },
    ranks: rankPayload,
    updatedAt: new Date().toISOString(),
  };
}
