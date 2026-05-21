import { NextResponse } from "next/server";
import { getPublicStats } from "@/lib/db/queries/public-stats";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const stats = await getPublicStats();
  return NextResponse.json(stats);
}
