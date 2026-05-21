import { NextRequest, NextResponse } from "next/server";
import { ensureAcarsFinalizeSchema, getDispatchReservationById } from "@/lib/acars/finalize-reservation";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const reservationId = String(request.nextUrl.searchParams.get("reservationId") ?? "").trim();
  if (!reservationId) {
    return NextResponse.json({ ok: false, error: "reservationId requerido" }, { status: 400 });
  }

  await ensureAcarsFinalizeSchema();
  const row = await getDispatchReservationById(reservationId);
  if (!row) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  return NextResponse.json({
    ok: true,
    reservationId: row.id,
    status: row.status,
    finalStatus: row.final_status,
    finalizedAt: row.finalized_at,
  });
}
