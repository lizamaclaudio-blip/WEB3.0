import "server-only";
import { dbOne } from "@/lib/db/client";

type AssignDispatchFlightNumberInput = {
  routeCode?: string | null;
  routeId?: string | null;
  originIdent?: string | null;
  destinationIdent?: string | null;
  aircraftRegistration?: string | null;
  operationType?: string | null;
  plannedDate?: string | null;
};

export type DispatchFlightNumberAssignment = {
  airlineIcao: "PWG";
  flightNumber: string;
  callsign: string;
  routeCode: string;
  assignmentSource: "route_code" | "next_available";
};

const ACTIVE_STATUS_FOR_CALLSIGN_COLLISION = [
  "RESERVED",
  "PENDING",
  "READY_FOR_ACARS",
  "SENT_TO_ACARS",
  "CLAIMED",
  "IN_FLIGHT",
  "ACTIVE",
  "TEMP_RESERVED",
  "ACARS_READY",
  "ACARS_CLAIMED",
];

function normalizeText(value: unknown) {
  return String(value ?? "").trim();
}

function extractRouteFlightNumber(routeCode: string) {
  const match = routeCode.toUpperCase().match(/^PWG(\d{3,4})$/);
  return match ? match[1] : "";
}

async function isFlightNumberInUse(flightNumber: string) {
  const row = await dbOne<{ in_use: boolean }>(
    `select exists (
      select 1
      from public.training_dispatch_reservations
      where upper(coalesce(assigned_callsign, '')) = upper($1)
        and upper(coalesce(status, '')) = any($2::text[])
        and (
          upper(coalesce(status, '')) not in ('TEMP_RESERVED','PENDING','RESERVED','ACARS_READY')
          or expires_at > now()
        )
    ) as in_use`,
    [`PWG${flightNumber}`, ACTIVE_STATUS_FOR_CALLSIGN_COLLISION],
  );
  return Boolean(row?.in_use);
}

async function findNextFreeFlightNumber(start: number) {
  for (let candidate = Math.max(100, start); candidate <= 9999; candidate += 1) {
    const flightNumber = String(candidate);
    if (!(await isFlightNumberInUse(flightNumber))) return flightNumber;
  }
  throw new Error("FLIGHT_NUMBER_UNAVAILABLE");
}

export async function assignDispatchFlightNumber(
  input: AssignDispatchFlightNumberInput,
): Promise<DispatchFlightNumberAssignment> {
  const routeCode = normalizeText(input.routeCode).toUpperCase();
  const preferred = extractRouteFlightNumber(routeCode);

  if (preferred && !(await isFlightNumberInUse(preferred))) {
    return {
      airlineIcao: "PWG",
      flightNumber: preferred,
      callsign: `PWG${preferred}`,
      routeCode: `PWG${preferred}`,
      assignmentSource: "route_code",
    };
  }

  const fallbackStart = preferred ? Number(preferred) : 600;
  const next = await findNextFreeFlightNumber(fallbackStart);
  return {
    airlineIcao: "PWG",
    flightNumber: next,
    callsign: `PWG${next}`,
    routeCode: `PWG${next}`,
    assignmentSource: "next_available",
  };
}
