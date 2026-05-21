import { NextRequest, NextResponse } from "next/server";
import { defaultCacheTtlMs, getAirportCacheKey, getCachedShared, setCachedShared } from "@/lib/places/cache";
import { fetchNearbyPlaces, sanitizeCoordinate, sanitizeRadius } from "@/lib/places/service";
import type { NearbyPlacesResponse } from "@/lib/places/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function jsonResponse(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=2592000",
    },
  });
}

export async function GET(request: NextRequest) {
  const lat = sanitizeCoordinate(request.nextUrl.searchParams.get("lat"));
  const lng = sanitizeCoordinate(request.nextUrl.searchParams.get("lng"));
  const radiusKm = sanitizeRadius(request.nextUrl.searchParams.get("radiusKm"));

  if (lat == null || lng == null) {
    return jsonResponse({ error: "lat y lng son obligatorios y deben ser numericos." }, 400);
  }

  const cacheKey = getAirportCacheKey(lat, lng);
  const cached = await getCachedShared<NearbyPlacesResponse>(cacheKey);
  if (cached) {
    return jsonResponse({ ...cached, cache: "hit" });
  }

  try {
    const places = await fetchNearbyPlaces(lat, lng, radiusKm);
    const onePlace = places.length > 0 ? [places[0]] : [];

    const payload: NearbyPlacesResponse = {
      center: { lat, lng },
      radiusKm,
      places: onePlace,
    };

    await setCachedShared(cacheKey, payload, defaultCacheTtlMs);
    return jsonResponse({ ...payload, cache: "miss" });
  } catch {
    return jsonResponse(
      {
        center: { lat, lng },
        radiusKm,
        places: [],
        error: "No fue posible obtener atracciones cercanas en este momento.",
      },
      502,
    );
  }
}
