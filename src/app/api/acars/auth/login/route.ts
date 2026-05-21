import { NextResponse } from "next/server";
import { isAuthError, loginPilot } from "@/lib/auth/service";
import { dbOne } from "@/lib/db/client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type AcarsLoginBody = {
  email?: string;
  password?: string;
  client?: string;
  version?: string;
};

/**
 * Autenticacion dedicada para ACARS cliente.
 * Endpoint: POST /api/acars/auth/login
 * 
 * Request:
 * {
 *   "email": "piloto@email.com",
 *   "password": "...",
 *   "client": "patagonia-acars",
 *   "version": "7.1.3"
 * }
 * 
 * Response OK:
 * {
 *   "ok": true,
 *   "tokenType": "Bearer",
 *   "token": "<session_token>",
 *   "pilot": {
 *     "id": "...",
 *     "email": "...",
 *     "callsign": "PWG001",
 *     "rankCode": "CADET",
 *     "status": "ACTIVE"
 *   }
 * }
 * 
 * Response Error:
 * {
 *   "ok": false,
 *   "code": "INVALID_LOGIN",
 *   "error": "Correo o contrasena incorrectos."
 * }
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AcarsLoginBody;
    const email = (body.email ?? "").trim().toLowerCase();
    const password = body.password ?? "";
    const client = body.client ?? "unknown";
    const version = body.version ?? "unknown";

    console.info(`[acars/auth/login] client=${client} version=${version} email=${email}`);

    if (!email || !password) {
      return NextResponse.json(
        { ok: false, code: "INVALID_LOGIN", error: "Correo o contrasena incorrectos." },
        { status: 401 }
      );
    }

    // Usar el mismo sistema de auth que la web
    const loginResult = await loginPilot({ email, password });

    // Obtener perfil completo del piloto con callsign
    const pilot = await dbOne<{
      id: string;
      email: string;
      callsign: string | null;
      rank_code: string | null;
      pilot_status: string | null;
    }>(
      `select
         p.id::text as "id",
         u.email,
         p.callsign,
         p.rank_code,
         p.pilot_status
       from public.app_users u
       left join public.pilot_profiles p on p.id = u.id
       where u.id = $1
       limit 1`,
      [loginResult.userId]
    );

    if (!pilot || !pilot.callsign) {
      return NextResponse.json(
        { ok: false, code: "PILOT_NOT_FOUND", error: "Perfil de piloto no encontrado." },
        { status: 403 }
      );
    }

    const response = NextResponse.json({
      ok: true,
      tokenType: "Bearer",
      token: loginResult.sessionToken,
      pilot: {
        id: pilot.id,
        email: pilot.email,
        callsign: pilot.callsign,
        rankCode: pilot.rank_code ?? "CADET",
        status: pilot.pilot_status ?? "ACTIVE",
      },
    });

    console.info(`[acars/auth/login] OK callsign=${pilot.callsign}`);
    return response;

  } catch (error) {
    if (isAuthError(error)) {
      return NextResponse.json(
        { ok: false, code: error.code, error: error.message },
        { status: error.status }
      );
    }

    console.error("[acars/auth/login] failed", error);
    return NextResponse.json(
      { ok: false, code: "LOGIN_FAILED", error: "No se pudo iniciar sesion." },
      { status: 500 }
    );
  }
}
