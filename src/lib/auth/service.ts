import { createHash, randomBytes } from "node:crypto";
import type { PoolClient } from "pg";
import { dbOne, dbQuery, dbTransaction } from "@/lib/db/client";
import { createPasswordHash, verifyPassword } from "@/lib/auth/password";
import { PW3_SESSION_MAX_AGE_SECONDS } from "@/lib/session/server";

export type RegisterPilotInput = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  hubIdent: string;
  experience?: string;
};

export type LoginPilotInput = {
  email: string;
  password: string;
};

export type AuthenticatedPilot = {
  userId: string;
  email: string;
  displayName: string | null;
  pilotId: string | null;
  callsign: string | null;
  callsignNumber: number | null;
  rankCode: string | null;
  pilotStatus: string | null;
  founderBadge: boolean;
  founderNumber: number | null;
  baseAirportId: string | null;
  currentAirportId: string | null;
  baseAirportIdent: string | null;
  baseAirportIcao: string | null;
  baseAirportIata: string | null;
  baseAirportName: string | null;
  baseAirportCity: string | null;
  baseAirportCountry: string | null;
  currentAirportIdent: string | null;
  currentAirportIcao: string | null;
  currentAirportIata: string | null;
  currentAirportName: string | null;
  currentAirportCity: string | null;
  currentAirportCountry: string | null;
  currentAirportLightingPolicy: string | null;
  currentAirportLightingWarningOnly: boolean;
};

class AuthError extends Error {
  status: number;
  code: string;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.name = "AuthError";
    this.status = status;
    this.code = code;
  }
}

