"use client";

import IcaoFlagBadge from "@/components/ui/IcaoFlagBadge";
import DispatchRoomClient from "@/components/dispatch/DispatchRoomClient";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import styles from "./DispatchPageShell.module.css";

type AirportInfo = {
  ident?: string | null;
  icao?: string | null;
  iata?: string | null;
  name?: string | null;
  city?: string | null;
  country?: string | null;
  iso_country?: string | null;
  lighting_policy?: string | null;
  lighting_warning_only?: boolean | null;
};

type PilotInfo = { callsign?: string | null; rank_code?: string | null; pilot_status?: string | null };

type AircraftItem = {
  id?: string | null;
  registration?: string | null;
  model_code?: string | null;
  display_name?: string | null;
  current_airport_ident?: string | null;
  aircraft_status?: string | null;
  practical_range_nm?: number | string | null;
  reserve_factor?: number | string | null;
  range_available_nm?: number | string | null;
  overall_health?: number | string | null;
  engine_health?: number | string | null;
  fuselage_health?: number | string | null;
  hours?: number | string | null;
};

type RouteItem = {
  id?: string | null;
  route_code?: string | null;
  origin_ident?: string | null;
  destination_ident?: string | null;
  destination_name?: string | null;
  destination_city?: string | null;
  category?: string | null;
  distance_nm?: number | string | null;
  warnings?: string[] | null;
  blocked_reasons?: string[] | null;
};

type MetarInfo = {
  ok?: boolean;
  requested_ident?: string | null;
  station_ident?: string | null;
  is_nearest_station?: boolean;
  distance_nm?: number | string | null;
  message?: string | null;
  raw_metar?: string | null;
  raw?: string | null;
  clouds?: string | null;
  wind?: string | null;
  visibility?: string | null;
  temperature?: string | null;
  dewpoint?: string | null;
  qnh?: string | null;
};

type WeatherAdvisoryInfo = {
  ok?: boolean;
  riskLevel?: string | null;
  operationalMessage?: string | null;
  summary?: string | null;
  advisories?: string[] | null;
};

type AuthMeResponse = { ok?: boolean; pilot?: PilotInfo | null; base_airport?: AirportInfo | null; current_airport?: AirportInfo | null };
type FleetResponse = { aircraft?: AircraftItem[] };
type RoutesResponse = { routes?: RouteItem[] };

type OperationTypeItem = {
  code: string;
  label: string;
  description?: string | null;
  score_mode?: string | null;
  reservation_expires_minutes?: number | null;
  allowed_for_rank?: boolean;
  blocked_reason?: string | null;
};

type OperationTypesResponse = { operation_types?: OperationTypeItem[] };

type ActiveReservationInfo = {
  id?: string | null;
  operationType?: string | null;
  flightNumber?: string | null;
  origin?: string | null;
  destination?: string | null;
  aircraftRegistration?: string | null;
  aircraft?: string | null;
  status?: string | null;
  expiresAt?: string | null;
};

type ActiveReservationResponse = {
  hasActiveReservation?: boolean;
  reservation?: ActiveReservationInfo | null;
};

type DispatchPageShellProps = { variant?: "dashboard" | "full" };

async function safeJsonFetch<T>(url: string, fallback: T, onSoftFail?: () => void): Promise<T> {
  try {
    const response = await fetch(url, { credentials: "include", cache: "no-store" });

    if (!response.ok) {
      console.warn("[dispatch] fetch failed", url, response.status);
      onSoftFail?.();
      return fallback;
    }

    const json = (await response.json().catch(() => null)) as T | null;
    if (json === null) {
      console.warn("[dispatch] empty json", url);
      onSoftFail?.();
      return fallback;
    }

    return json;
  } catch (error) {
    console.warn("[dispatch] fetch error", url, error);
    onSoftFail?.();
    return fallback;
  }
}

