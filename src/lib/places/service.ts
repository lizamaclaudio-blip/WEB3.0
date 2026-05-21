import type { NearbyPlace, PlaceCategory } from "@/lib/places/types";

type OverpassElement = {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

type OverpassResponse = {
  elements?: OverpassElement[];
};

type WikimediaEnrichment = {
  label: string | null;
  description: string | null;
  imageUrl: string | null;
  wikipedia: string | null;
};

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const USER_AGENT = "PatagoniaWings/3.0 nearby attractions";

function asNumber(value: string | null, fallback: number) {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toRad(degrees: number) {
  return (degrees * Math.PI) / 180;
}

function distanceKm(fromLat: number, fromLng: number, toLat: number, toLng: number) {
  const earth = 6371;
  const dLat = toRad(toLat - fromLat);
  const dLng = toRad(toLng - fromLng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(fromLat)) * Math.cos(toRad(toLat)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(earth * c * 100) / 100;
}

function categoryFromTags(tags: Record<string, string>): PlaceCategory {
  if (tags.tourism === "attraction") return "attraction";
  if (tags.tourism === "museum") return "museum";
  if (tags.tourism === "viewpoint") return "viewpoint";
  if (tags.historic) return "historic";
  if (tags.leisure === "park") return "park";
  if (tags.natural === "beach") return "beach";
  if (tags.natural === "peak") return "peak";
  return "other";
}

function cleanName(value: string | null | undefined) {
  const normalized = (value ?? "").trim();
  return normalized.length > 0 ? normalized : null;
}

function pickInitialName(tags: Record<string, string>) {
  return cleanName(tags.name) ?? cleanName(tags["name:es"]) ?? cleanName(tags["name:en"]);
}

function normalizeWikidataId(value: string | null | undefined) {
  const clean = (value ?? "").trim().toUpperCase();
  return /^Q\d+$/.test(clean) ? clean : null;
}

function normalizeWikipediaTag(value: string | null | undefined) {
  const clean = (value ?? "").trim();
  return clean.length > 0 ? clean : null;
}

function wikipediaTagToTitle(tag: string) {
  const idx = tag.indexOf(":");
  if (idx <= 0 || idx === tag.length - 1) return null;
  return {
    lang: tag.slice(0, idx).toLowerCase(),
    title: decodeURIComponent(tag.slice(idx + 1)).replace(/_/g, " "),
  };
}

async function fetchWikipediaSummaryByTitle(lang: string, title: string): Promise<WikimediaEnrichment> {
  const url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    next: { revalidate: 60 * 60 * 24 * 30 },
  });

  if (!response.ok) {
    return { label: title, description: null, imageUrl: null, wikipedia: `${lang}:${title}` };
  }

  const payload = (await response.json().catch(() => null)) as
    | {
        title?: string;
        extract?: string;
        thumbnail?: { source?: string };
        originalimage?: { source?: string };
      }
    | null;

  return {
    label: cleanName(payload?.title) ?? title,
    description: cleanName(payload?.extract),
    imageUrl: payload?.thumbnail?.source ?? payload?.originalimage?.source ?? null,
    wikipedia: `${lang}:${title}`,
  };
}

async function fetchWikidataEntity(qid: string): Promise<WikimediaEnrichment> {
  const response = await fetch(`https://www.wikidata.org/wiki/Special:EntityData/${qid}.json`, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    next: { revalidate: 60 * 60 * 24 * 30 },
  });

  if (!response.ok) return { label: null, description: null, imageUrl: null, wikipedia: null };

  const payload = (await response.json().catch(() => null)) as
    | {
        entities?: Record<
          string,
          {
            labels?: Record<string, { value?: string }>;
            descriptions?: Record<string, { value?: string }>;
            claims?: Record<string, Array<{ mainsnak?: { datavalue?: { value?: string } } }>>;
            sitelinks?: Record<string, { title?: string }>;
          }
        >;
      }
    | null;

  const entity = payload?.entities?.[qid];
  if (!entity) return { label: null, description: null, imageUrl: null, wikipedia: null };

  const label = cleanName(entity.labels?.es?.value) ?? cleanName(entity.labels?.en?.value);
  const description = cleanName(entity.descriptions?.es?.value) ?? cleanName(entity.descriptions?.en?.value);

  const imageFileName = entity.claims?.P18?.[0]?.mainsnak?.datavalue?.value ?? null;
  const imageUrl = imageFileName
    ? `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(imageFileName)}`
    : null;

  const esTitle = entity.sitelinks?.eswiki?.title;
  const enTitle = entity.sitelinks?.enwiki?.title;
  const wikipedia = esTitle ? `es:${esTitle}` : enTitle ? `en:${enTitle}` : null;

  return { label, description, imageUrl, wikipedia };
}