export function isAuthError(error: unknown): error is AuthError {
  return error instanceof AuthError;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeHub(value: string) {
  return value.trim().toUpperCase();
}

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function createSessionToken() {
  return randomBytes(48).toString("base64url");
}

function assertValidRegisterInput(input: RegisterPilotInput) {
  const email = normalizeEmail(input.email);
  const firstName = normalizeName(input.firstName);
  const lastName = normalizeName(input.lastName);
  const hubIdent = normalizeHub(input.hubIdent);

  if (!firstName) throw new AuthError("FIRST_NAME_REQUIRED", "Debes ingresar tu nombre.");
  if (!lastName) throw new AuthError("LAST_NAME_REQUIRED", "Debes ingresar tu apellido.");
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new AuthError("INVALID_EMAIL", "Ingresa un correo electronico valido.");
  if (input.password.length < 8) throw new AuthError("PASSWORD_TOO_SHORT", "La contrasena debe tener al menos 8 caracteres.");
  if (!["SCPF", "SCTB", "SCIE"].includes(hubIdent)) throw new AuthError("INVALID_HUB", "Selecciona un hub escuela valido.");

  return { email, firstName, lastName, hubIdent };
}

export async function ensureAuthSchema() {
  await dbQuery("create extension if not exists pgcrypto");

  await dbQuery(`
    create table if not exists public.app_users (
      id uuid primary key default gen_random_uuid(),
      email text unique not null,
      display_name text,
      first_name text,
      last_name text,
      metadata jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `);

  await dbQuery("alter table public.app_users add column if not exists first_name text");
  await dbQuery("alter table public.app_users add column if not exists last_name text");
  await dbQuery("alter table public.app_users add column if not exists metadata jsonb not null default '{}'::jsonb");

  await dbQuery(`
    create table if not exists public.app_user_credentials (
      user_id uuid primary key references public.app_users(id) on delete cascade,
      password_hash text not null,
      password_salt text not null,
      password_algorithm text not null default 'scrypt-v1',
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `);

  await dbQuery(`
    create table if not exists public.app_sessions (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null references public.app_users(id) on delete cascade,
      token_hash text unique not null,
      expires_at timestamptz not null,
      created_at timestamptz not null default now(),
      last_seen_at timestamptz not null default now()
    )
  `);

  await dbQuery("create index if not exists idx_app_sessions_user_id on public.app_sessions(user_id)");
  await dbQuery("create index if not exists idx_app_sessions_expires_at on public.app_sessions(expires_at)");
}

async function createSessionForUser(client: PoolClient, userId: string) {
  const token = createSessionToken();
  const hash = tokenHash(token);

  await client.query(
    `insert into public.app_sessions (user_id, token_hash, expires_at)
     values ($1, $2, now() + ($3::text || ' seconds')::interval)`,
    [userId, hash, PW3_SESSION_MAX_AGE_SECONDS],
  );

  return token;
}

async function deleteExpiredSessions() {
  await dbQuery("delete from public.app_sessions where expires_at <= now()");
}

export async function registerPilot(input: RegisterPilotInput) {
  await ensureAuthSchema();
  const valid = assertValidRegisterInput(input);
  const displayName = `${valid.firstName} ${valid.lastName}`.trim();
  const password = createPasswordHash(input.password);

  try {
    return await dbTransaction(async (client) => {
      const userResult = await client.query<{ id: string }>(
        `insert into public.app_users (email, display_name, first_name, last_name, metadata)
         values ($1, $2, $3, $4, $5::jsonb)
         on conflict (email) do nothing
         returning id`,
        [
          valid.email,
          displayName,
          valid.firstName,
          valid.lastName,
          JSON.stringify({ experience: input.experience ?? null, source: "web-register" }),
        ],
      );

      const userId = userResult.rows[0]?.id;
      if (!userId) throw new AuthError("EMAIL_EXISTS", "Ya existe una cuenta con ese correo.", 409);

      await client.query(
        `insert into public.app_user_credentials (user_id, password_hash, password_salt, password_algorithm)
         values ($1, $2, $3, $4)`,
        [userId, password.passwordHash, password.salt, password.algorithm],
      );

      const profileResult = await client.query<{ pilot_id: string }>(
        "select public.pw_create_pilot_profile_for_user($1::uuid, $2::text, $3::text)::text as pilot_id",
        [userId, valid.email, displayName],
      );

      await client.query("select public.pw_select_initial_training_hub($1::uuid, $2::text)", [userId, valid.hubIdent]);

      const sessionToken = await createSessionForUser(client, userId);

      return {
        userId,
        pilotId: profileResult.rows[0]?.pilot_id ?? null,
        email: valid.email,
        displayName,
        sessionToken,
      };
    });
  } catch (error) {
    if (isAuthError(error)) throw error;
    console.error("[auth/register] failed", error);
    throw new AuthError("REGISTER_FAILED", "No se pudo crear la cuenta de piloto.", 500);
  }
}

export async function loginPilot(input: LoginPilotInput) {
  await ensureAuthSchema();
  await deleteExpiredSessions();
  const email = normalizeEmail(input.email);

  if (!/^\S+@\S+\.\S+$/.test(email)) throw new AuthError("INVALID_LOGIN", "Correo o contrasena incorrectos.", 401);

  const row = await dbOne<{
    user_id: string;
    email: string;
    display_name: string | null;
    password_hash: string;
    password_salt: string;
  }>(
    `select
       u.id::text as user_id,
       u.email,
       u.display_name,
       c.password_hash,
       c.password_salt
     from public.app_users u
     join public.app_user_credentials c on c.user_id = u.id
     where lower(u.email) = lower($1)
     limit 1`,
    [email],
  );

  if (!row || !verifyPassword(input.password, row.password_salt, row.password_hash)) {
    throw new AuthError("INVALID_LOGIN", "Correo o contrasena incorrectos.", 401);
  }

  const sessionToken = await dbTransaction((client) => createSessionForUser(client, row.user_id));

  return {
    userId: row.user_id,
    email: row.email,
    displayName: row.display_name,
    sessionToken,
  };
}

export async function destroySession(token: string | null) {
  if (!token) return;
  await ensureAuthSchema();
  await dbQuery("delete from public.app_sessions where token_hash = $1", [tokenHash(token)]);
}

export async function getAuthenticatedPilot(token: string | null): Promise<AuthenticatedPilot | null> {
  if (!token) return null;
  await ensureAuthSchema();
  await deleteExpiredSessions();

  const row = await dbOne<AuthenticatedPilot>(
    `select
       u.id::text as "userId",
       u.email,
       u.display_name as "displayName",
       p.id::text as "pilotId",
       p.callsign,
       p.callsign_number as "callsignNumber",
       p.rank_code as "rankCode",
       p.pilot_status as "pilotStatus",
       coalesce(p.founder_badge, false) as "founderBadge",
       p.founder_number as "founderNumber",
       p.base_airport_id::text as "baseAirportId",
       p.current_airport_id::text as "currentAirportId",
       base.ident as "baseAirportIdent",
       base.icao as "baseAirportIcao",
       base.iata as "baseAirportIata",
       base.name as "baseAirportName",
       base.city as "baseAirportCity",
       base.country as "baseAirportCountry",
       current_airport.ident as "currentAirportIdent",
       current_airport.icao as "currentAirportIcao",
       current_airport.iata as "currentAirportIata",
       current_airport.name as "currentAirportName",
       current_airport.city as "currentAirportCity",
       current_airport.country as "currentAirportCountry",
       current_airport.lighting_policy as "currentAirportLightingPolicy",
       coalesce(current_airport.lighting_warning_only, false) as "currentAirportLightingWarningOnly"
     from public.app_sessions s
     join public.app_users u on u.id = s.user_id
     left join public.pilot_profiles p on p.id = u.id
     left join public.airports base on base.id = p.base_airport_id
     left join public.airports current_airport on current_airport.id = p.current_airport_id
     where s.token_hash = $1
       and s.expires_at > now()
     limit 1`,
    [tokenHash(token)],
  );

  if (!row) return null;

  await dbQuery("update public.app_sessions set last_seen_at = now() where token_hash = $1", [tokenHash(token)]);
  return row;
}