function asNumber(value: unknown, fallback = 0) {
  if (value === null || value === undefined || value === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatNm(value: unknown) {
  const n = asNumber(value, NaN);
  if (!Number.isFinite(n)) return "Por calcular";
  return `${Math.round(n)} NM`;
}

function normalizeText(value: unknown, fallback = "No disponible") {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : fallback;
}

function riskLabel(value: string | null | undefined) {
  const level = (value ?? "").trim().toUpperCase();
  if (level === "LOW") return "BAJO";
  if (level === "MODERATE") return "MODERADO";
  if (level === "HIGH") return "ALTO";
  if (level === "CRITICAL") return "CRITICO";
  if (level === "UNKNOWN") return "NO EVALUABLE";
  return "";
}

function weatherIcon(code: string) {
  if (code === "rain") return String.fromCodePoint(0x2614);
  if (code === "storm") return String.fromCodePoint(0x26a1);
  if (code === "fog") return String.fromCodePoint(0x1f32b);
  if (code === "snow") return String.fromCodePoint(0x2744);
  if (code === "cloud") return String.fromCodePoint(0x2601);
  if (code === "partly") return String.fromCodePoint(0x26c5);
  return String.fromCodePoint(0x2600);
}

function buildWeatherDisplay(metar: MetarInfo | null, airport?: AirportInfo | null) {
  const raw = (metar?.raw_metar || metar?.raw || "").toUpperCase();
  const city = airport?.city || airport?.name || airport?.icao || airport?.ident || "Sector operacional";
  const station = metar?.station_ident || airport?.icao || airport?.ident || "N/D";
  const source = metar?.is_nearest_station
    ? `Clima referencial para ${city}, tomado desde estacion cercana ${station}.`
    : `Clima actual reportado para ${city}.`;

  if (!metar?.ok || !raw) {
    return {
      icon: weatherIcon("cloud"),
      title: "Clima no disponible",
      source: "No hay datos climaticos disponibles para este sector.",
    };
  }

  if (/\bTS\b|\bCB\b/.test(raw)) return { icon: weatherIcon("storm"), title: "Tormenta en el sector", source };
  if (/\bSN\b|\bSHSN\b/.test(raw)) return { icon: weatherIcon("snow"), title: "Nieve o precipitacion fria", source };
  if (/\bFG\b|\bBR\b|\bHZ\b/.test(raw)) return { icon: weatherIcon("fog"), title: "Neblina o visibilidad reducida", source };
  if (/\bRA\b|\bDZ\b|\bSHRA\b|\+RA|-RA/.test(raw)) return { icon: weatherIcon("rain"), title: "Lluvia en el sector", source };
  if (/\bOVC\b|\bBKN\b/.test(raw)) return { icon: weatherIcon("cloud"), title: "Nublado", source };
  if (/\bSCT\b|\bFEW\b/.test(raw)) return { icon: weatherIcon("partly"), title: "Parcialmente nublado", source };
  if (/\bCAVOK\b|\bSKC\b|\bCLR\b|\bNSC\b/.test(raw)) return { icon: weatherIcon("sun"), title: "Despejado", source };

  return { icon: weatherIcon("cloud"), title: "Condiciones variables", source };
}

function airportCode(airport?: AirportInfo | null) {
  return normalizeText(airport?.ident || airport?.icao || airport?.iata, "");
}

function airportDisplayName(airport?: AirportInfo | null) {
  if (!airport) return "";
  const name = normalizeText(airport.name, "Aeropuerto asignado");
  const city = airport.city ? ` / ${airport.city}` : "";
  return `${name}${city}`;
}

function AirportBadgeLine({ airport, loading }: { airport?: AirportInfo | null; loading?: boolean }) {
  if (loading) return <span className={styles.emptyCode}>Cargando ubicación...</span>;
  if (!airport) return <span className={styles.emptyCode}>Sin ubicación</span>;
  const code = airportCode(airport);
  return (
    <span className={styles.airportInline}>
      <IcaoFlagBadge icao={code} countryCode={airport.iso_country || airport.country} size="sm" />
      <span>{airportDisplayName(airport)}</span>
    </span>
  );
}

function HealthBar({ value }: { value: unknown }) {
  const percent = Math.max(0, Math.min(100, Math.round(asNumber(value, 100))));
  return (
    <div className={styles.healthBar} aria-label={`${percent}%`}>
      <div className={styles.healthFill} style={{ width: `${percent}%` }}>{percent}%</div>
    </div>
  );
}

function routeKey(route: RouteItem) {
  return route.id || route.route_code || `${route.origin_ident}-${route.destination_ident}`;
}

function OperationAccessRow({
  label,
  description,
  status,
  href,
  disabled,
  onStart,
  typeTone = "default",
}: {
  label: string;
  description: string;
  status: string;
  href?: string;
  disabled?: boolean;
  onStart?: () => void;
  typeTone?: "training" | "official" | "charter" | "cargo" | "default";
}) {
  const badgeToneClass =
    typeTone === "training"
      ? styles.typeBadgeTraining
      : typeTone === "official"
        ? styles.typeBadgeOfficial
        : typeTone === "charter"
          ? styles.typeBadgeCharter
          : typeTone === "cargo"
            ? styles.typeBadgeCargo
            : "";

  return (
    <tr>
      <td><span className={`${styles.typeBadge} ${badgeToneClass}`.trim()}>{label.toUpperCase()}</span></td>
      <td><strong>{label}</strong><span className={styles.detailText}>{description}</span></td>
      <td><span className={disabled ? styles.statusBlocked : styles.statusOk}>{status}</span></td>
      <td>
        {!disabled && onStart ? (
          <button className={styles.actionButtonGreen} type="button" onClick={onStart}>Reservar</button>
        ) : !disabled && href ? (
          <a className={styles.actionButtonGreen} href={href}>Reservar</a>
        ) : (
          <button className={styles.actionButtonDisabled} type="button" disabled>Reservar</button>
        )}
      </td>
    </tr>
  );
}

type DispatchRoomMode = "training_free" | "charter_official" | "official_route" | "cargo_official";

function buildDispatchRoomHref(mode: DispatchRoomMode) {
  const params = new URLSearchParams();
  params.set("mode", mode);
  return `/dispatch/room?${params.toString()}`;
}

export function DispatchPageShell({ variant = "dashboard" }: DispatchPageShellProps) {
  const [auth, setAuth] = useState<AuthMeResponse | null>(null);
  const [aircraft, setAircraft] = useState<AircraftItem[]>([]);
  const [routes, setRoutes] = useState<RouteItem[]>([]);
  const [metar, setMetar] = useState<MetarInfo | null>(null);
  const [weatherAdvisory, setWeatherAdvisory] = useState<WeatherAdvisoryInfo | null>(null);
  const [operationTypes, setOperationTypes] = useState<OperationTypeItem[]>([]);
  const [activeReservation, setActiveReservation] = useState<ActiveReservationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadWarning, setLoadWarning] = useState<string | null>(null);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [activeRoomMode, setActiveRoomMode] = useState<DispatchRoomMode | null>(null);

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      setLoading(true);
      let softFailed = false;
      const markSoftFailure = () => {
        softFailed = true;
      };

      try {
        const [authJson, fleetJson, routesJson, operationTypesJson, activeReservationJson] = await Promise.all([
          safeJsonFetch<AuthMeResponse | null>("/api/auth/me", null, markSoftFailure),
          safeJsonFetch<FleetResponse>("/api/fleet/available", { aircraft: [] }, markSoftFailure),
          safeJsonFetch<RoutesResponse>("/api/routes/available", { routes: [] }, markSoftFailure),
          safeJsonFetch<OperationTypesResponse>("/api/dispatch/operation-types", { operation_types: [] }, markSoftFailure),
          safeJsonFetch<ActiveReservationResponse>("/api/dispatch/active-reservation", { hasActiveReservation: false, reservation: null }),
        ]);

        if (!mounted) return;
        setAuth(authJson);
        setAircraft(fleetJson?.aircraft ?? []);
        setRoutes(routesJson?.routes ?? []);
        setOperationTypes(operationTypesJson?.operation_types ?? []);
        setActiveReservation(activeReservationJson?.hasActiveReservation ? activeReservationJson.reservation ?? null : null);

        const ident = authJson?.current_airport?.ident || authJson?.current_airport?.icao;
        if (ident) {
          const [metarJson, advisoryJson] = await Promise.all([
            safeJsonFetch<MetarInfo | null>(`/api/airport-metar?ident=${encodeURIComponent(ident)}`, null),
            safeJsonFetch<WeatherAdvisoryInfo | null>(`/api/dispatch/weather-advisory?ident=${encodeURIComponent(ident)}`, null),
          ]);

          if (mounted) {
            setMetar(metarJson);
            setWeatherAdvisory(advisoryJson?.ok ? advisoryJson : null);
          }
        }

        if (mounted) {
          setLoadWarning(softFailed ? "No se pudieron cargar algunos datos operacionales. Reintenta o revisa la conexión." : null);
        }
      } catch (error) {
        console.warn("[dispatch] loadData failed", error);
        if (mounted) {
          setLoadWarning("No se pudieron cargar algunos datos operacionales. Reintenta o revisa la conexión.");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    void loadData();
    return () => { mounted = false; };
  }, []);

  const pilot = auth?.pilot || null;
  const currentAirport = auth?.current_airport || null;
  const rankCode = normalizeText(pilot?.rank_code, "CADET").toUpperCase();
  const operationByCode = useMemo(() => new Map(operationTypes.map((operation) => [operation.code, operation] as const)), [operationTypes]);
  const trainingOperation = operationByCode.get("TRAINING_FREE");
  const charterOperation = operationByCode.get("CHARTER_OFFICIAL");
  const schoolRouteOperation = operationByCode.get("SCHOOL_OFFICIAL_ROUTE");
  const commercialRouteOperation = operationByCode.get("COMMERCIAL_OFFICIAL_ROUTE");
  const cargoOperation = operationByCode.get("CARGO_OFFICIAL");
  const routeOperation = rankCode === "CADET" ? schoolRouteOperation : commercialRouteOperation || schoolRouteOperation;
  const aircraftTransferOperation = operationByCode.get("AIRCRAFT_TRANSFER");
  const trainingTtlMinutes = trainingOperation?.reservation_expires_minutes ?? 15;
  const readyRoutes = useMemo(() => routes.filter((route) => (route.blocked_reasons || []).length === 0), [routes]);
  const routeReadyCount = readyRoutes.filter((route) => {
    const cat = (route.category ?? "").trim().toUpperCase();
    return cat !== "CARGO" && cat !== "CARGA" && !cat.startsWith("CARGA_") && cat !== "CARGO_OFFICIAL";
  }).length;
  const cargoRouteReadyCount = readyRoutes.filter((route) => {
    const cat = (route.category ?? "").trim().toUpperCase();
    return cat === "CARGO" || cat === "CARGA" || cat.startsWith("CARGA_") || cat === "CARGO_OFFICIAL";
  }).length;
  const stationIdent = metar?.station_ident || currentAirport?.icao || currentAirport?.ident || "----";
  const weatherDisplay = buildWeatherDisplay(metar, currentAirport);
  const hasBlockingReservation = Boolean(activeReservation?.id);
  const activeReservationLabel = activeReservation
    ? `${normalizeText(activeReservation.flightNumber || activeReservation.operationType, "Vuelo reservado")} · ${normalizeText(activeReservation.origin, "Origen")} → ${normalizeText(activeReservation.destination, "Destino")} · ${normalizeText(activeReservation.status, "Activo")}`
    : "";

  const warnings = useMemo(() => {
    const list: string[] = [];
    if (currentAirport?.lighting_policy && currentAirport.lighting_policy !== "DAY_NIGHT_CONFIRMED") {
      list.push("El aeropuerto no tiene iluminación confirmada. Es advertencia operacional, no bloqueo.");
    }
    if (weatherAdvisory?.operationalMessage) {
      const risk = riskLabel(weatherAdvisory.riskLevel);
      const riskText = risk ? `Riesgo ${risk}: ` : "";
      list.push(`Aviso operacional Patagonia Wings. ${riskText}${weatherAdvisory.operationalMessage}`);
    } else if (metar?.is_nearest_station) {
      list.push(`${metar.requested_ident || currentAirport?.ident || "El aeropuerto"} no tiene METAR propio; se usa estación cercana ${metar.station_ident || "N/A"}.`);
    }
    return list;
  }, [currentAirport, metar, weatherAdvisory]);

  function toggle(section: string) {
    setOpenSections((current) => ({ ...current, [section]: !current[section] }));
  }

  if (activeRoomMode) {
    return (
      <div className={`${styles.shell} ${variant === "full" ? styles.shellFull : ""}`}>
        <section className={styles.heroCard}>
          <div className={styles.heroIcon}>PW</div>
          <h2>Despacho de vuelos</h2>
        </section>
        <DispatchRoomClient embedded initialMode={activeRoomMode} onBack={() => setActiveRoomMode(null)} />
      </div>
    );
  }

  return (
    <div className={`${styles.shell} ${variant === "full" ? styles.shellFull : ""}`}>
      {variant === "full" ? (
        <section className={styles.heroCard}>
          <div className={styles.heroIcon}>{String.fromCodePoint(0x1f6eb)}</div>
          <h2>Despacho de vuelos</h2>
        </section>
      ) : null}
      <p className={styles.heroLead}>Planifica operaciones oficiales y entrenamiento con datos reales desde Neon.</p>

      {null}

      {hasBlockingReservation ? (
        <div className={styles.noticeAmber}>
          Ya tienes un vuelo reservado o despacho activo: <strong>{activeReservationLabel}</strong>.
          Debes continuar o anular esa reserva antes de crear otro vuelo.
        </div>
      ) : null}

      <section>
        <h3 className={styles.sectionTitle}>Operaciones disponibles</h3>
        <SimpleAccordion title="Entrenamiento / Ruta oficial / Charter / Carga" section="operations" openSections={openSections} toggle={toggle}>
          <div className={styles.noticeGreen}>
            Cada flujo selecciona su aeronave dentro de la sala de despacho. Todas las operaciones que van a ACARS usan reserva temporal de {trainingTtlMinutes} minutos y luego Enviar a ACARS.
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead><tr><th>Tipo</th><th>Descripción</th><th>Estado</th><th>Reservar</th></tr></thead>
              <tbody>
                <OperationAccessRow
                  label={normalizeText(trainingOperation?.label, "Entrenamiento libre")}
                  description={normalizeText(trainingOperation?.description, "Vuelo libre referencial. No mueve piloto ni aeronave.")}
                  status={hasBlockingReservation ? "Reserva activa" : "Disponible"}
                  typeTone="training"
                  href={buildDispatchRoomHref("training_free")}
                  onStart={() => setActiveRoomMode("training_free")}
                  disabled={hasBlockingReservation}
                />
                <OperationAccessRow
                  label="Ruta oficial"
                  description={normalizeText(routeOperation?.description, rankCode === "CADET" ? "Ruta oficial formativa disponible segun rutas y aeronaves compatibles." : "Ruta oficial regulada por rango, ruta y aeronave compatible.")}
                  status={hasBlockingReservation ? "Reserva activa" : routeOperation?.allowed_for_rank === false ? "Bloqueada" : `${routeReadyCount} rutas`}
                  typeTone="official"
                  href={buildDispatchRoomHref("official_route")}
                  onStart={() => setActiveRoomMode("official_route")}
                  disabled={hasBlockingReservation || routeOperation?.allowed_for_rank === false || routeReadyCount === 0}
                />
                <OperationAccessRow
                  label={normalizeText(charterOperation?.label, "Charter")}
                  description={charterOperation?.allowed_for_rank ? normalizeText(charterOperation?.description, "Vuelo solicitado por el piloto, sujeto a rango, destino y aeronave.") : normalizeText(charterOperation?.blocked_reason, "Tu rango actual aun no permite charter oficial.")}
                  status={hasBlockingReservation ? "Reserva activa" : charterOperation?.allowed_for_rank ? "Disponible" : "Bloqueada"}
                  typeTone="charter"
                  href={buildDispatchRoomHref("charter_official")}
                  onStart={() => setActiveRoomMode("charter_official")}
                  disabled={hasBlockingReservation || !charterOperation?.allowed_for_rank}
                />
                <OperationAccessRow
                  label={normalizeText(cargoOperation?.label, "Carga oficial")}
                  description={cargoOperation?.allowed_for_rank === false ? normalizeText(cargoOperation?.blocked_reason, "Tu rango actual aun no permite operaciones de carga.") : "Vuelo oficial de carga. No transporta pasajeros. Requiere ruta cargo, aeronave compatible y carga kg mayor a 0."}
                  status={hasBlockingReservation ? "Reserva activa" : cargoOperation?.allowed_for_rank === false ? "Bloqueada" : cargoRouteReadyCount > 0 ? `${cargoRouteReadyCount} rutas` : "Sin rutas cargo"}
                  typeTone="cargo"
                  onStart={() => setActiveRoomMode("cargo_official")}
                  disabled={hasBlockingReservation || cargoOperation?.allowed_for_rank === false || cargoRouteReadyCount === 0}
                />
              </tbody>
            </table>
          </div>
        </SimpleAccordion>
      </section>

      <section>
        <h3 className={styles.sectionTitle}>Traslado de aeronave</h3>
        <SimpleAccordion title="Misiones especiales de aeronave" section="transfers" openSections={openSections} toggle={toggle}>
          <div className={styles.noticeBlue}>
            Los traslados son misiones especiales para mover aeronaves reales de la flota. Pueden otorgar puntaje y recompensa, y al completarse actualizan la ubicación de la aeronave.
          </div>
          <EmptyTable message={aircraftTransferOperation?.allowed_for_rank === false ? normalizeText(aircraftTransferOperation.blocked_reason, "Tu rango aun no permite traslado de aeronave.") : "No hay misiones de traslado de aeronaves disponibles por ahora."} />
        </SimpleAccordion>
      </section>

      <section className={styles.accordionStack}>
        <SimpleAccordion title="Resumen operacional" section="summary" openSections={openSections} toggle={toggle}>
          <div className={styles.summaryGrid}>
            <div className={styles.summaryItem}><span>Piloto</span><strong>{normalizeText(pilot?.callsign, "PWG")}</strong></div>
            <div className={styles.summaryItem}><span>Rango</span><strong>{rankCode}</strong></div>
            <div className={styles.summaryItem}><span>Origen operacional</span><strong><AirportBadgeLine airport={currentAirport} loading={loading} /></strong></div>
            <div className={styles.summaryItem}><span>Aeronaves autorizadas</span><strong>{aircraft.length}</strong></div>
            <div className={styles.summaryItem}><span>Rutas oficiales</span><strong>{routeReadyCount}</strong></div>
            <div className={styles.summaryItem}><span>METAR</span><strong>{metar?.is_nearest_station ? `Cercano ${stationIdent}` : stationIdent}</strong></div>
          </div>
        </SimpleAccordion>
        <SimpleAccordion title="Meteorologia" section="weather" openSections={openSections} toggle={toggle}>
          <div className={styles.weatherCityCard}>
            <div className={styles.weatherIcon} aria-hidden="true">{weatherDisplay.icon}</div>
            <div className={styles.weatherMain}>
              <strong>{weatherDisplay.title}</strong>
              <span>{weatherDisplay.source}</span>
              {metar?.distance_nm ? <small>Referencia a {formatNm(metar.distance_nm)} del aeropuerto actual.</small> : null}
            </div>
            <div className={styles.weatherMetrics}>
              <div><span>Temperatura</span><strong>{metar?.temperature || "N/D"}</strong></div>
              <div><span>Viento</span><strong>{metar?.wind || "N/D"}</strong></div>
              <div><span>Visibilidad</span><strong>{metar?.visibility || "N/D"}</strong></div>
              <div><span>Nubes</span><strong>{weatherDisplay.title}</strong></div>
            </div>
          </div>
        </SimpleAccordion>
        <SimpleAccordion title="Advertencias operacionales" section="warnings" openSections={openSections} toggle={toggle}>
          {warnings.length === 0 ? <div className={styles.noticeGreen}>Sin advertencias operacionales críticas.</div> : <div className={styles.accordionStack}>{warnings.map((warning) => <div key={warning} className={styles.noticeAmber}>{warning}</div>)}</div>}
        </SimpleAccordion>
      </section>
      {loading && <div className={styles.noticeBlue}>Cargando despacho operacional...</div>}
    </div>
  );
}

function SimpleAccordion({ title, section, openSections, toggle, children }: { title: string; section: string; openSections: Record<string, boolean>; toggle: (section: string) => void; children: ReactNode }) {
  const isOpen = Boolean(openSections[section]);
  return (
    <article className={styles.accordion}>
      <button type="button" className={`${styles.accordionHeader} ${isOpen ? styles.accordionHeaderOpen : ""}`} onClick={() => toggle(section)}>
        <span>{isOpen ? "-" : "+"} {title}</span><span>{isOpen ? "Ocultar" : "Mostrar"}</span>
      </button>
      {isOpen && <div className={styles.accordionBody}>{children}</div>}
    </article>
  );
}

function EmptyTable({ message }: { message: string }) {
  return <div className={styles.emptyState}>{message}</div>;
}