async function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  let timeoutId: NodeJS.Timeout | null = null;
  const timeoutPromise = new Promise<T>((resolve) => {
    timeoutId = setTimeout(() => resolve(fallback), ms);
  });

  const result = await Promise.race([promise, timeoutPromise]);
  if (timeoutId) clearTimeout(timeoutId);
  return result;
}

async function enrichPlace(place: NearbyPlace): Promise<NearbyPlace | null> {
  const wikidataId = place.wikidataId;
  const wikipediaTag = place.wikipedia;
  try {
    if (wikidataId) {
      const enrichment = await withTimeout(fetchWikidataEntity(wikidataId), 1600, {
        label: null,
        description: null,
        imageUrl: null,
        wikipedia: wikipediaTag,
      });

      let resolvedName = cleanName(place.name) ?? cleanName(enrichment.label);
      let summaryDescription = enrichment.description;
      let summaryImage = enrichment.imageUrl;
      let resolvedWikipedia = enrichment.wikipedia ?? wikipediaTag;

      if (resolvedWikipedia) {
        const parsed = wikipediaTagToTitle(resolvedWikipedia);
        if (parsed) {
          const wikiSummary = await withTimeout(
            fetchWikipediaSummaryByTitle(parsed.lang, parsed.title),
            1600,
            { label: null, description: null, imageUrl: null, wikipedia: resolvedWikipedia },
          );
          summaryDescription = wikiSummary.description ?? summaryDescription;
          summaryImage = wikiSummary.imageUrl ?? summaryImage;
          resolvedName = resolvedName ?? cleanName(wikiSummary.label);
          resolvedWikipedia = wikiSummary.wikipedia ?? resolvedWikipedia;
        }
      }

      if (!resolvedName) return null;

      return {
        ...place,
        name: resolvedName,
        description: summaryDescription,
        imageUrl: summaryImage,
        wikipedia: resolvedWikipedia,
        attribution: "OpenStreetMap contributors / Wikimedia",
      };
    }

    if (wikipediaTag) {
      const parsed = wikipediaTagToTitle(wikipediaTag);
      if (!parsed) return cleanName(place.name) ? place : null;

      const enrichment = await withTimeout(fetchWikipediaSummaryByTitle(parsed.lang, parsed.title), 1600, {
        label: null,
        description: null,
        imageUrl: null,
        wikipedia: wikipediaTag,
      });

      const resolvedName = cleanName(place.name) ?? cleanName(enrichment.label);
      if (!resolvedName) return null;

      return {
        ...place,
        name: resolvedName,
        description: enrichment.description,
        imageUrl: enrichment.imageUrl,
        attribution: "OpenStreetMap contributors / Wikimedia",
      };
    }
  } catch {
    // non-blocking enrichment
  }

  return cleanName(place.name) ? place : null;
}

