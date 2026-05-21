export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export function hasPublicSupabaseEnv() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

export function assertPublicSupabaseEnv() {
  if (!hasPublicSupabaseEnv()) {
    throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }
}

export function getServerSupabaseKey(preferAdmin = false) {
  assertPublicSupabaseEnv();
  if (preferAdmin && SUPABASE_SERVICE_ROLE_KEY.trim()) return SUPABASE_SERVICE_ROLE_KEY;
  return SUPABASE_ANON_KEY;
}
