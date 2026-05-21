import { NextRequest, NextResponse } from "next/server";
import { dbOne, dbQuery } from "@/lib/db/client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 3600;

type AirportRow = {
  ident: string | null;
  icao: string | null;
  name: string | null;
  city: string | null;
  municipality: string | null;
  country: string | null;
  iso_country: string | null;
  wikipedia_link: string | null;
};

type CacheRow = {
  image_url: string;
  source: string;
  attribution: string | null;
  title: string | null;
};

type HeroImageResult = {
  imageUrl: string;
  source: string;
  attribution: string;
  sourceUrl: string | null;
  title: string;
};

function sanitize(value: string | null | undefined) {
  return (value ?? "").trim();
}

function upperCode(value: string | null | undefined) {
  return sanitize(value).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);
}

function jsonResponse(body: unknown) {
  return NextResponse.json(body, {
    headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
  });
}

function looksLikeLogoOrWordmark(imageUrl?: string | null, title?: string | null) {
  const combined = `${imageUrl ?? ""} ${title ?? ""}`.toLowerCase();
  return (
    combined.includes("logo") ||
    combined.includes("wordmark") ||
    combined.includes("brand") ||
    combined.includes("aeropuerto") ||
    combined.includes("airport")
  );
}

async function ensureCityImageCacheTable() {
  await dbQuery(`
    create table if not exists public.city_image_cache (
      id uuid primary key default gen_random_uuid(),
      cache_key text unique not null,
      image_url text not null,
      source text not null,
      attribution text,
      title text,
      created_at timestamptz not null default now(),
      expires_at timestamptz not null
    )
  `);
}

async function getCached(cacheKey: string) {
  return await dbOne<CacheRow>(
    `select image_url, source, attribution, title
       from public.city_image_cache
      where cache_key = $1
        and expires_at > now()
      limit 1`,
    [cacheKey],
  );
}

async function setCache(cacheKey: string, payload: { image_url: string; source: string; attribution?: string | null; title?: string | null }, ttlHours = 24) {
  await dbQuery(
    `insert into public.city_image_cache (cache_key, image_url, source, attribution, title, expires_at)
     values ($1, $2, $3, $4, $5, now() + ($6::text || ' hours')::interval)
     on conflict (cache_key)
     do update set image_url = excluded.image_url,
                   source = excluded.source,
                   attribution = excluded.attribution,
                   title = excluded.title,
                   created_at = now(),
                   expires_at = excluded.expires_at`,
    [cacheKey, payload.image_url, payload.source, payload.attribution ?? null, payload.title ?? null, ttlHours],
  );
}

async function findAirportByCode(code: string) {
  return await dbOne<AirportRow>(
    `select ident, icao, name, city, municipality, country, iso_country, wikipedia_link
       from public.airports
      where upper(ident) = $1 or upper(icao) = $1
      limit 1`,
    [code],
  );
}

async function fetchWikipediaImageByTitle(title: string): Promise<HeroImageResult | null> {
  const url = new URL("https://en.wikipedia.org/w/api.php");
  url.searchParams.set("action", "query");
  url.searchParams.set("format", "json");
  url.searchParams.set("prop", "pageimages|info");
  url.searchParams.set("inprop", "url");
  url.searchParams.set("pithumbsize", "1400");
  url.searchParams.set("redirects", "1");
  url.searchParams.set("titles", title);

  const response = await fetch(url, { next: { revalidate: 86400 } });
  if (!response.ok) return null;

  const payload = (await response.json().catch(() => null)) as {
    query?: { pages?: Record<string, { title?: string; fullurl?: string; thumbnail?: { source?: string } }> };
  } | null;

  const page = Object.values(payload?.query?.pages ?? {}).find((item) => item?.thumbnail?.source);
  if (!page?.thumbnail?.source) return null;

  const result = {
    imageUrl: page.thumbnail.source,
    source: "wikimedia",
    attribution: page.fullurl ? `Imagen: Wikimedia - ${page.fullurl}` : "Imagen: Wikimedia",
    sourceUrl: page.fullurl ?? null,
    title: page.title ?? title,
  };
  if (looksLikeLogoOrWordmark(result.imageUrl, result.title)) return null;
  return result;
}

async function fetchPexelsFallback(query: string): Promise<HeroImageResult | null> {
  const key = process.env.PEXELS_API_KEY;
  if (!key) return null;

  const url = new URL("https://api.pexels.com/v1/search");
  url.searchParams.set("query", query);
  url.searchParams.set("per_page", "1");

  const response = await fetch(url, {
    headers: { Authorization: key },
    next: { revalidate: 86400 },
  });
  if (!response.ok) return null;

  const payload = (await response.json().catch(() => null)) as {
    photos?: Array<{ src?: { landscape?: string; large?: string }; photographer?: string; url?: string }>;
  } | null;

  const photo = payload?.photos?.[0];
  const imageUrl = photo?.src?.landscape || photo?.src?.large;
  if (!imageUrl) return null;

  const result = {
    imageUrl,
    source: "pexels",
    attribution: `Photo by ${photo?.photographer ?? "Pexels"}${photo?.url ? ` - ${photo.url}` : ""}`,
    sourceUrl: photo?.url ?? null,
    title: query,
  };
  if (looksLikeLogoOrWordmark(result.imageUrl, result.title)) return null;
  return result;
}

function defaultImage(code: string) {
  return {
    imageUrl: `/images/airports/${code || "default"}.jpg`,
    source: "default",
    attribution: "Imagen por defecto Patagonia Wings",
    sourceUrl: null,
    title: code || "default",
  };
}

export async function GET(request: NextRequest) {
  const code = upperCode(request.nextUrl.searchParams.get("ident") || request.nextUrl.searchParams.get("icao"));
  if (!code) return NextResponse.json({ error: "ident/icao requerido" }, { status: 400 });

  await ensureCityImageCacheTable();
  const cacheKey = `airport:${code}`;
  const cached = await getCached(cacheKey);
  if (cached && !looksLikeLogoOrWordmark(cached.image_url, cached.title)) {
    console.info(`[hero] source=${cached.source} hidden_attribution=true`);
    return jsonResponse({ imageUrl: cached.image_url, source: cached.source, attribution: cached.attribution, sourceUrl: null, title: cached.title });
  }

  const airport = await findAirportByCode(code);
  const city = sanitize(airport?.city || airport?.municipality);
  const country = sanitize(airport?.country || airport?.iso_country);
  const airportName = sanitize(airport?.name);

  const cityQuery = [city, country].filter(Boolean).join(", ");
  if (cityQuery) {
    const image = await fetchWikipediaImageByTitle(cityQuery);
    if (image) {
      await setCache(cacheKey, { image_url: image.imageUrl, source: image.source, attribution: image.attribution, title: image.title });
      console.info("[hero] source=wikimedia hidden_attribution=true");
      return jsonResponse(image);
    }
  }

  const pexels = await fetchPexelsFallback(cityQuery || airportName || code);
  if (pexels) {
    await setCache(cacheKey, { image_url: pexels.imageUrl, source: pexels.source, attribution: pexels.attribution, title: pexels.title });
    console.info("[hero] source=pexels hidden_attribution=true");
    return jsonResponse(pexels);
  }

  const fallback = defaultImage(code);
  await setCache(cacheKey, { image_url: fallback.imageUrl, source: fallback.source, attribution: fallback.attribution, title: fallback.title }, 12);
  console.info("[hero] source=default hidden_attribution=true");
  return jsonResponse(fallback);
}
