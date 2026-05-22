import "server-only";
import type { AuthenticatedPilot } from "@/lib/auth/service";
import { dbOne, dbQuery } from "@/lib/db/client";
import { ensureTrainingReservationSchema, expireTrainingReservations } from "@/lib/dispatch/training-reservations";

const ACTIVE_TRAINING_STATUSES = [
  "TEMP_RESERVED",
  "ACARS_READY",
  "ACARS_CLAIMED",
  "RESERVED",
  "DISPATCHED",
  "IN_FLIGHT",
  "STARTED",
  "LANDED",
  "PENDING_EVALUATION",
  "EVALUATED",
];

const CANCELLABLE_STATUSES = [
  "TEMP_RESERVED",
  "ACARS_READY",
  "ACARS_CLAIMED",
  "RESERVED",
  "DISPATCHED",
  "STARTED",
];

type ActiveTrainingRow = {
  id: string;
  pilot_callsign: string | null;
  aircraft_registration: string | null;
  aircraft_model_code: string | null;
  origin_ident: string | null;
  destination_ident: string | null;
  operation_type: string | null;
  score_mode: string | null;
  status: string;
  dispatch_token_hint: string | null;
  expires_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  sent_to_acars_at: string | null;
  acars_ready_at: string | null;
  acars_claimed_at: string | null;
  acars_status: string | null;
};

export type ActiveDispatchReservation = {
  id: string;
  source: "training_dispatch_reservations";
  flightNumber: string;
  origin: string;
  destination: string;
  aircraft: string;
  aircraftRegistration: string;
  aircraftType: string;
  registration: string;
  status: string;
  operationType: string;
  scoreMode: string;
  scheduledDeparture: string | null;
  simbriefStatus: string;
  acarsStatus: string;
  expiresAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  dispatchTokenHint: string | null;
  canCancel: boolean;
  canContinue: boolean;
  blocking: boolean;
};

function normalizeText(value: unknown, fallback = "") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function normalizeStatus(value: unknown) {
  return normalizeText(value).toUpperCase();
}

function operationLabel(value: unknown) {
  const code = normalizeText(value, "TRAINING_FREE").toUpperCase();
  const labels: Record<string, string> = {
    TRAINING_FREE: "Entrenamiento libre",
    SCHOOL_OFFICIAL_ROUTE: "Ruta oficial",
    COMMERCIAL_OFFICIAL_ROUTE: "Ruta oficial",
    CHARTER_OFFICIAL: "Charter",
    CARGO_OFFICIAL: "Carga",
    AIRCRAFT_TRANSFER: "Traslado de aeronave",
    EVENT_TOUR: "Evento / Tour",
  };
  return labels[code] ?? code.replaceAll("_", " ");
}

function mapTrainingReservation(row: ActiveTrainingRow): ActiveDispatchReservation {
  const status = normalizeStatus(row.status);
  const aircraftRegistration = normalizeText(row.aircraft_registration, "No registrado").toUpperCase();
  const aircraftType = normalizeText(row.aircraft_model_code, "No registrado").toUpperCase();
  const origin = normalizeText(row.origin_ident, "No registrado").toUpperCase();
  const destination = normalizeText(row.destination_ident, "No registrado").toUpperCase();
  const operationType = normalizeText(row.operation_type, "TRAINING_FREE").toUpperCase();
  const scoreMode = normalizeText(row.score_mode, "REFERENCE_ONLY").toUpperCase();

  return {
    id: row.id,
    source: "training_dispatch_reservations",
    flightNumber: operationLabel(operationType),
    origin,
    destination,
    aircraft: aircraftType,
    aircraftRegistration,
    aircraftType,
    registration: aircraftRegistration,
    status,
    operationType,
    scoreMode,
    scheduledDeparture: row.created_at,
    simbriefStatus: "No aplica",
    acarsStatus: normalizeText(row.acars_status, status === "ACARS_READY" ? "READY" : "No conectado"),
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    dispatchTokenHint: row.dispatch_token_hint,
    canCancel: CANCELLABLE_STATUSES.includes(status),
    canContinue: true,
    blocking: ACTIVE_TRAINING_STATUSES.includes(status),
  };
}

