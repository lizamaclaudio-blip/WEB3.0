import { NextRequest, NextResponse } from "next/server";
import { dbQuery, tableExists } from "@/lib/db/client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 180;

type ActivityItem = {
  flightNumber: string;
  aircraft: string;
  registration: string;
  origin: string;
  destination: string;
  status: string;
  operationType: string;
  updatedAt: string | null;
};

type RawRow = {
  flight_number: string | null;
  aircraft: string | null;
  registration: string | null;
  origin_ident: string | null;
  destination_ident: string | null;
  status: string | null;
  operation_type: string | null;
  updated_at: string | null;
};

const VALID_STATUSES = [
  "TEMP_RESERVED",
  "ACARS_READY",
  "ACARS_CLAIMED",
  "IN_FLIGHT",
  "LANDED",
  "PENDING_EVALUATION",
  "COMPLETED",
];

function sanitize(code: string | null | undefined) {
  return (code ?? "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);
}

function text(value: string | null | undefined, fallback: string) {
  const trimmed = (value ?? "").trim();
  return trimmed.length ? trimmed : fallback;
}

function normalizeRow(row: RawRow): ActivityItem {
  return {
    flightNumber: text(row.flight_number, "PW-OPS"),
    aircraft: text(row.aircraft, "N/D"),
    registration: text(row.registration, "N/D"),
    origin: sanitize(row.origin_ident) || "N/D",
    destination: sanitize(row.destination_ident) || "N/D",
    status: text(row.status, "N/D"),
    operationType: text(row.operation_type, "N/D"),
    updatedAt: row.updated_at,
  };
}

async function loadTrainingDispatchReservations(ident: string) {
  if (!(await tableExists("training_dispatch_reservations"))) return { departures: [] as ActivityItem[], arrivals: [] as ActivityItem[] };

  const result = await dbQuery<RawRow>(
    `select
       coalesce(pilot_callsign, 'PW-OPS') as flight_number,
       aircraft_model_code as aircraft,
       aircraft_registration as registration,
       origin_ident,
       destination_ident,
       status,
       operation_type,
       updated_at::text as updated_at
     from public.training_dispatch_reservations
     where (upper(origin_ident) = $1 or upper(destination_ident) = $1)
       and upper(coalesce(status, '')) = any($2::text[])
     order by updated_at desc
     limit 120`,
    [ident, VALID_STATUSES],
  );

  const departures: ActivityItem[] = [];
  const arrivals: ActivityItem[] = [];

  for (const row of result.rows) {
    const item = normalizeRow(row);
    if (item.origin === ident) departures.push(item);
    if (item.destination === ident) arrivals.push(item);
  }

  return { departures, arrivals };
}

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "public, s-maxage=180, stale-while-revalidate=600" },
  });
}

export async function GET(request: NextRequest) {
  const ident = sanitize(request.nextUrl.searchParams.get("ident") || request.nextUrl.searchParams.get("icao"));
  if (!ident) return json({ ok: false, message: "ident/icao requerido" }, 400);

  const { departures, arrivals } = await loadTrainingDispatchReservations(ident);

  return json({
    ok: true,
    ident,
    atcStatus: "No disponible",
    departures: departures.slice(0, 20),
    arrivals: arrivals.slice(0, 20),
  });
}

