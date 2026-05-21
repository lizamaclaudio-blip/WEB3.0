import { NextResponse } from "next/server";
import { isAuthError, registerPilot } from "@/lib/auth/service";
import { setSessionCookie } from "@/lib/session/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RegisterBody = {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  hubIdent?: string;
  base?: string;
  experience?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RegisterBody;
    const result = await registerPilot({
      firstName: body.firstName ?? "",
      lastName: body.lastName ?? "",
      email: body.email ?? "",
      password: body.password ?? "",
      hubIdent: body.hubIdent ?? body.base ?? "",
      experience: body.experience,
    });

    const response = NextResponse.json({
      ok: true,
      userId: result.userId,
      pilotId: result.pilotId,
      email: result.email,
      displayName: result.displayName,
      redirectTo: "/dashboard",
    });

    setSessionCookie(response, result.sessionToken);
    return response;
  } catch (error) {
    if (isAuthError(error)) {
      return NextResponse.json({ ok: false, code: error.code, error: error.message }, { status: error.status });
    }

    console.error("[api/auth/register] failed", error);
    return NextResponse.json({ ok: false, code: "REGISTER_FAILED", error: "No se pudo crear la cuenta." }, { status: 500 });
  }
}
