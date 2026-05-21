import { NextRequest, NextResponse } from "next/server";
import { requireUserContext } from "@/lib/crew/server-data";
import { getProgressionExpenseCatalogDb } from "@/lib/economy/db";
import { getPilotWallet, processProgressionExpenseAtomic } from "@/lib/economy/wallet-db";
import { getProgressionExpenseCatalog } from "@/lib/economy";
import {
  getCheckrideExpenseCode,
  getRatingExpenseCode,
  getTheoryExamExpenseCode,
  resolveExpenseAmount,
  buildCheckrideExpenseKey,
  buildTheoryExpenseKey,
  buildRatingExpenseKey,
} from "@/lib/economy/training-expense";

export const dynamic = "force-dynamic";

type ProgressionExpenseRequest = {
  category: "checkride" | "theory" | "rating";
  itemCode: string;
  itemCategory: string;
  attemptIndex?: number;
};

function safeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function safeInt(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 ? n : fallback;
}

function ledgerType(category: ProgressionExpenseRequest["category"]): string {
  if (category === "checkride") return "checkride_fee";
  if (category === "rating") return "certification_fee";
  return "training_fee";
}

function descriptionLabel(category: ProgressionExpenseRequest["category"], itemCode: string): string {
  if (category === "checkride") return `Checkride: ${itemCode}`;
  if (category === "rating") return `Habilitacion: ${itemCode}`;
  return `Examen teorico: ${itemCode}`;
}

export async function POST(request: NextRequest) {
  let auth: Awaited<ReturnType<typeof requireUserContext>>;
  try {
    auth = await requireUserContext(request);
  } catch {
    return NextResponse.json({ ok: false, error: "No autenticado." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Body JSON invalido." }, { status: 400 });
  }

  const category = safeString((body as Record<string, unknown>).category) as ProgressionExpenseRequest["category"];
  const itemCode = safeString((body as Record<string, unknown>).itemCode).toUpperCase();
  const itemCategory = safeString((body as Record<string, unknown>).itemCategory);
  const attemptIndex = safeInt((body as Record<string, unknown>).attemptIndex, 0);

  if (!category || !itemCode || !itemCategory) {
    return NextResponse.json(
      { ok: false, error: "category, itemCode e itemCategory son obligatorios." },
      { status: 400 },
    );
  }

  if (!["checkride", "theory", "rating"].includes(category)) {
    return NextResponse.json({ ok: false, error: "category invalida." }, { status: 400 });
  }

  const pilotId = auth.user.id;
  const callsign = safeString(auth.profile?.callsign) || null;

  let catalog = getProgressionExpenseCatalog();
  try {
    const dbCatalog = await getProgressionExpenseCatalogDb();
    if (dbCatalog.length > 0) catalog = dbCatalog;
  } catch {
  }

  let expenseCode: string;
  let idempotencyKey: string;

  if (category === "checkride") {
    expenseCode = getCheckrideExpenseCode(itemCategory);
    idempotencyKey = buildCheckrideExpenseKey(pilotId, itemCode, attemptIndex);
  } else if (category === "theory") {
    expenseCode = getTheoryExamExpenseCode(itemCategory);
    idempotencyKey = buildTheoryExpenseKey(pilotId, itemCode, attemptIndex);
  } else {
    expenseCode = getRatingExpenseCode(itemCategory);
    idempotencyKey = buildRatingExpenseKey(pilotId, itemCode);
  }

  const amountUsd = resolveExpenseAmount(expenseCode as Parameters<typeof resolveExpenseAmount>[0], catalog);

  if (amountUsd <= 0) {
    return NextResponse.json(
      { ok: false, error: `Gasto no configurado para ${expenseCode}.` },
      { status: 422 },
    );
  }

  const wallet = await getPilotWallet(pilotId, callsign).catch(() => null);
  const currentBalance = Number(wallet?.wallet_balance_usd ?? 0);

  if (currentBalance < amountUsd) {
    return NextResponse.json(
      {
        ok: false,
        error: "Saldo insuficiente en wallet.",
        required: amountUsd,
        available: currentBalance,
      },
      { status: 422 },
    );
  }

  try {
    const result = await processProgressionExpenseAtomic({
      pilotId,
      callsign,
      expenseCode,
      amountUsd,
      idempotencyKey,
      ledgerType: ledgerType(category),
      ledgerCategory: category,
      description: descriptionLabel(category, itemCode),
      metadata: { itemCode, itemCategory, expenseCode, attemptIndex },
      createdBy: callsign ?? pilotId,
    });

    return NextResponse.json({
      ok: true,
      alreadyProcessed: result.alreadyProcessed,
      expenseCode,
      amountUsd,
      newWalletBalance: result.newBalance,
      expenseLedgerId: result.expenseLedgerId,
      economyLedgerId: result.economyLedgerId,
      idempotencyKey,
      source: "db",
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Error al registrar gasto.";
    const status = msg === "Saldo insuficiente." ? 422 : 500;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}
