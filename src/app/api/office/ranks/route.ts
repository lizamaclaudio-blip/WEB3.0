import { NextResponse } from "next/server";
import { getAuthenticatedPilot } from "@/lib/auth/service";
import { loadOfficeCareer } from "@/lib/office/rank-career";
import { getSessionTokenFromCookies } from "@/lib/session/server";

export async function GET() {
  try {
    const token = await getSessionTokenFromCookies();
    const user = await getAuthenticatedPilot(token);

    if (!user) {
      return NextResponse.json({ ok: false, error: "No autenticado." }, { status: 401 });
    }

    const career = await loadOfficeCareer(user);

    return NextResponse.json({ ok: true, ...career });
  } catch (error) {
    console.error("[api/office/ranks] failed", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "No se pudo cargar la progresion de rangos." },
      { status: 500 },
    );
  }
}
