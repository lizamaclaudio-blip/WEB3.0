import { columnExists, dbOne, existingColumns, quoteIdent, tableExists } from "@/lib/db/client";

export type PublicStats = {
  pilots: number;
  totalFlights: number;
  transportedPassengers: number;
  flownHours: number;
  todayFlights: number;
  source: "neon";
  updatedAt: string;
};

function asNumber(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function startOfTodayUtc() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
}

function emptyStats(): PublicStats {
  return {
    pilots: 0,
    totalFlights: 0,
    transportedPassengers: 0,
    flownHours: 0,
    todayFlights: 0,
    source: "neon",
    updatedAt: new Date().toISOString(),
  };
}

async function countPilots() {
  if (!(await tableExists("pilot_profiles"))) return 0;

  if (await columnExists("pilot_profiles", "pilot_status")) {
    const row = await dbOne<{ total: string }>(
      `select count(*)::text as total
       from public.pilot_profiles
       where coalesce(pilot_status, '') <> 'DELETED'`,
    );
    return asNumber(row?.total);
  }

  if (await columnExists("pilot_profiles", "status")) {
    const row = await dbOne<{ total: string }>(
      `select count(*)::text as total
       from public.pilot_profiles
       where coalesce(status, '') not in ('deleted', 'DELETED')`,
    );
    return asNumber(row?.total);
  }

  const row = await dbOne<{ total: string }>("select count(*)::text as total from public.pilot_profiles");
  return asNumber(row?.total);
}

async function flightStatusColumn() {
  if (!(await tableExists("flight_reservations"))) return null;
  if (await columnExists("flight_reservations", "status")) return "status";
  if (await columnExists("flight_reservations", "reservation_status")) return "reservation_status";
  return null;
}

async function completedAtColumn() {
  if (!(await tableExists("flight_reservations"))) return null;

  for (const column of ["completed_at", "actual_arrival_at", "updated_at", "created_at"]) {
    if (await columnExists("flight_reservations", column)) return column;
  }

  return null;
}

async function countCompletedFlights() {
  if (!(await tableExists("flight_reservations"))) return 0;

  const statusColumn = await flightStatusColumn();
  if (!statusColumn) {
    const row = await dbOne<{ total: string }>("select count(*)::text as total from public.flight_reservations");
    return asNumber(row?.total);
  }

  const row = await dbOne<{ total: string }>(
    `select count(*)::text as total
     from public.flight_reservations
     where upper(coalesce(${quoteIdent(statusColumn)}::text, '')) = 'COMPLETED'`,
  );

  return asNumber(row?.total);
}

async function countTodayFlights() {
  if (!(await tableExists("flight_reservations"))) return 0;

  const statusColumn = await flightStatusColumn();
  const dateColumn = await completedAtColumn();
  if (!statusColumn || !dateColumn) return 0;

  const row = await dbOne<{ total: string }>(
    `select count(*)::text as total
     from public.flight_reservations
     where upper(coalesce(${quoteIdent(statusColumn)}::text, '')) = 'COMPLETED'
       and ${quoteIdent(dateColumn)} >= $1::timestamptz`,
    [startOfTodayUtc()],
  );

  return asNumber(row?.total);
}

async function sumFlownHours() {
  if (!(await tableExists("flight_reservations"))) return 0;

  const columns = await existingColumns("flight_reservations", [
    "actual_block_minutes",
    "block_minutes",
    "block_time_minutes",
    "estimated_block_minutes",
    "planned_block_minutes",
  ]);

  const minuteExpressions = Array.from(columns).map((column: string) => `nullif(${quoteIdent(column)}::text, '')::numeric`);
  if (minuteExpressions.length === 0) return 0;

  const statusColumn = await flightStatusColumn();
  const where = statusColumn ? `where upper(coalesce(${quoteIdent(statusColumn)}::text, '')) = 'COMPLETED'` : "";

  const row = await dbOne<{ hours: string }>(
    `select coalesce(sum(coalesce(${minuteExpressions.join(", ")})), 0)::text as hours
     from public.flight_reservations
     ${where}`,
  );

  return Math.round((asNumber(row?.hours) / 60) * 10) / 10;
}

async function sumTransportedPassengersFromSnapshots() {
  if (!(await tableExists("flight_economy_snapshots"))) return 0;

  const columns = await existingColumns("flight_economy_snapshots", ["actual_passengers", "estimated_passengers", "passengers"]);
  const expressions = Array.from(columns).map((column: string) => `nullif(${quoteIdent(column)}::text, '')::numeric`);
  if (expressions.length === 0) return 0;

  const row = await dbOne<{ total: string }>(
    `select coalesce(sum(greatest(${expressions.join(", ")})), 0)::text as total
     from public.flight_economy_snapshots`,
  );

  return Math.round(asNumber(row?.total));
}

async function sumTransportedPassengersFromFlights() {
  if (!(await tableExists("flight_reservations"))) return 0;

  const columns = await existingColumns("flight_reservations", ["passenger_count", "passengers_count", "passengers", "pax"]);
  const expressions = Array.from(columns).map((column: string) => `nullif(${quoteIdent(column)}::text, '')::numeric`);
  if (expressions.length === 0) return 0;

  const statusColumn = await flightStatusColumn();
  const where = statusColumn ? `where upper(coalesce(${quoteIdent(statusColumn)}::text, '')) = 'COMPLETED'` : "";

  const row = await dbOne<{ total: string }>(
    `select coalesce(sum(greatest(${expressions.join(", ")})), 0)::text as total
     from public.flight_reservations
     ${where}`,
  );

  return Math.round(asNumber(row?.total));
}

export async function getPublicStats(): Promise<PublicStats> {
  try {
    const [pilots, totalFlights, todayFlights, flownHours, passengersFromSnapshots, passengersFromFlights] = await Promise.all([
      countPilots(),
      countCompletedFlights(),
      countTodayFlights(),
      sumFlownHours(),
      sumTransportedPassengersFromSnapshots(),
      sumTransportedPassengersFromFlights(),
    ]);

    return {
      pilots,
      totalFlights,
      transportedPassengers: passengersFromSnapshots || passengersFromFlights,
      flownHours,
      todayFlights,
      source: "neon",
      updatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error("[public-stats] Neon query failed", error);
    return emptyStats();
  }
}
