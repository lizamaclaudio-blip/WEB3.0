import "server-only";
import { dbOne, dbQuery, dbTransaction } from "@/lib/db/client";

export async function getPilotWallet(pilotId?: string | null, callsign?: string | null) {
  return dbOne<{
    id: string;
    pilot_id: string | null;
    callsign: string | null;
    wallet_balance_usd: number;
    pending_accrual_usd: number;
    paid_this_month_usd: number;
    total_earned_usd: number;
    total_spent_usd: number;
  }>(
    `select id, pilot_id, callsign, wallet_balance_usd, pending_accrual_usd, paid_this_month_usd, total_earned_usd, total_spent_usd
     from public.pw3_pilot_wallets
     where ($1::uuid is not null and pilot_id = $1)
        or ($2::text is not null and lower(callsign) = lower($2))
     order by updated_at desc
     limit 1`,
    [pilotId ?? null, callsign ?? null],
  );
}

export async function accruePilotAmount(input: {
  pilotId?: string | null;
  callsign?: string | null;
  amountUsd: number;
}) {
  if (input.amountUsd <= 0) return null;
  return dbTransaction(async (client) => {
    const row = await client.query<{
      id: string;
      pilot_id: string | null;
      callsign: string | null;
      wallet_balance_usd: number;
      pending_accrual_usd: number;
      total_earned_usd: number;
    }>(
      `insert into public.pw3_pilot_wallets (pilot_id, callsign)
       values ($1::uuid, $2)
       on conflict do nothing
       returning id, pilot_id, callsign, wallet_balance_usd, pending_accrual_usd, total_earned_usd`,
      [input.pilotId ?? null, input.callsign ?? null],
    );

    const wallet = row.rows[0] ?? (await client.query<{
      id: string;
      pending_accrual_usd: number;
      total_earned_usd: number;
    }>(
      `select id, pending_accrual_usd, total_earned_usd
       from public.pw3_pilot_wallets
       where ($1::uuid is not null and pilot_id = $1)
          or ($2::text is not null and lower(callsign)=lower($2))
       limit 1`,
      [input.pilotId ?? null, input.callsign ?? null],
    )).rows[0];

    if (!wallet) return null;

    await client.query(
      `update public.pw3_pilot_wallets
       set pending_accrual_usd = pending_accrual_usd + $2,
           total_earned_usd = total_earned_usd + $2,
           updated_at = now()
       where id = $1`,
      [wallet.id, Number(input.amountUsd.toFixed(2))],
    );

    return wallet.id;
  });
}

export async function deductFromWallet(input: {
  pilotId?: string | null;
  callsign?: string | null;
  amountUsd: number;
}): Promise<{ id: string; newBalance: number } | null> {
  if (input.amountUsd <= 0) return null;
  return dbTransaction(async (client) => {
    const existing = await client.query<{
      id: string;
      wallet_balance_usd: number;
    }>(
      `select id, wallet_balance_usd
       from public.pw3_pilot_wallets
       where ($1::uuid is not null and pilot_id = $1)
          or ($2::text is not null and lower(callsign) = lower($2))
       limit 1
       for update`,
      [input.pilotId ?? null, input.callsign ?? null],
    );

    const wallet = existing.rows[0];
    if (!wallet) throw new Error("Wallet no encontrada.");

    const current = Number(wallet.wallet_balance_usd ?? 0);
    const amount = Number(input.amountUsd.toFixed(2));
    if (current < amount) throw new Error("Saldo insuficiente.");

    const newBalance = Number((current - amount).toFixed(2));
    await client.query(
      `update public.pw3_pilot_wallets
       set wallet_balance_usd = $2,
           total_spent_usd = total_spent_usd + $3,
           updated_at = now()
       where id = $1`,
      [wallet.id, newBalance, amount],
    );

    return { id: wallet.id, newBalance };
  });
}

export type ProgressionExpenseAtomicInput = {
  pilotId: string | null;
  callsign: string | null;
  expenseCode: string;
  amountUsd: number;
  idempotencyKey: string;
  ledgerType: string;
  ledgerCategory: string;
  description: string;
  metadata: Record<string, unknown>;
  createdBy: string | null;
};

export type ProgressionExpenseAtomicResult = {
  alreadyProcessed: boolean;
  newBalance: number;
  expenseLedgerId: string | null;
  economyLedgerId: string | null;
};

