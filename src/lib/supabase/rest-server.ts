import { SUPABASE_ANON_KEY, SUPABASE_URL, assertPublicSupabaseEnv, getServerSupabaseKey } from "@/lib/supabase/env";

export type JsonObject = Record<string, unknown>;

export type SupabaseUser = {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
};

function buildUrl(path: string, search?: string) {
  assertPublicSupabaseEnv();
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const cleanSearch = search ? (search.startsWith("?") ? search : `?${search}`) : "";
  return `${SUPABASE_URL}${cleanPath}${cleanSearch}`;
}

export function supabaseHeaders(options?: { bearer?: string | null; preferAdmin?: boolean; prefer?: string }) {
  const key = options?.bearer ? SUPABASE_ANON_KEY : getServerSupabaseKey(Boolean(options?.preferAdmin));
  return {
    apikey: key,
    Authorization: `Bearer ${options?.bearer || key}`,
    "Content-Type": "application/json",
    ...(options?.prefer ? { Prefer: options.prefer } : {}),
  };
}

export async function getUserFromBearer(accessToken: string): Promise<SupabaseUser> {
  if (!accessToken?.trim()) throw new Error("No autenticado.");
  const response = await fetch(buildUrl("/auth/v1/user"), {
    method: "GET",
    headers: supabaseHeaders({ bearer: accessToken }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Sesión inválida.");
  return (await response.json()) as SupabaseUser;
}

export async function restSelect<T = JsonObject>(
  table: string,
  query: string,
  options?: { bearer?: string | null; preferAdmin?: boolean; fallback?: T[] }
): Promise<T[]> {
  try {
    const response = await fetch(buildUrl(`/rest/v1/${table}`, query), {
      method: "GET",
      headers: supabaseHeaders({ bearer: options?.bearer, preferAdmin: options?.preferAdmin }),
      cache: "no-store",
    });
    if (!response.ok) return options?.fallback ?? [];
    return (await response.json()) as T[];
  } catch {
    return options?.fallback ?? [];
  }
}

export async function restSingle<T = JsonObject>(
  table: string,
  query: string,
  options?: { bearer?: string | null; preferAdmin?: boolean }
): Promise<T | null> {
  const rows = await restSelect<T>(table, query, options);
  return rows[0] ?? null;
}

export async function restCount(table: string, filter = "", options?: { preferAdmin?: boolean }) {
  try {
    const search = `select=id${filter ? `&${filter}` : ""}`;
    const response = await fetch(buildUrl(`/rest/v1/${table}`, search), {
      method: "HEAD",
      headers: supabaseHeaders({ preferAdmin: options?.preferAdmin, prefer: "count=exact" }),
      cache: "no-store",
    });
    if (!response.ok) return 0;
    return Number(response.headers.get("content-range")?.split("/").pop() ?? 0) || 0;
  } catch {
    return 0;
  }
}

export async function restRpc<T = JsonObject>(
  functionName: string,
  args: JsonObject = {},
  options?: { bearer?: string | null; preferAdmin?: boolean; fallback?: T }
): Promise<T | null> {
  try {
    const response = await fetch(buildUrl(`/rest/v1/rpc/${functionName}`), {
      method: "POST",
      headers: supabaseHeaders({ bearer: options?.bearer, preferAdmin: options?.preferAdmin }),
      body: JSON.stringify(args),
      cache: "no-store",
    });
    if (!response.ok) return options?.fallback ?? null;
    return (await response.json()) as T;
  } catch {
    return options?.fallback ?? null;
  }
}
