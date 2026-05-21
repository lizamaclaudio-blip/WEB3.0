import { headers } from "next/headers";
import { getUserFromBearer, restSingle } from "@/lib/supabase/rest-server";
import { SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL } from "@/lib/supabase/env";

type PilotProfile = {
  id?: string;
  callsign?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  rank_code?: string | null;
  career_rank_code?: string | null;
  base_hub?: string | null;
  current_airport_code?: string | null;
  status?: string | null;
};

export function getSupabaseServerClient() {
  return {
    url: SUPABASE_URL,
    key: SUPABASE_ANON_KEY,
  };
}

export function getSupabaseAdminClient() {
  return {
    url: SUPABASE_URL,
    key: SUPABASE_SERVICE_ROLE_KEY,
  };
}

export async function getCurrentUserFromRequest() {
  const h = await headers();
  const auth = h.get("authorization") ?? "";
  const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  if (!token) return null;
  try {
    return await getUserFromBearer(token);
  } catch {
    return null;
  }
}

export async function getCurrentUser() {
  return getCurrentUserFromRequest();
}

export async function requireUser() {
  const user = await getCurrentUserFromRequest();
  if (!user) throw new Error("No autenticado.");
  return user;
}

export async function requireAuthenticatedPilot() {
  const h = await headers();
  const auth = h.get("authorization") ?? "";
  const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  if (!token) throw new Error("No autenticado.");

  const user = await getUserFromBearer(token);
  const profile = await restSingle<PilotProfile>(
    "pilot_profiles",
    `select=id,callsign,first_name,last_name,rank_code,career_rank_code,base_hub,current_airport_code,status&id=eq.${encodeURIComponent(user.id)}&limit=1`,
    { bearer: token },
  );

  return { user, token, profile };
}

export async function requirePilotProfile() {
  const { profile } = await requireAuthenticatedPilot();
  if (!profile) throw new Error("Perfil pendiente.");
  return profile;
}
