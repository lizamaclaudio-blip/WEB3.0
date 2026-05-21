import { NextResponse } from "next/server";
import { isAuthError, loginPilot } from "@/lib/auth/service";
import { setSessionCookie } from "@/lib/session/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type LoginBody = {
  email?: string;
  password?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as LoginBody;
    const result = await loginPilot({
      email: body.email ?? "",
      password: body.password ?? "",
    });

    const response = NextResponse.json({
      ok: true,
      userId: result.userId,
      email: result.email,
      displayName: result.displayName,
      redirectTo: "/dashboard",
    });

    setSessionCookie(response, result.sessionToken);
    console.info(`[auth] login ok user=${result.userId} email=${result.email}`);
    return response;
  } catch (error) {
    if (isAuthError(error)) {
      return NextResponse.json({ ok: false, code: error.code, error: error.message }, { status: error.status });
    }

    console.error("[api/auth/login] failed", error);
    return NextResponse.json({ ok: false, code: "LOGIN_FAILED", error: "No se pudo iniciar sesion." }, { status: 500 });
  }
}
