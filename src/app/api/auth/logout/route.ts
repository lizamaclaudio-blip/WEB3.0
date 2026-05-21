import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth/service";
import { clearSessionCookie, getSessionTokenFromCookies } from "@/lib/session/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  const token = await getSessionTokenFromCookies();
  await destroySession(token);

  const response = NextResponse.json({ ok: true, redirectTo: "/" });
  clearSessionCookie(response);
  return response;
}

export async function GET() {
  return POST();
}
