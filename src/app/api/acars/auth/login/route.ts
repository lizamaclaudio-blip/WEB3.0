import { NextResponse } from "next/server";
import { isAuthError, loginPilot } from "@/lib/auth/service";
import { dbOne, dbQuery } from "@/lib/db/client";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Fallback: Autenticar con Supabase Auth REST API para usuarios legacy
async function loginWithSupabaseFallback(email: string, password: string): Promise<{userId: string, email: string, displayName: string | null} | null> {
  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ email, password }),
    });
    
    if (!response.ok) {
      console.log("[acars/auth/login] Supabase fallback: auth failed", await response.text());
      return null;
    }
    
    const data = await response.json();
    if (!data.user) return null;
    
    return {
      userId: data.user.id,
      email: data.user.email,
      displayName: data.user.user_metadata?.display_name || data.user.user_metadata?.full_name || null,
    };
  } catch (err) {
    console.error("[acars/auth/login] Supabase fallback error:", err);
    return null;
  }
}

// Buscar o crear perfil de piloto para usuario legacy
async function getOrCreatePilotProfile(userId: string, email: string, displayName: string | null) {
  // Buscar perfil existente
  let pilot = await dbOne<{
    id: string;
    email: string;
    callsign: string | null;
    rank_code: string | null;
    pilot_status: string | null;
  }>(
    `select p.id::text as "id", u.email, p.callsign, p.rank_code, p.pilot_status
     from public.app_users u
     left join public.pilot_profiles p on p.id = u.id
     where u.id = $1
     limit 1`,
    [userId]
  );
  
  if (pilot) return pilot;
  
  // Crear entrada en app_users si no existe
  await dbQuery(
    `insert into public.app_users (id, email, display_name, first_name, last_name, metadata)
     values ($1::uuid, $2, $3, $4, $5, $6::jsonb)
     on conflict (id) do nothing`,
    [userId, email, displayName || email, "", "", JSON.stringify({ source: "acars-supabase-fallback" })]
  );
  
  // Buscar perfil en pilot_profiles (podría existir de antes)
  pilot = await dbOne<{
    id: string;
    email: string;
    callsign: string | null;
    rank_code: string | null;
    pilot_status: string | null;
  }>(
    `select p.id::text as "id", $2 as email, p.callsign, p.rank_code, p.pilot_status
     from public.pilot_profiles p
     where p.id = $1
     limit 1`,
    [userId, email]
  );
  
  return pilot;
}

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

    // Intentar login con sistema custom (Neon)
    let loginResult;
    let isLegacyUser = false;
    
    try {
      loginResult = await loginPilot({ email, password });
    } catch (authErr) {
      // Si falla custom auth, intentar con Supabase (usuarios legacy)
      console.log("[acars/auth/login] Custom auth failed, trying Supabase fallback...");
      const supabaseUser = await loginWithSupabaseFallback(email, password);
      
      if (!supabaseUser) {
        // Ambos fallaron
        throw authErr;
      }
      
      // Usuario legacy autenticado con Supabase
      isLegacyUser = true;
      loginResult = {
        userId: supabaseUser.userId,
        email: supabaseUser.email,
        displayName: supabaseUser.displayName,
        sessionToken: "legacy_" + Math.random().toString(36).substring(2), // Token temporal
      };
      console.log("[acars/auth/login] Supabase fallback SUCCESS for", email);
    }

    // Obtener perfil completo del piloto con callsign
    let pilot;
    
    if (isLegacyUser) {
      // Para usuarios legacy, buscar/crear perfil
      pilot = await getOrCreatePilotProfile(loginResult.userId, loginResult.email, loginResult.displayName);
    } else {
      // Para usuarios custom, buscar normalmente
      pilot = await dbOne<{
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
    }

    if (!pilot || !pilot.callsign) {
      return NextResponse.json(
        { ok: false, code: "PILOT_NOT_FOUND", error: "Perfil de piloto no encontrado. Contacte soporte." },
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