function overpassQuery(lat: number, lng: number, radiusKm: number) {
  const radiusMeters = Math.round(Math.max(1, radiusKm) * 1000);
  return `
[out:json][timeout:25];
(
  node(around:${radiusMeters},${lat},${lng})[tourism=attraction];
  way(around:${radiusMeters},${lat},${lng})[tourism=attraction];
  relation(around:${radiusMeters},${lat},${lng})[tourism=attraction];

  node(around:${radiusMeters},${lat},${lng})[tourism=museum];
  way(around:${radiusMeters},${lat},${lng})[tourism=museum];
  relation(around:${radiusMeters},${lat},${lng})[tourism=museum];

  node(around:${radiusMeters},${lat},${lng})[tourism=viewpoint];
  way(around:${radiusMeters},${lat},${lng})[tourism=viewpoint];
  relation(around:${radiusMeters},${lat},${lng})[tourism=viewpoint];

  node(around:${radiusMeters},${lat},${lng})[historic];
  way(around:${radiusMeters},${lat},${lng})[historic];
  relation(around:${radiusMeters},${lat},${lng})[historic];

  node(around:${radiusMeters},${lat},${lng})[leisure=park];
  way(around:${radiusMeters},${lat},${lng})[leisure=park];
  relation(around:${radiusMeters},${lat},${lng})[leisure=park];

  node(around:${radiusMeters},${lat},${lng})[natural=beach];
  way(around:${radiusMeters},${lat},${lng})[natural=beach];
  relation(around:${radiusMeters},${lat},${lng})[natural=beach];

  node(around:${radiusMeters},${lat},${lng})[natural=peak];
  way(around:${radiusMeters},${lat},${lng})[natural=peak];
  relation(around:${radiusMeters},${lat},${lng})[natural=peak];
);
out center tags;
`;
}

export function sanitizeRadius(radiusParam: string | null) {
  const radius = asNumber(radiusParam, 20);
  if (!Number.isFinite(radius)) return 20;
  return Math.min(50, Math.max(1, radius));
}

export function sanitizeCoordinate(value: string | null) {
  const parsed = asNumber(value, Number.NaN);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function fetchNearbyPlaces(lat: number, lng: number, radiusKm: number): Promise<NearbyPlace[]> {
  const response = await fetch(OVERPASS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      "User-Agent": USER_AGENT,
    },
    body: new URLSearchParams({ data: overpassQuery(lat, lng, radiusKm) }).toString(),
    next: { revalidate: 60 * 60 * 24 * 30 },
  });

  if (!response.ok) {
    throw new Error(`overpass_error_${response.status}`);
  }

  const payload = (await response.json().catch(() => null)) as OverpassResponse | null;
  const elements = payload?.elements ?? [];

  const seen = new Set<string>();
  const rawPlaces: NearbyPlace[] = [];

  for (const element of elements) {
    const tags = element.tags ?? {};
    const resolvedLat = element.lat ?? element.center?.lat;
    const resolvedLng = element.lon ?? element.center?.lon;

    if (resolvedLat == null || resolvedLng == null) continue;

    const id = `${element.type}-${element.id}`;
    if (seen.has(id)) continue;
    seen.add(id);

    rawPlaces.push({
      id,
      source: "osm",
      name: pickInitialName(tags) ?? "",
      category: categoryFromTags(tags),
      lat: resolvedLat,
      lng: resolvedLng,
      distanceKm: distanceKm(lat, lng, resolvedLat, resolvedLng),
      tags,
      wikidataId: normalizeWikidataId(tags.wikidata),
      wikipedia: normalizeWikipediaTag(tags.wikipedia),
      imageUrl: null,
      description: null,
      attribution: "OpenStreetMap contributors",
    });
  }

  const sorted = rawPlaces.sort((a, b) => a.distanceKm - b.distanceKm).slice(0, 12);
  const enriched = await Promise.all(sorted.map((place) => enrichPlace(place)));
  return enriched.filter((place): place is NearbyPlace => place !== null).sort((a, b) => a.distanceKm - b.distanceKm);
}