export async function processProgressionExpenseAtomic(
  input: ProgressionExpenseAtomicInput,
): Promise<ProgressionExpenseAtomicResult> {
  const amount = Number(input.amountUsd.toFixed(2));
  const ledgerKey = `ledger:${input.idempotencyKey}`;

  return dbTransaction(async (client) => {
    // Step 1: INSERT expense ledger as pending, wallet_applied=false.
    // ON CONFLICT DO NOTHING means a duplicate key returns no rows — that is our
    // idempotency gate. If id is returned we own this transaction; if not, someone
    // already committed it and we must not deduct again.
    const expInsert = await client.query<{ id: string }>(
      `insert into public.pw3_pilot_expense_ledger
         (pilot_id, callsign, expense_code, amount_usd, status, wallet_applied, metadata, idempotency_key)
       values ($1::uuid, $2, $3, $4, 'pending', false, '{}'::jsonb, $5)
       on conflict (idempotency_key) do nothing
       returning id`,
      [input.pilotId ?? null, input.callsign ?? null, input.expenseCode, amount, input.idempotencyKey],
    );

    if (expInsert.rows.length === 0) {
      // Already processed — look up current wallet balance and the existing row id.
      const existingExp = await client.query<{ id: string }>(
        `select id from public.pw3_pilot_expense_ledger where idempotency_key = $1 limit 1`,
        [input.idempotencyKey],
      );
      const walletSnap = await client.query<{ wallet_balance_usd: number }>(
        `select wallet_balance_usd from public.pw3_pilot_wallets
         where ($1::uuid is not null and pilot_id = $1)
            or ($2::text is not null and lower(callsign) = lower($2))
         limit 1`,
        [input.pilotId ?? null, input.callsign ?? null],
      );
      return {
        alreadyProcessed: true,
        newBalance: Number(walletSnap.rows[0]?.wallet_balance_usd ?? 0),
        expenseLedgerId: existingExp.rows[0]?.id ?? null,
        economyLedgerId: null,
      };
    }

    const expenseRowId = expInsert.rows[0].id;

    // Step 2: Lock wallet row for update.
    const walletRow = await client.query<{ id: string; wallet_balance_usd: number }>(
      `select id, wallet_balance_usd
       from public.pw3_pilot_wallets
       where ($1::uuid is not null and pilot_id = $1)
          or ($2::text is not null and lower(callsign) = lower($2))
       limit 1
       for update`,
      [input.pilotId ?? null, input.callsign ?? null],
    );

    const wallet = walletRow.rows[0];
    if (!wallet) throw new Error("Wallet no encontrada.");

    // Step 3: Validate balance inside the transaction.
    const current = Number(wallet.wallet_balance_usd ?? 0);
    if (current < amount) throw new Error("Saldo insuficiente.");

    const newBalance = Number((current - amount).toFixed(2));

    // Step 4: Deduct wallet.
    await client.query(
      `update public.pw3_pilot_wallets
       set wallet_balance_usd = $2,
           total_spent_usd    = total_spent_usd + $3,
           updated_at         = now()
       where id = $1`,
      [wallet.id, newBalance, amount],
    );

    // Step 5: Mark expense ledger row as posted and wallet applied.
    await client.query(
      `update public.pw3_pilot_expense_ledger
       set status = 'posted', wallet_applied = true, updated_at = now()
       where id = $1`,
      [expenseRowId],
    );

    // Step 6: Insert economy ledger entry.
    const ledRow = await client.query<{ id: string }>(
      `insert into public.pw3_economy_ledger
         (pilot_id, callsign, source, type, category, direction, amount_usd, description,
          idempotency_key, metadata, created_by)
       values ($1::uuid, $2, 'progression', $3, $4, 'debit', $5, $6, $7, $8::jsonb, $9)
       on conflict (idempotency_key) do nothing
       returning id`,
      [
        input.pilotId ?? null,
        input.callsign ?? null,
        input.ledgerType,
        input.ledgerCategory,
        amount,
        input.description,
        ledgerKey,
        JSON.stringify(input.metadata),
        input.createdBy ?? null,
      ],
    );

    return {
      alreadyProcessed: false,
      newBalance,
      expenseLedgerId: expenseRowId,
      economyLedgerId: ledRow.rows[0]?.id ?? null,
    };
  });
}

export async function prepareMonthlyPayout(pilotId: string, payoutMonth: string) {
  const wallet = await getPilotWallet(pilotId, null);
  const gross = Number(wallet?.pending_accrual_usd ?? 0);
  const deductions = 0;
  const net = Number((gross - deductions).toFixed(2));

  const result = await dbQuery(
    `insert into public.pw3_pilot_monthly_payouts (
      pilot_id, callsign, payout_month, gross_accrual_usd, deductions_usd, net_payout_usd, status
    ) values ($1::uuid, $2, $3, $4, $5, $6, 'pending')
    on conflict do nothing
    returning id`,
    [pilotId, wallet?.callsign ?? null, payoutMonth, gross, deductions, net],
  );

  return result.rows[0] ?? null;
}
