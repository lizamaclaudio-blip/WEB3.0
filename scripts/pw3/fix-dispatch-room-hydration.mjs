import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const pagePath = path.join(root, "src", "app", "dispatch", "room", "page.tsx");
const clientPath = path.join(root, "src", "components", "dispatch", "DispatchRoomClient.tsx");

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function write(file, content) {
  fs.writeFileSync(file, content, "utf8");
}

if (!fs.existsSync(pagePath)) {
  throw new Error(`No existe ${pagePath}`);
}
if (!fs.existsSync(clientPath)) {
  throw new Error(`No existe ${clientPath}`);
}

let page = read(pagePath);
page = `import DispatchRoomClient from "@/components/dispatch/DispatchRoomClient";

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
`;
write(pagePath, page);

let client = read(clientPath);

// Add props type after DispatchStep if missing.
if (!client.includes("type DispatchRoomClientProps")) {
  client = client.replace(
    /type DispatchStep = 1 \| 2 \| 3 \| 4 \| 5;\r?\n/,
    `type DispatchStep = 1 | 2 | 3 | 4 | 5;\n\ntype DispatchRoomClientProps = {\n  initialMode?: DispatchMode | string | null;\n  initialAircraftId?: string | null;\n};\n`,
  );
}

// Replace mode/search helper block to remove window-dependent first render.
const helperRegex = /function getModeFromSearch\(searchParams: URLSearchParams\): DispatchMode \{[\s\S]*?\n\}\r?\n\r?\nfunction getInitialDispatchParams\(\) \{[\s\S]*?\n\}\r?\n(?=\r?\nfunction getAirportFromList)/;
const helperReplacement = `function normalizeDispatchMode(raw?: string | null): DispatchMode {
  if (raw === "charter_official" || raw === "official_route") return raw;
  return "training_free";
}

function getModeFromSearch(searchParams: URLSearchParams): DispatchMode {
  return normalizeDispatchMode(searchParams.get("mode"));
}

function getInitialDispatchParams(
  initialMode?: DispatchMode | string | null,
  initialAircraftId?: string | null,
) {
  return {
    mode: normalizeDispatchMode(initialMode),
    aircraftId: (initialAircraftId ?? "").trim(),
  };
}
`;
if (helperRegex.test(client)) {
  client = client.replace(helperRegex, helperReplacement);
} else if (!client.includes("function normalizeDispatchMode")) {
  throw new Error("No pude encontrar el bloque getModeFromSearch/getInitialDispatchParams para reemplazarlo.");
}

// Update component signature and initial params use.
client = client.replace(
  /export default function DispatchRoomClient\(\) \{\r?\n\s*const initialDispatchParams = useMemo\(\(\) => getInitialDispatchParams\(\), \[\]\);/,
  `export default function DispatchRoomClient({
  initialMode = "training_free",
  initialAircraftId = "",
}: DispatchRoomClientProps) {
  const initialDispatchParams = useMemo(
    () => getInitialDispatchParams(initialMode, initialAircraftId),
    [initialAircraftId, initialMode],
  );`,
);

// Remove accidental window-dependent initialization if it exists in another form.
client = client.replace(/const initialDispatchParams = useMemo\(\(\) => getInitialDispatchParams\(\), \[\]\);/g,
  `const initialDispatchParams = useMemo(
    () => getInitialDispatchParams(initialMode, initialAircraftId),
    [initialAircraftId, initialMode],
  );`
);

// Keep labels consistent and accent-safe.
client = client.replace(/label="Busqueda"/g, 'label="Búsqueda"');

// Basic mojibake guard on modified client.
const bad = ["ðŸ", "âœ", "âš", "Ã", "Â", "�"];
for (const token of bad) {
  if (client.includes(token)) {
    throw new Error(`Mojibake detectado en DispatchRoomClient.tsx: ${token}`);
  }
}

write(clientPath, client);
console.log("[ok] DispatchRoom hydration corregido: searchParams vienen del servidor y no desde window en el primer render.");
