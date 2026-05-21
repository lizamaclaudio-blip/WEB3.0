import { NextResponse } from "next/server";
import { getProgressionExpenseCatalog } from "@/lib/economy";
import { getProgressionExpenseCatalogDb } from "@/lib/economy/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const expenses = await getProgressionExpenseCatalogDb();
    return NextResponse.json({
      ok: true,
      expenses,
      totals: {
        progressionExpenses: expenses.length,
      },
      source: "db",
      updatedAt: new Date().toISOString(),
    });
  } catch {
    const expenses = getProgressionExpenseCatalog();
    return NextResponse.json({
      ok: true,
      expenses,
      totals: {
        progressionExpenses: expenses.length,
      },
      source: "local-fallback",
      updatedAt: new Date().toISOString(),
    });
  }
}
