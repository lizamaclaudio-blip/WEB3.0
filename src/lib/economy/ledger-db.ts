import "server-only";
import { dbOne, dbQuery } from "@/lib/db/client";

export type CreateLedgerEntryInput = {
  pilotId?: string | null;
  callsign?: string | null;
  routeId?: string | null;
  reservationId?: string | null;
  source?: string;
  type: string;
  category: string;
  direction: "credit" | "debit" | "neutral";
  amountUsd: number;
  description?: string;
  idempotencyKey?: string | null;
  metadata?: Record<string, unknown>;
  createdBy?: string | null;
};

export async function getPilotLedger(pilotId?: string | null, callsign?: string | null, limit = 20) {
  return dbQuery<{
    id: string;
    created_at: string;
    type: string;
    category: string;
    direction: string;
    amount_usd: number;
    description: string | null;
    status: string;
  }>(
    `select id, created_at, type, category, direction, amount_usd, description, status
     from public.pw3_economy_ledger
     where ($1::uuid is not null and pilot_id = $1)
        or ($2::text is not null and lower(callsign) = lower($2))
     order by created_at desc
     limit $3`,
    [pilotId ?? null, callsign ?? null, Math.max(1, Math.min(100, limit))],
  );
}

export async function getEconomyLedger(limit = 50) {
  return dbQuery<{
    id: string;
    created_at: string;
    airline_code: string;
    callsign: string | null;
    type: string;
    category: string;
    direction: string;
    amount_usd: number;
    description: string | null;
    status: string;
  }>(
    `select id, created_at, airline_code, callsign, type, category, direction, amount_usd, description, status
     from public.pw3_economy_ledger
     order by created_at desc
     limit $1`,
    [Math.max(1, Math.min(200, limit))],
  );
}

export async function createLedgerEntry(input: CreateLedgerEntryInput) {
  return dbOne<{ id: string }>(
    `insert into public.pw3_economy_ledger (
      pilot_id, callsign, route_id, reservation_id, source, type, category, direction,
      amount_usd, description, idempotency_key, metadata, created_by
    ) values (
      $1::uuid, $2, $3, $4::uuid, $5, $6, $7, $8,
      $9, $10, $11, $12::jsonb, $13
    )
    on conflict (idempotency_key) do update set updated_at = now()
    returning id`,
    [
      input.pilotId ?? null,
      input.callsign ?? null,
      input.routeId ?? null,
      input.reservationId ?? null,
      input.source ?? "manual",
      input.type,
      input.category,
      input.direction,
      Number(input.amountUsd.toFixed(2)),
      input.description ?? null,
      input.idempotencyKey ?? null,
      JSON.stringify(input.metadata ?? {}),
      input.createdBy ?? null,
    ],
  );
}

export async function applyPilotExpense(input: {
  pilotId?: string | null;
  callsign?: string | null;
  expenseCode: string;
  amountUsd: number;
  idempotencyKey?: string | null;
}) {
  return dbOne<{ id: string }>(
    `insert into public.pw3_pilot_expense_ledger (
      pilot_id, callsign, expense_code, amount_usd, status, wallet_applied, metadata, idempotency_key
    ) values ($1::uuid, $2, $3, $4, 'posted', false, '{}'::jsonb, $5)
    on conflict (idempotency_key) do update set updated_at = now()
    returning id`,
    [input.pilotId ?? null, input.callsign ?? null, input.expenseCode, Number(input.amountUsd.toFixed(2)), input.idempotencyKey ?? null],
  );
}