export async function getActiveDispatchReservationForPilot(user: AuthenticatedPilot) {
  await ensureTrainingReservationSchema();
  await expireTrainingReservations();

  const row = await dbOne<ActiveTrainingRow>(
    `select
       id::text,
       pilot_callsign,
       aircraft_registration,
       aircraft_model_code,
       origin_ident,
       destination_ident,
       operation_type,
       score_mode,
       status,
       dispatch_token_hint,
       expires_at::text,
       created_at::text,
       updated_at::text,
       sent_to_acars_at::text,
       acars_ready_at::text,
       acars_claimed_at::text,
       acars_status
     from public.training_dispatch_reservations
     where pilot_user_id = $1::uuid
       and (
         status in ('ACARS_CLAIMED','RESERVED','DISPATCHED','IN_FLIGHT','LANDED','PENDING_EVALUATION','EVALUATED')
         or (status in ('TEMP_RESERVED','ACARS_READY') and expires_at > now())
       )
     order by
       case status
         when 'IN_FLIGHT' then 1
         when 'ACARS_CLAIMED' then 2
         when 'ACARS_READY' then 3
         when 'TEMP_RESERVED' then 4
         when 'LANDED' then 5
         when 'PENDING_EVALUATION' then 6
         when 'EVALUATED' then 7
         else 20
       end,
       updated_at desc nulls last,
       created_at desc nulls last
     limit 1`,
    [user.userId],
  );

  return row ? mapTrainingReservation(row) : null;
}

export async function cancelActiveDispatchReservationForPilot(user: AuthenticatedPilot, reservationId: string) {
  await ensureTrainingReservationSchema();
  await expireTrainingReservations();

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(reservationId)) {
    throw new Error("RESERVATION_NOT_FOUND");
  }

  const row = await dbOne<ActiveTrainingRow>(
    `select
       id::text,
       pilot_callsign,
       aircraft_registration,
       aircraft_model_code,
       origin_ident,
       destination_ident,
       operation_type,
       score_mode,
       status,
       dispatch_token_hint,
       expires_at::text,
       created_at::text,
       updated_at::text,
       sent_to_acars_at::text,
       acars_ready_at::text,
       acars_claimed_at::text,
       acars_status
     from public.training_dispatch_reservations
     where id = $1::uuid
       and pilot_user_id = $2::uuid
     limit 1`,
    [reservationId, user.userId],
  );

  if (!row) throw new Error("RESERVATION_NOT_FOUND");
  const status = normalizeStatus(row.status);
  if (!CANCELLABLE_STATUSES.includes(status)) throw new Error("RESERVATION_CANNOT_BE_CANCELLED");

  await dbQuery(
    `update public.training_dispatch_reservations
        set status = 'CANCELLED',
            acars_status = 'CANCELLED',
            updated_at = now()
      where id = $1::uuid
        and pilot_user_id = $2::uuid`,
    [reservationId, user.userId],
  );

  try {
    await dbQuery(
      `insert into public.flight_reservation_status_log (
         reservation_id,
         previous_status,
         new_status,
         reason,
         actor_type,
         actor_user_id,
         metadata
       ) values (
         $1::uuid,
         $2,
         'CANCELLED',
         'Cancelado por el piloto desde Crew Center',
         'pilot',
         $3::uuid,
         $4::jsonb
       )`,
      [reservationId, status, user.userId, JSON.stringify({ source: "training_dispatch_reservations" })],
    );
  } catch {
    // El log es auxiliar; no debe impedir cancelar la reserva.
  }

  return mapTrainingReservation({ ...row, status: "CANCELLED", acars_status: "CANCELLED" });
}

export function isDispatchBlockingReservation(status: string | null | undefined) {
  return ACTIVE_TRAINING_STATUSES.includes(normalizeStatus(status));
}
