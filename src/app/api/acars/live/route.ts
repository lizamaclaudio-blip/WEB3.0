import { acarsJson } from "@/lib/acars/api-response";
import { getAuthenticatedPilot } from "@/lib/auth/service";
import { dbOne, dbQuery } from "@/lib/db/client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function bearerToken(request: Request) {
  const auth = request.headers.get("authorization") ?? "";
  const match = auth.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

function text(value: unknown) {
  return String(value ?? "").trim();
}

async function ensureLiveSchema() {
  await dbQuery(`
    create extension if not exists pgcrypto;
    create table if not exists public.acars_live_sessions (
      id uuid primary key default gen_random_uuid(),
      pilot_user_id uuid not null,
      pilot_callsign text not null,
      reservation_id uuid null,
      dispatch_token_hint text null,
      flight_number text null,
      phase text null,
      position jsonb null,
      altitude_ft numeric(12,2) null,
      gs_kt numeric(12,2) null,
      fuel_kg numeric(12,2) null,
      last_event text null,
      payload jsonb not null default '{}'::jsonb,
      first_seen_at timestamptz not null default now(),
      last_seen_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      unique(pilot_user_id, reservation_id)
    );
    create index if not exists idx_acars_live_sessions_callsign_last_seen
      on public.acars_live_sessions(pilot_callsign, last_seen_at desc);
  `);
}

export async function POST(request: Request) {
  try {
    await ensureLiveSchema();
    const token = bearerToken(request);
    const user = await getAuthenticatedPilot(token);
    if (!user) {
      return acarsJson(401, { ok: false, code: "UNAUTHORIZED", message: "Sesion ACARS no valida." });
    }

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) {
      return acarsJson(400, { ok: false, code: "INVALID_BODY", message: "Body JSON invalido." });
    }

    const pilotCallsign = text(body.pilotCallsign || user.callsign).toUpperCase();
    const reservationId = text(body.reservationId || body.dispatchId) || null;
    const dispatchToken = text(body.dispatchToken);
    const dispatchTokenHint = dispatchToken ? dispatchToken.slice(0, 8) : null;
    const flightNumber = text(body.flightNumber).toUpperCase() || null;
    const phase = text(body.phase).toUpperCase() || "IN_FLIGHT";
    const payload = {
      phase,
      position: body.position ?? null,
      altitudeFt: body.altitude ?? body.altitudeFt ?? null,
      gs: body.gs ?? body.groundSpeed ?? null,
      fuel: body.fuel ?? body.fuelKg ?? null,
      lastEvent: body.lastEvent ?? null,
      at: new Date().toISOString(),
    };

    const row = reservationId
      ? await dbOne<{ id: string }>(
          `insert into public.acars_live_sessions (
              pilot_user_id, pilot_callsign, reservation_id, dispatch_token_hint, flight_number, phase,
              position, altitude_ft, gs_kt, fuel_kg, last_event, payload, first_seen_at, last_seen_at, updated_at
            ) values (
              $1::uuid, $2, $3::uuid, $4, $5, $6,
              $7::jsonb, $8, $9, $10, $11, $12::jsonb, now(), now(), now()
            )
            on conflict (pilot_user_id, reservation_id) do update set
              dispatch_token_hint = excluded.dispatch_token_hint,
              flight_number = excluded.flight_number,
              phase = excluded.phase,
              position = excluded.position,
              altitude_ft = excluded.altitude_ft,
              gs_kt = excluded.gs_kt,
              fuel_kg = excluded.fuel_kg,
              last_event = excluded.last_event,
              payload = excluded.payload,
              last_seen_at = now(),
              updated_at = now()
            returning id::text`,
          [
            user.userId,
            pilotCallsign,
            reservationId,
            dispatchTokenHint,
            flightNumber,
            phase,
            JSON.stringify(body.position ?? null),
            Number(body.altitude ?? body.altitudeFt ?? 0),
            Number(body.gs ?? body.groundSpeed ?? 0),
            Number(body.fuel ?? body.fuelKg ?? 0),
            text(body.lastEvent) || null,
            JSON.stringify(payload),
          ],
        )
      : await dbOne<{ id: string }>(
          `insert into public.acars_live_sessions (
              pilot_user_id, pilot_callsign, reservation_id, dispatch_token_hint, flight_number, phase,
              position, altitude_ft, gs_kt, fuel_kg, last_event, payload, first_seen_at, last_seen_at, updated_at
            ) values (
              $1::uuid, $2, null, $3, $4, $5,
              $6::jsonb, $7, $8, $9, $10, $11::jsonb, now(), now(), now()
            )
            returning id::text`,
          [
            user.userId,
            pilotCallsign,
            dispatchTokenHint,
            flightNumber,
            phase,
            JSON.stringify(body.position ?? null),
            Number(body.altitude ?? body.altitudeFt ?? 0),
            Number(body.gs ?? body.groundSpeed ?? 0),
            Number(body.fuel ?? body.fuelKg ?? 0),
            text(body.lastEvent) || null,
            JSON.stringify(payload),
          ],
        );

    return acarsJson(200, {
      ok: true,
      code: "LIVE_HEARTBEAT_OK",
      message: "Heartbeat ACARS registrado.",
      status: phase,
      extra: { sessionId: row?.id ?? null },
    });
  } catch (error) {
    return acarsJson(500, {
      ok: false,
      code: "LIVE_HEARTBEAT_FAILED",
      message: "No se pudo registrar heartbeat ACARS.",
      details: error instanceof Error ? error.message : "LIVE_HEARTBEAT_FAILED",
    });
  }
}

