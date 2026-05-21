import { promises as fs } from "node:fs";
import path from "node:path";
import { SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL } from "@/lib/supabase/env";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const CACHE_FILE_PATH = path.join(process.cwd(), ".cache", "places-shared-cache.json");
const SUPABASE_CACHE_PROVIDER = (process.env.PLACES_CACHE_PROVIDER ?? "file").trim().toLowerCase();
const SUPABASE_CACHE_TABLE = (process.env.SUPABASE_PLACES_CACHE_TABLE ?? "public_places_cache").trim();

type Entry<T> = {
  value: T;
  expiresAt: number;
};

type CacheStore = Record<string, Entry<unknown>>;

type SupabaseCacheRow = {
  cache_key?: string;
  payload?: unknown;
  expires_at?: string;
};

const memoryCache = new Map<string, Entry<unknown>>();
let fileCacheLoaded = false;
let fileCache: CacheStore = {};

function now() {
  return Date.now();
}

function hasSupabaseCacheEnabled() {
  return SUPABASE_CACHE_PROVIDER === "supabase" && Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
}

function getSupabaseHeaders(prefer?: string) {
  return {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    "Content-Type": "application/json",
    ...(prefer ? { Prefer: prefer } : {}),
  };
}

async function readSupabaseCache<T>(key: string): Promise<T | null> {
  if (!hasSupabaseCacheEnabled()) return null;

  const url = new URL(`/rest/v1/${SUPABASE_CACHE_TABLE}`, SUPABASE_URL);
  url.searchParams.set("select", "payload,expires_at");
  url.searchParams.set("cache_key", `eq.${key}`);
  url.searchParams.set("limit", "1");

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: getSupabaseHeaders(),
      cache: "no-store",
    });

    if (!response.ok) return null;

    const rows = (await response.json().catch(() => null)) as SupabaseCacheRow[] | null;
    const row = rows?.[0];
    if (!row) return null;

    const expiresAt = Date.parse(row.expires_at ?? "");
    if (!Number.isFinite(expiresAt) || now() >= expiresAt) return null;

    const payload = row.payload as T;
    memoryCache.set(key, { value: payload as unknown, expiresAt });
    return payload;
  } catch {
    return null;
  }
}

async function writeSupabaseCache<T>(key: string, value: T, ttlMs: number) {
  if (!hasSupabaseCacheEnabled()) return false;

  const expiresAt = new Date(now() + ttlMs).toISOString();
  const url = new URL(`/rest/v1/${SUPABASE_CACHE_TABLE}`, SUPABASE_URL);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: getSupabaseHeaders("resolution=merge-duplicates,return=minimal"),
      body: JSON.stringify([
        {
          cache_key: key,
          payload: value,
          expires_at: expiresAt,
        },
      ]),
      cache: "no-store",
    });

    if (!response.ok) return false;

    memoryCache.set(key, { value: value as unknown, expiresAt: now() + ttlMs });
    return true;
  } catch {
    return false;
  }
}

async function ensureFileCacheLoaded() {
  if (fileCacheLoaded) return;
  fileCacheLoaded = true;

  try {
    const raw = await fs.readFile(CACHE_FILE_PATH, "utf8");
    const parsed = JSON.parse(raw) as CacheStore;
    fileCache = parsed ?? {};
  } catch {
    fileCache = {};
  }
}

async function persistFileCache() {
  await fs.mkdir(path.dirname(CACHE_FILE_PATH), { recursive: true });
  await fs.writeFile(CACHE_FILE_PATH, JSON.stringify(fileCache), "utf8");
}

export function getAirportCacheKey(lat: number, lng: number) {
  const latRounded = lat.toFixed(2);
  const lngRounded = lng.toFixed(2);
  return `places:airport:${latRounded}:${lngRounded}`;
}

export function getCachedMemory<T>(key: string): T | null {
  const hit = memoryCache.get(key);
  if (!hit) return null;
  if (now() >= hit.expiresAt) {
    memoryCache.delete(key);
    return null;
  }
  return hit.value as T;
}

export async function getCachedShared<T>(key: string): Promise<T | null> {
  const memoryHit = getCachedMemory<T>(key);
  if (memoryHit) return memoryHit;

  const supabaseHit = await readSupabaseCache<T>(key);
  if (supabaseHit) return supabaseHit;

  await ensureFileCacheLoaded();
  const hit = fileCache[key];
  if (!hit) return null;

  if (now() >= hit.expiresAt) {
    delete fileCache[key];
    await persistFileCache();
    return null;
  }

  memoryCache.set(key, hit);
  return hit.value as T;
}

export async function setCachedShared<T>(key: string, value: T, ttlMs = THIRTY_DAYS_MS) {
  const persistedOnSupabase = await writeSupabaseCache(key, value, ttlMs);
  if (persistedOnSupabase) return;

  const entry: Entry<T> = {
    value,
    expiresAt: now() + ttlMs,
  };

  memoryCache.set(key, entry as Entry<unknown>);
  await ensureFileCacheLoaded();
  fileCache[key] = entry as Entry<unknown>;
  await persistFileCache();
}

export const defaultCacheTtlMs = THIRTY_DAYS_MS;
