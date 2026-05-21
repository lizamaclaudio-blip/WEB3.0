"use client";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export type StoredSession = {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
  user?: {
    id: string;
    email?: string;
    user_metadata?: Record<string, unknown>;
  };
};

const STORAGE_KEY = "pw3.supabase.session";

function assertEnv() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local");
  }
}

export function getStoredSession(): StoredSession | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StoredSession;
    return parsed?.access_token ? parsed : null;
  } catch {
    return null;
  }
}

export function storeSession(session: StoredSession) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearStoredSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}

async function resolveIdentifier(identifier: string) {
  const value = identifier.trim();
  if (value.includes("@")) return value;
  const response = await fetch(`/api/auth/resolve-callsign?callsign=${encodeURIComponent(value)}`, { cache: "no-store" });
  if (!response.ok) throw new Error("No se encontró un correo asociado a ese callsign.");
  const data = (await response.json()) as { email?: string };
  if (!data.email) throw new Error("El callsign no tiene correo asociado.");
  return data.email;
}

export async function signInWithPassword(identifier: string, password: string) {
  assertEnv();
  const email = await resolveIdentifier(identifier);
  const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error_description || data?.msg || data?.message || "No se pudo iniciar sesión.");
  }
  const session: StoredSession = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: data.expires_at,
    user: data.user,
  };
  storeSession(session);
  return session;
}

export async function signUpPilotAccount(input: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  callsign: string;
  base: string;
  experience: string;
}) {
  assertEnv();
  const response = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: input.email.trim(),
      password: input.password,
      data: {
        first_name: input.firstName.trim(),
        last_name: input.lastName.trim(),
        callsign: input.callsign.trim().toUpperCase(),
        base_hub: input.base,
        experience: input.experience,
      },
    }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error_description || data?.msg || data?.message || "No se pudo crear la cuenta.");
  }
  if (data.access_token) {
    storeSession({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: data.expires_at,
      user: data.user,
    });
  }
  return data;
}
