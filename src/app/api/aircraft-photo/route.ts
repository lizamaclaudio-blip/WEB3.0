import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type WikiImage = {
  title: string;
  imageUrl: string | null;
  sourceUrl: string | null;
};

const CODE_TO_TITLE: Record<string, string> = {
  C172: "Cessna 172",
  C182: "Cessna 182 Skylane",
  C208: "Cessna 208 Caravan",
  BE58: "Beechcraft Baron",
  B350: "Beechcraft King Air 350",
  TBM9: "Daher TBM 900",
  A320: "Airbus A320",
  A319: "Airbus A319",
  A20N: "Airbus A320neo",
  A321: "Airbus A321",
  A21N: "Airbus A321neo",
  A339: "Airbus A330-900",
  A359: "Airbus A350-900",
  B736: "Boeing 737-600",
  B737: "Boeing 737",
  B38M: "Boeing 737 MAX 8",
  B738: "Boeing 737-800",
  B739: "Boeing 737-900",
  E175: "Embraer 175",
  E190: "Embraer 190",
  E195: "Embraer 195",
  B763: "Boeing 767",
  B772: "Boeing 777-200",
  B77W: "Boeing 777-300ER",
  B788: "Boeing 787-8",
  B789: "Boeing 787-9",
  B78X: "Boeing 787-10",
  MD82: "McDonnell Douglas MD-82",
  MD83: "McDonnell Douglas MD-83",
  MD88: "McDonnell Douglas MD-88",
  AT76: "ATR 72",
};

function normalize(value: string | null) {
  return (value ?? "").trim();
}

async function wikiImageFromTitle(title: string): Promise<WikiImage | null> {
  const url = new URL("https://en.wikipedia.org/w/api.php");
  url.searchParams.set("action", "query");
  url.searchParams.set("format", "json");
  url.searchParams.set("prop", "pageimages|info");
  url.searchParams.set("inprop", "url");
  url.searchParams.set("pithumbsize", "1200");
  url.searchParams.set("redirects", "1");
  url.searchParams.set("titles", title);

  try {
    const response = await fetch(url, { next: { revalidate: 86400 } });
    if (!response.ok) return null;
    const payload = (await response.json().catch(() => null)) as {
      query?: { pages?: Record<string, { title?: string; fullurl?: string; thumbnail?: { source?: string } }> };
    } | null;
    const page = Object.values(payload?.query?.pages ?? {}).find((item) => item?.thumbnail?.source);
    if (!page?.thumbnail?.source) return null;
    return {
      title: page.title ?? title,
      imageUrl: page.thumbnail.source,
      sourceUrl: page.fullurl ?? null,
    };
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const code = normalize(request.nextUrl.searchParams.get("code")).toUpperCase();
  const name = normalize(request.nextUrl.searchParams.get("name"));

  const candidates = [
    name,
    CODE_TO_TITLE[code],
    code ? `Aircraft ${code}` : "",
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    const image = await wikiImageFromTitle(candidate);
    if (image?.imageUrl) {
      return NextResponse.json({ ok: true, source: "wikimedia", ...image });
    }
  }

  return NextResponse.json({ ok: false, source: "wikimedia", imageUrl: null, sourceUrl: null, title: name || code || "Aeronave" });
}
