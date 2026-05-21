import DispatchRoomClient from "@/components/dispatch/DispatchRoomClient";

type SearchParams = Record<string, string | string[] | undefined>;

function getSearchValue(params: SearchParams, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] || "" : value || "";
}

function normalizeMode(raw: string) {
  if (raw === "official_route" || raw === "charter_official" || raw === "training_free") {
    return raw;
  }

  return "training_free";
}

export default async function DispatchRoomPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams> | SearchParams;
}) {
  const params = await Promise.resolve(searchParams ?? {});
  const initialMode = normalizeMode(getSearchValue(params, "mode"));
  const initialAircraftId =
    getSearchValue(params, "aircraftId") || getSearchValue(params, "registration");

  return (
    <DispatchRoomClient
      initialMode={initialMode}
      initialAircraftId={initialAircraftId}
    />
  );
}
