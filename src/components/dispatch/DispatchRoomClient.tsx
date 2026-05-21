"use client";

import IcaoFlagBadge from "@/components/ui/IcaoFlagBadge";
import { useEffect, useMemo, useState } from "react";
import styles from "./DispatchRoom.module.css";

type AirportInfo = {
  ident?: string | null;
  icao?: string | null;
  iata?: string | null;
  name?: string | null;
  city?: string | null;
  country?: string | null;
  iso_country?: string | null;
  timezone?: string | null;
};

type PilotInfo = {
  callsign?: string | null;
  rank_code?: string | null;
  pilot_status?: string | null;
};

type AircraftItem = {
  id?: string | null;
  registration?: string | null;
  model_code?: string | null;
  display_name?: string | null;
  current_airport_ident?: string | null;
  overall_health?: number | string | null;
  engine_health?: number | string | null;
  fuselage_health?: number | string | null;
  hours?: number | string | null;
  practical_range_nm?: number | string | null;
  range_available_nm?: number | string | null;
};

type AirportSearchItem = {
  ident?: string | null;
  icao?: string | null;
  iata?: string | null;
  name?: string | null;
  city?: string | null;
  country?: string | null;
  iso_country?: string | null;
  timezone?: string | null;
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
  available_aircraft?: string[] | null;
  warnings?: string[] | null;
  blocked_reasons?: string[] | null;
};

type AuthMeResponse = {
  ok?: boolean;
  pilot?: PilotInfo | null;
  base_airport?: AirportInfo | null;
  current_airport?: AirportInfo | null;
};

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

type DispatchReservation = {
  id: string;
  pilot_callsign?: string | null;
  aircraft_id?: string | null;
  aircraft_registration?: string | null;
  aircraft_model_code?: string | null;
  route_id?: string | null;
  origin_ident: string;
  destination_ident: string;
  operation_type: string;
  score_mode: string;
  status: string;
  dispatch_token?: string;
  dispatch_token_hint?: string | null;
  expires_at: string;
  ttl_minutes?: number;
  reusedExistingReservation?: boolean;
  aircraft?: {
    id?: string | null;
    registration?: string | null;
    model_code?: string | null;
    display_name?: string | null;
  };
  route?: {
    id?: string | null;
    route_code?: string | null;
    origin_ident?: string | null;
    destination_ident?: string | null;
    category?: string | null;
    distance_nm?: number | string | null;
  };
  rules?: {
    operation_type: string;
    score_mode: string;
    affects_pilot_position: boolean;
    affects_aircraft_position: boolean;
    affects_economy: boolean;
    affects_ranking: boolean;
  };
};

type DispatchAcarsPayload = {
  reservation_id: string;
  operation_type: string;
  score_mode: string;
  reservation_status: "ACARS_READY";
  expires_at: string;
  pilot?: { callsign?: string | null; rank_code?: string | null };
  aircraft?: { registration?: string | null; model_code?: string | null };
  route?: {
    origin_ident?: string | null;
    destination_ident?: string | null;
    route_text?: string | null;
    flight_level?: string | null;
  };
};

type ReservationState = {
  status: "idle" | "creating" | "ready" | "sending" | "acars_ready" | "error";
  message?: string;
  reservation?: DispatchReservation | null;
  acarsPayload?: DispatchAcarsPayload | null;
};

type DispatchMode = "training_free" | "charter_official" | "official_route" | "cargo_official";
type DispatchStep = 1 | 2 | 3 | 4 | 5;

type DispatchRoomClientProps = {
  initialMode?: DispatchMode | string | null;
  initialAircraftId?: string | null;
  embedded?: boolean;
  onBack?: () => void;
};

const FLIGHT_LEVEL_OPTIONS = ["FL030", "FL050", "FL070", "FL090", "FL110", "FL130", "FL150", "FL170"];
const FUEL_POLICY_OPTIONS = ["AUTO PW", "MIN LEGAL", "EXTRA 30 MIN", "EXTRA 45 MIN"];

function normalizeText(value: unknown, fallback = "No disponible") {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : fallback;
}

function asNumber(value: unknown, fallback = 0) {
  if (value === null || value === undefined || value === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function airportCode(airport?: AirportInfo | AirportSearchItem | null) {
  return normalizeText(airport?.ident || airport?.icao || airport?.iata, "");
}

function airportLabel(airport?: AirportInfo | AirportSearchItem | null) {
  const code = airportCode(airport);
  const name = normalizeText(airport?.name, "Aeropuerto");
  const city = airport?.city ? ` / ${airport.city}` : "";
  return `${code ? `${code} - ` : ""}${name}${city}`;
}

function aircraftLabel(aircraft?: AircraftItem | null) {
  if (!aircraft) return "Aeronave no seleccionada";
  return `${normalizeText(aircraft.model_code, "Modelo")} · ${normalizeText(aircraft.registration, "Sin matricula")}`;
}

function aircraftValue(aircraft: AircraftItem) {
  return aircraft.id || aircraft.registration || `${aircraft.model_code}-${aircraft.registration}`;
}

function modeLabel(mode: DispatchMode) {
  if (mode === "training_free") return "Entrenamiento libre";
  if (mode === "charter_official") return "Charter";
  if (mode === "cargo_official") return "Vuelo de carga";
  return "Ruta oficial";
}

function modeHelp(mode: DispatchMode) {
  if (mode === "training_free") {
    return "Vuelo libre de practica: no mueve piloto, no mueve aeronave y queda con evaluacion referencial.";
  }
  if (mode === "charter_official") {
    return "Vuelo solicitado por el piloto. Solo se habilita si el rango, destino y aeronave cumplen las reglas operativas.";
  }
  if (mode === "cargo_official") {
    return "Vuelo de carga oficial. Passenger count forzado a 0. Requiere cargo_kg > 0 y aeronave cargo compatible.";
  }
  return "Operacion regulada de Patagonia Wings. Primero selecciona la ruta y luego la aeronave compatible.";
}

function operationCodeForMode(mode: DispatchMode, rankCode?: string | null) {
  if (mode === "training_free") return "TRAINING_FREE";
  if (mode === "charter_official") return "CHARTER_OFFICIAL";
  if (mode === "cargo_official") return "CARGO_OFFICIAL";
  const rank = normalizeText(rankCode, "").toUpperCase();
  return rank === "CADET" ? "SCHOOL_OFFICIAL_ROUTE" : "COMMERCIAL_OFFICIAL_ROUTE";
}

function normalizeDispatchMode(raw?: string | null): DispatchMode {
  if (raw === "charter_official" || raw === "official_route" || raw === "cargo_official") return raw;
  return "training_free";
}

function isCargoMode(mode: DispatchMode) {
  return mode === "cargo_official";
}


function isCargoRouteCategory(category?: string | null) {
  const normalized = (category ?? '').trim().toUpperCase();
  return (
    normalized === 'CARGO' ||
    normalized === 'CARGA' ||
    normalized.startsWith('CARGA_') ||
    normalized === 'CARGO_OFFICIAL'
  );
}

function isOfficialRouteCategory(category?: string | null) {
  const normalized = (category ?? '').trim().toUpperCase();

  if (!normalized) return true;

  const excludedCategories = new Set([
    'CHARTER',
    'CHARTER_OFFICIAL',
    'CARGO',
    'CARGA',
    'CARGA_REGIONAL',
    'CARGA_INTERREGIONAL',
    'CARGA_NACIONAL',
    'CARGA_INTERNACIONAL',
    'CARGO_OFFICIAL',
    'TRANSFER',
    'AIRCRAFT_TRANSFER',
    'TRASLADO',
    'PILOT_REPOSITION',
    'REPOSITION',
    'REPOSITIONING',
  ]);

  return !excludedCategories.has(normalized) && !normalized.startsWith('CARGA_');
}

function routeCategoryDisplay(category?: string | null) {
  const normalized = (category ?? '').trim().toUpperCase();

  if (!normalized) return 'Ruta oficial';

  if (
    normalized === 'TRAINING' ||
    normalized === 'SCHOOL' ||
    normalized === 'CADET' ||
    normalized === 'ACADEMY' ||
    normalized === 'SCHOOL_OFFICIAL_ROUTE'
  ) {
    return 'Ruta oficial';
  }

  if (
    normalized === 'COMMERCIAL' ||
    normalized === 'PASSENGER' ||
    normalized === 'STANDARD' ||
    normalized === 'OFFICIAL' ||
    normalized === 'COMMERCIAL_OFFICIAL_ROUTE'
  ) {
    return 'Ruta oficial';
  }

  return normalizeText(category, 'Ruta oficial');
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

function getAirportFromList(ident: string, airports: AirportSearchItem[], fallback?: AirportInfo | null) {
  const normalized = ident.trim().toUpperCase();
  if (!normalized) return null;
  return (
    airports.find((airport) => airportCode(airport).toUpperCase() === normalized) ||
    (airportCode(fallback) === normalized ? fallback : null) ||
    null
  );
}

function buildPlanRoute(originIdent: string, destinationIdent: string) {
  if (!originIdent || !destinationIdent) return "Por definir";
  return `${originIdent} DCT ${destinationIdent}`;
}

function buildFlightNumber(mode: DispatchMode, originIdent: string, destinationIdent: string) {
  const prefix = mode === "training_free" ? "PWT" : mode === "charter_official" ? "PWC" : "PWG";
  const seed = `${originIdent}${destinationIdent}`.split("").reduce((total, char) => total + char.charCodeAt(0), 0);
  return `${prefix}${String((seed % 900) + 100).padStart(3, "0")}`;
}

function formatCountdown(expiresAt?: string | null, nowMs = Date.now()) {
  if (!expiresAt) return "15:00";
  const diff = new Date(expiresAt).getTime() - nowMs;
  if (!Number.isFinite(diff) || diff <= 0) return "00:00";
  const totalSeconds = Math.ceil(diff / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatNm(value: unknown) {
  const parsed = asNumber(value, NaN);
  if (!Number.isFinite(parsed)) return "Por calcular";
  return `${Math.round(parsed)} NM`;
}

function isAircraftCapable(aircraft: AircraftItem, route: RouteItem | null) {
  if (!route) return true;
  const distance = asNumber(route.distance_nm, 0);
  const range = asNumber(aircraft.range_available_nm, 0) || asNumber(aircraft.practical_range_nm, 0);
  if (distance <= 0 || range <= 0) return true;
  return distance <= range;
}

function routeKey(route: RouteItem) {
  return route.id || route.route_code || `${route.origin_ident}-${route.destination_ident}`;
}

function buildDepartureOptions() {
  const options: string[] = [];
  for (let hour = 0; hour < 24; hour += 1) {
    options.push(`${String(hour).padStart(2, "0")}:00`);
    options.push(`${String(hour).padStart(2, "0")}:30`);
  }
  return options;
}

function getOriginLocalDepartureDefault(timeZone?: string | null) {
  const now = new Date();
  const localizedText = now.toLocaleString("en-US", { timeZone: timeZone || undefined });
  const localizedNow = new Date(localizedText);
  if (!Number.isFinite(localizedNow.getTime())) return "00:00";
  localizedNow.setMinutes(localizedNow.getMinutes() - 30, 0, 0);
  const roundedMinutes = localizedNow.getMinutes() < 30 ? 0 : 30;
  const hours = localizedNow.getHours();
  return `${String(hours).padStart(2, "0")}:${String(roundedMinutes).padStart(2, "0")}`;
}

function StepItem({ index, label, active }: { index: number; label: string; active?: boolean }) {
  return (
    <div className={`${styles.stepItem} ${active ? styles.stepItemActive : ""}`}>
      <span>{index}</span>
      <strong>{label}</strong>
    </div>
  );
}

function HealthMini({ label, value }: { label: string; value: unknown }) {
  const percent = Math.max(0, Math.min(100, Math.round(asNumber(value, 100))));
  return (
    <div className={styles.healthMini}>
      <span>{label}</span>
      <div className={styles.healthTrack}>
        <div className={styles.healthFill} style={{ width: `${percent}%` }}>{percent}%</div>
      </div>
    </div>
  );
}

function AirportSearchBox({
  tone,
  title,
  query,
  setQuery,
  selectedIdent,
  setSelectedIdent,
  results,
  loading,
}: {
  tone: "origin" | "destination";
  title: string;
  query: string;
  setQuery: (value: string) => void;
  selectedIdent: string;
  setSelectedIdent: (value: string) => void;
  results: AirportSearchItem[];
  loading: boolean;
}) {
  return (
    <div className={styles.airportCard}>
      <header className={tone === "origin" ? styles.originHeader : styles.destinationHeader}>
        <span>{tone === "origin" ? "↗" : "⌖"}</span>
        {title}
      </header>
      <div className={styles.airportCardBody}>
        <input
          className={styles.searchInput}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value.toUpperCase());
            setSelectedIdent("");
          }}
          placeholder="Buscar ICAO, ciudad o aeropuerto"
        />
        <select className={styles.select} value={selectedIdent} onChange={(event) => setSelectedIdent(event.target.value)}>
          <option value="">Seleccione...</option>
          {results.map((airport) => {
            const code = airportCode(airport);
            return (
              <option key={`${code}-${airport.name}`} value={code}>
                {airportLabel(airport)}
              </option>
            );
          })}
        </select>
        {loading ? <p>Buscando aeropuertos...</p> : null}
        {selectedIdent ? (
          <div className={styles.selectedAirport}>
            <IcaoFlagBadge icao={selectedIdent} size="sm" />
            <small>{airportLabel(results.find((airport) => airportCode(airport) === selectedIdent))}</small>
          </div>
        ) : (
          <p>Escribe al menos 2 caracteres para buscar.</p>
        )}
      </div>
    </div>
  );
}

function SearchStage({
  mode,
  originQuery,
  setOriginQuery,
  destinationQuery,
  setDestinationQuery,
  originIdent,
  setOriginIdent,
  destinationIdent,
  setDestinationIdent,
  originResults,
  destinationResults,
  searchingOrigin,
  searchingDestination,
}: {
  mode: DispatchMode;
  originQuery: string;
  setOriginQuery: (value: string) => void;
  destinationQuery: string;
  setDestinationQuery: (value: string) => void;
  originIdent: string;
  setOriginIdent: (value: string) => void;
  destinationIdent: string;
  setDestinationIdent: (value: string) => void;
  originResults: AirportSearchItem[];
  destinationResults: AirportSearchItem[];
  searchingOrigin: boolean;
  searchingDestination: boolean;
}) {
  return (
    <>
      <h2>Comenzar un despacho nuevo</h2>
      <div className={styles.instructions}>
        <strong>1. Seleccionar Origen y Destino.</strong> {mode === "training_free" ? "Entrenamiento libre permite origen y destino global sin mover piloto ni aeronave." : "Selecciona el origen operacional y destino permitido para este despacho."}
      </div>
      <div className={styles.airportGrid}>
        <AirportSearchBox
          tone="origin"
          title="ORIGEN *"
          query={originQuery}
          setQuery={setOriginQuery}
          selectedIdent={originIdent}
          setSelectedIdent={setOriginIdent}
          results={originResults}
          loading={searchingOrigin}
        />
        <AirportSearchBox
          tone="destination"
          title="DESTINO *"
          query={destinationQuery}
          setQuery={setDestinationQuery}
          selectedIdent={destinationIdent}
          setSelectedIdent={setDestinationIdent}
          results={destinationResults}
          loading={searchingDestination}
        />
      </div>
    </>
  );
}

function OfficialRouteStage({
  routes,
  selectedRouteId,
  setSelectedRouteId,
}: {
  routes: RouteItem[];
  selectedRouteId: string;
  setSelectedRouteId: (value: string) => void;
}) {
  const availableRoutes = routes.filter(
    (route) =>
      isOfficialRouteCategory(route.category) &&
      (route.blocked_reasons || []).length === 0,
  );
  return (
    <>
      <h2>Seleccionar ruta oficial</h2>
      <div className={styles.instructions}>
        <strong>1. Ruta oficial.</strong> Solo se muestran rutas operables segun tu rango, ubicacion y disponibilidad de aeronaves. Luego elegiras la aeronave compatible para esa ruta.
      </div>
      {availableRoutes.length === 0 ? (
        <div className={styles.instructions}>No hay rutas oficiales disponibles para tu rango y ubicacion actual.</div>
      ) : (
        <div className={styles.routePickList}>
          {availableRoutes.map((route) => {
            const key = routeKey(route);
            const active = key === selectedRouteId;
            return (
              <button
                type="button"
                key={key}
                className={`${styles.routePickCard} ${active ? styles.routePickCardActive : ""}`}
                onClick={() => setSelectedRouteId(key)}
              >
                <span className={styles.routeBadgesInline}>
                  <IcaoFlagBadge icao={route.origin_ident || ""} size="sm" />
                  <strong>→</strong>
                  <IcaoFlagBadge icao={route.destination_ident || ""} size="sm" />
                </span>
                <span>
                  <strong>{normalizeText(route.route_code, "Ruta oficial")}</strong>
                  <small>{normalizeText(route.destination_name || route.destination_city, "Destino")} · {formatNm(route.distance_nm)} · {routeCategoryDisplay(route.category)}</small>
                </span>
                <em>{active ? "Seleccionada" : "Seleccionar"}</em>
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}

function AircraftStage({
  mode,
  aircraft,
  aircraftId,
  setAircraftId,
  selectedAircraft,
  currentAirport,
  departureTime,
  setDepartureTime,
  originIdent,
  destinationIdent,
  operationLabel,
  selectedRoute,
  aircraftPhotoUrl,
}: {
  mode: DispatchMode;
  aircraft: AircraftItem[];
  aircraftId: string;
  setAircraftId: (value: string) => void;
  selectedAircraft: AircraftItem | null;
  currentAirport: AirportInfo | null;
  departureTime: string;
  setDepartureTime: (value: string) => void;
  originIdent: string;
  destinationIdent: string;
  operationLabel: string;
  selectedRoute: RouteItem | null;
  aircraftPhotoUrl?: string | null;
}) {
  const candidateAircraft = mode === "official_route" && selectedRoute ? aircraft.filter((item) => isAircraftCapable(item, selectedRoute)) : aircraft;
  const departureOptions = buildDepartureOptions();

  return (
    <div className={styles.aircraftStage}>
      <h3>{mode === "official_route" ? "Aeronave compatible con la ruta" : "Tipo de vuelo y aeronave"}</h3>
      <div className={styles.instructionsCompact}>
        {mode === "official_route"
          ? "Elige una aeronave autorizada para tu rango, disponible en origen y capaz de operar la ruta seleccionada."
          : "Elige una aeronave autorizada para tu rango. La reserva temporal durara 15 minutos antes del envio a ACARS."}
      </div>

      <section className={styles.simulatorPanel}>
        <div>
          <span className={styles.panelIcon}>▣</span>
          <strong>{mode === "official_route" ? "Aeronaves compatibles" : "Modelo a utilizar"}</strong>
          <p>{mode === "official_route" ? "La lista se filtra por ruta, rango y autonomia." : "Selecciona el modelo autorizado para este despacho."}</p>
        </div>
        <select className={styles.inlineSelect} value={aircraftId} onChange={(event) => setAircraftId(event.target.value)}>
          <option value="">Seleccione...</option>
          {candidateAircraft.map((item) => (
            <option key={aircraftValue(item)} value={aircraftValue(item)}>
              {aircraftLabel(item)}
            </option>
          ))}
        </select>
      </section>

      {candidateAircraft.length === 0 ? <div className={styles.instructions}>No hay aeronaves compatibles para este despacho.</div> : null}

      <section className={styles.aircraftSelectedCard}>
        <div
          className={styles.aircraftImageBox}
          aria-hidden="true"
          style={aircraftPhotoUrl ? { backgroundImage: `linear-gradient(135deg, rgba(11,79,138,.75), rgba(56,189,248,.20)), url('${aircraftPhotoUrl}')`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
        ></div>
        <div className={styles.aircraftMainInfo}>
          <div className={styles.aircraftTitleRow}>
            <div>
              <h4>{selectedAircraft?.display_name || selectedAircraft?.model_code || "Selecciona una aeronave"}</h4>
              <p>{selectedAircraft ? aircraftLabel(selectedAircraft) : "La aeronave se confirma antes de la reserva temporal."}</p>
            </div>
            <strong className={styles.registrationBadge}>{selectedAircraft?.registration || "N/D"}</strong>
          </div>

          <div className={styles.aircraftMetaGrid}>
            <div>
              <span>Ubicacion</span>
              <IcaoFlagBadge icao={selectedAircraft?.current_airport_ident || currentAirport?.ident || currentAirport?.icao || ""} countryCode={currentAirport?.iso_country || currentAirport?.country} size="sm" />
            </div>
            <div>
              <span>Alcance</span>
              <strong>{Math.round(asNumber(selectedAircraft?.range_available_nm || selectedAircraft?.practical_range_nm, 0)) || "N/D"} NM</strong>
            </div>
            <div>
              <span>Ult. mantenim.</span>
              <strong>{asNumber(selectedAircraft?.hours, 0).toFixed(1)} h</strong>
            </div>
          </div>
        </div>

        <div className={styles.aircraftHealthStrip}>
          <HealthMini label="Tren" value={selectedAircraft?.overall_health} />
          <HealthMini label="Motores" value={selectedAircraft?.engine_health} />
          <HealthMini label="Fuselaje" value={selectedAircraft?.fuselage_health} />
        </div>
      </section>

      <section className={styles.scheduleBlock}>
        <div className={styles.noticeGreenLite}>
          <strong>Horario de salida</strong>
          <span>Horario estimado para preparar el plan y reservar el despacho temporal.</span>
        </div>
        <select className={styles.timeSelect} value={departureTime} onChange={(event) => setDepartureTime(event.target.value)}>
          {departureOptions.map((time) => <option key={time} value={time}>{time}</option>)}
        </select>
      </section>

      <section className={styles.flightPlanSummary}>
        <div><span>Tipo</span><strong>{operationLabel}</strong></div>
        <div><span>Aeronave</span><strong>{selectedAircraft?.model_code || "Seleccionar"}</strong></div>
        <div><span>Origen</span><IcaoFlagBadge icao={originIdent} size="sm" /></div>
        <div><span>Salida</span><strong>{departureTime}</strong></div>
        <div><span>Destino</span><IcaoFlagBadge icao={destinationIdent} size="sm" /></div>
        <div><span>Estado</span><strong className={styles.pendingBadge}>Pre-reserva</strong></div>
      </section>
    </div>
  );
}

function PlanStage({
  originAirport,
  destinationAirport,
  originIdent,
  destinationIdent,
  flightLevel,
  setFlightLevel,
  routeText,
  setRouteText,
  alternateIdent,
  setAlternateIdent,
  departureTime,
  selectedAircraft,
  mode,
  destinationPhotoUrl,
}: {
  originAirport: AirportInfo | AirportSearchItem | null;
  destinationAirport: AirportInfo | AirportSearchItem | null;
  originIdent: string;
  destinationIdent: string;
  flightLevel: string;
  setFlightLevel: (value: string) => void;
  routeText: string;
  setRouteText: (value: string) => void;
  alternateIdent: string;
  setAlternateIdent: (value: string) => void;
  departureTime: string;
  selectedAircraft: AircraftItem | null;
  mode: DispatchMode;
  destinationPhotoUrl?: string | null;
}) {
  const flightNumber = buildFlightNumber(mode, originIdent, destinationIdent);
  const aircraftModel = selectedAircraft?.model_code || "N/D";

  return (
    <div className={styles.planStage}>
      <h3>Plan de Vuelo</h3>
      <div className={styles.simbriefNotice}>
        <strong>SimBrief:</strong>
        <span>{originIdent || "ORIGEN"} → {destinationIdent || "DESTINO"} — {routeText || "Ruta por definir"}</span>
      </div>

      <section className={styles.darkPanel}>
        <header>Configuracion de ruta</header>
        <div className={styles.routeConfigGrid}>
          <label><span>Origen</span><input value={originIdent} readOnly /></label>
          <label><span>Destino</span><input value={destinationIdent} readOnly /></label>
          <label><span>Alternativa *</span><input value={alternateIdent} onChange={(event) => setAlternateIdent(event.target.value.toUpperCase())} placeholder="SAZS" /></label>
          <label><span>Nivel de vuelo *</span><select value={flightLevel} onChange={(event) => setFlightLevel(event.target.value)}>{FLIGHT_LEVEL_OPTIONS.map((level) => <option key={level} value={level}>{level}</option>)}</select></label>
          <label className={styles.routeInputWide}><span>Plan de vuelo *</span><input value={routeText} onChange={(event) => setRouteText(event.target.value.toUpperCase())} /></label>
        </div>
      </section>

      <section className={styles.darkPanel}>
        <header>Destino</header>
        <div className={styles.destinationCard}>
          <div
            className={styles.destinationImage}
            aria-hidden="true"
            style={
              destinationPhotoUrl
                ? {
                    backgroundImage: `linear-gradient(135deg, rgba(11,79,138,.68), rgba(20,184,166,.25)), url('${destinationPhotoUrl}')`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }
                : undefined
            }
          >
            {!destinationPhotoUrl ? <span>PW</span> : null}
          </div>
          <div className={styles.destinationInfo}>
            <div className={styles.badgeLine}>
              <IcaoFlagBadge icao={destinationIdent} countryCode={destinationAirport?.iso_country || destinationAirport?.country} size="sm" />
              <strong>{airportLabel(destinationAirport) || destinationIdent}</strong>
            </div>
            <div className={styles.destinationStats}>
              <div><span>Total arribos</span><strong>Por calcular</strong></div>
              <div><span>Ultima visita</span><strong>Sin registro</strong></div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.flightPlanSummary}>
        <div><span>Vuelo</span><strong>{flightNumber}</strong></div>
        <div><span>Equipo</span><strong>{aircraftModel}</strong></div>
        <div><span>Salida</span><strong>{departureTime}</strong></div>
        <div><span>Origen</span><IcaoFlagBadge icao={originIdent} countryCode={originAirport?.iso_country || originAirport?.country} size="sm" /></div>
        <div><span>Destino</span><IcaoFlagBadge icao={destinationIdent} countryCode={destinationAirport?.iso_country || destinationAirport?.country} size="sm" /></div>
        <div><span>Estado</span><strong className={styles.pendingBadge}>Planificado</strong></div>
      </section>
    </div>
  );
}

function WeightFuelStage({
  selectedAircraft,
  passengerCount,
  setPassengerCount,
  cargoKg,
  setCargoKg,
  fuelKg,
  setFuelKg,
  fuelPolicy,
  setFuelPolicy,
  isCargo,
}: {
  selectedAircraft: AircraftItem | null;
  passengerCount: number;
  setPassengerCount: (value: number) => void;
  cargoKg: number;
  setCargoKg: (value: number) => void;
  fuelKg: number;
  setFuelKg: (value: number) => void;
  fuelPolicy: string;
  setFuelPolicy: (value: string) => void;
  isCargo?: boolean;
}) {
  const maxFuel = Math.max(1000, Math.round(asNumber(selectedAircraft?.range_available_nm, 400) * 3.2));
  const effectivePax = isCargo ? 0 : passengerCount;
  const zfwEstimate = Math.round(2800 + effectivePax * 84 + cargoKg);
  const towEstimate = zfwEstimate + fuelKg;

  return (
    <div className={styles.weightStage}>
      <h3>Peso y combustible</h3>
      <div className={styles.instructionsCompact}>{isCargo ? "Vuelo de carga: pasajeros forzados a 0. Ingresa el peso de carga en kg." : "Esta fase deja preparados los datos para validar y enviar a ACARS. La validacion oficial queda en servidor."}</div>
      <div className={styles.weightGrid}>
        <section className={styles.darkPanel}>
          <header>Peso operacional</header>
          <div className={styles.formGrid}>
            <label><span>Pasajeros</span><input type="number" min={0} value={effectivePax} readOnly={isCargo} disabled={isCargo} onChange={isCargo ? undefined : (event) => setPassengerCount(Number(event.target.value))} /></label>
            <label><span>Carga kg {isCargo ? "*" : ""}</span><input type="number" min={0} value={cargoKg} onChange={(event) => setCargoKg(Number(event.target.value))} /></label>
            <label><span>ZFW estimado</span><input value={`${zfwEstimate} kg`} readOnly /></label>
            <label><span>TOW estimado</span><input value={`${towEstimate} kg`} readOnly /></label>
          </div>
        </section>
        <section className={styles.darkPanel}>
          <header>Combustible</header>
          <div className={styles.formGrid}>
            <label><span>Combustible kg</span><input type="number" min={0} value={fuelKg} onChange={(event) => setFuelKg(Number(event.target.value))} /></label>
            <label><span>Politica</span><select value={fuelPolicy} onChange={(event) => setFuelPolicy(event.target.value)}>{FUEL_POLICY_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
            <label><span>Max recomendado</span><input value={`${maxFuel} kg`} readOnly /></label>
            <label><span>Estado</span><input value={fuelKg > 0 ? "Validable" : "Pendiente"} readOnly /></label>
          </div>
        </section>
      </div>
      <section className={styles.fuelValidationBox}>
        <strong>Validacion previa ACARS</strong>
        <p>El boton final crea una reserva temporal de 15 minutos y prepara el despacho sin permitir manipulacion local.</p>
        <ul>
          <li>Aeronave seleccionada: {selectedAircraft ? aircraftLabel(selectedAircraft) : "pendiente"}</li>
          {isCargo ? <li><strong>Vuelo de carga: 0 pasajeros / {cargoKg} kg carga</strong></li> : <li>Payload estimado: {effectivePax} pasajeros / {cargoKg} kg carga</li>}
          <li>Combustible estimado: {fuelKg} kg</li>
          {isCargo && cargoKg <= 0 ? <li style={{ color: "#ef4444" }}>⚠ Carga kg obligatorio para vuelos de carga</li> : null}
        </ul>
      </section>
    </div>
  );
}

function FinalStage({
  mode,
  operationLabel,
  originIdent,
  destinationIdent,
  departureTime,
  selectedAircraft,
  flightLevel,
  reservationState,
  reservationCountdown,
  canCreateReservation,
  onCreateReservation,
  onSendToAcars,
}: {
  mode: DispatchMode;
  operationLabel: string;
  originIdent: string;
  destinationIdent: string;
  departureTime: string;
  selectedAircraft: AircraftItem | null;
  flightLevel: string;
  reservationState: ReservationState;
  reservationCountdown: string;
  canCreateReservation: boolean;
  onCreateReservation: () => void;
  onSendToAcars: () => void;
}) {
  const flightNumber = buildFlightNumber(mode, originIdent, destinationIdent);
  const endTime = "Por calcular";
  const reservation = reservationState.reservation ?? null;
  const hasReservationCredentials = Boolean(reservation?.id && reservation.dispatch_token);
  const isReady = ["ready", "sending", "acars_ready"].includes(reservationState.status) && hasReservationCredentials;
  const isCreating = reservationState.status === "creating";
  const isSending = reservationState.status === "sending";
  const isAcarsReady = reservationState.status === "acars_ready" && hasReservationCredentials;

  const ruleText = mode === "training_free"
    ? "Entrenamiento libre: no mueve piloto, no mueve aeronave, no genera economia y queda como evaluacion referencial."
    : mode === "charter_official"
      ? "Charter: reserva temporal oficial. La validez operacional final se confirma en servidor antes de ACARS."
      : "Ruta oficial: reserva temporal de aerolinea. La aeronave y la ruta quedan preparadas para despacho seguro.";

  return (
    <div className={styles.finalStage}>
      <h3>Despacho finalizado</h3>
      <section className={styles.finalTable}>
        <div><span>Vuelo</span><strong>{flightNumber}</strong></div>
        <div><span>Origen</span><IcaoFlagBadge icao={originIdent} size="sm" /></div>
        <div><span>Comienzo local</span><strong className={styles.greenTime}>{departureTime}</strong></div>
        <div><span>Destino</span><IcaoFlagBadge icao={destinationIdent} size="sm" /></div>
        <div><span>Fin local</span><strong className={styles.greenTime}>{endTime}</strong></div>
        <div><span>Equipo</span><strong>{selectedAircraft?.model_code || "N/D"}</strong></div>
        <div><span>Estado</span><strong className={styles.programmedText}>{isAcarsReady ? "Listo para ACARS" : "Pre-programado"}</strong></div>
      </section>
      <section className={isReady ? styles.reservationReadyBox : styles.reservationBox}>
        <div>
          <span>Reserva temporal</span>
          <strong>{isReady ? `Activa - ${reservationCountdown}` : "Disponible por 15 minutos"}</strong>
          <p>{ruleText}</p>
          {reservationState.status === "ready" && reservationState.message ? <p className={styles.reservationHint}>{reservationState.message}</p> : null}
          {reservationState.status === "error" ? <p className={styles.reservationError}>{reservationState.message}</p> : null}
          {isReady ? (
            <p className={styles.reservationHint}>ID {reservation?.id ?? "pendiente"} - Token seguro creado - vence {reservation?.expires_at ? new Date(reservation.expires_at).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" }) : "por confirmar"}</p>
          ) : null}
          {isAcarsReady ? <p className={styles.acarsReadyText}>Despacho listo para ACARS. El cliente desktop se conectara al final del desarrollo web.</p> : null}
        </div>
        <button type="button" onClick={onCreateReservation} disabled={!canCreateReservation || isCreating || Boolean(isReady)}>
          {isCreating ? "Reservando..." : isReady ? "Reserva activa" : "Reservar por 15 minutos"}
        </button>
      </section>
      <div className={styles.finalButtons}>
        <button type="button" disabled>Imprimir Despacho</button>
        <button type="button" disabled={!hasReservationCredentials || isSending || isAcarsReady} onClick={onSendToAcars}>{isSending ? "Preparando..." : isAcarsReady ? "Listo para ACARS" : "Enviar a ACARS"}</button>
        <a href="/dashboard">HUB Center</a>
      </div>
      <section className={styles.sopPanel}>
        <header>Standard Operations Procedures</header>
        <div>
          <span className={styles.sopBadge}>{isAcarsReady ? "ACARS READY" : isReady ? "TEMP ACTIVO" : "PRE-ACTIVO"}</span>
          <strong>Procedimiento de Operaciones</strong>
          <p>{operationLabel}: verificar origen, destino, aeronave, nivel de vuelo {flightLevel}, combustible y condiciones meteorologicas antes de enviar a ACARS.</p>
          <p>La reserva temporal dura 15 minutos. Si no se envia a ACARS, queda expirada/anulada y vuelve al estado anterior.</p>
        </div>
      </section>
    </div>
  );
}

export default function DispatchRoomClient({
  initialMode = "training_free",
  initialAircraftId = "",
  embedded = false,
  onBack,
}: DispatchRoomClientProps) {
  const initialDispatchParams = useMemo(
    () => getInitialDispatchParams(initialMode, initialAircraftId),
    [initialAircraftId, initialMode],
  );
  const [mode] = useState<DispatchMode>(initialDispatchParams.mode);
  const [step, setStep] = useState<DispatchStep>(1);
  const [aircraftId, setAircraftId] = useState(initialDispatchParams.aircraftId);
  const [auth, setAuth] = useState<AuthMeResponse | null>(null);
  const [aircraft, setAircraft] = useState<AircraftItem[]>([]);
  const [routes, setRoutes] = useState<RouteItem[]>([]);
  const [operationTypes, setOperationTypes] = useState<OperationTypeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [originQuery, setOriginQuery] = useState("");
  const [destinationQuery, setDestinationQuery] = useState("");
  const [originResults, setOriginResults] = useState<AirportSearchItem[]>([]);
  const [destinationResults, setDestinationResults] = useState<AirportSearchItem[]>([]);
  const [originIdent, setOriginIdent] = useState("");
  const [destinationIdent, setDestinationIdent] = useState("");
  const [selectedRouteId, setSelectedRouteId] = useState("");
  const [searchingOrigin, setSearchingOrigin] = useState(false);
  const [searchingDestination, setSearchingDestination] = useState(false);
  const [departureTime, setDepartureTime] = useState("00:00");
  const [flightLevel, setFlightLevel] = useState("FL070");
  const [routeText, setRouteText] = useState("");
  const [alternateIdent, setAlternateIdent] = useState("SAZS");
  const [passengerCount, setPassengerCount] = useState(0);
  const [cargoKg, setCargoKg] = useState(0);
  const [fuelKg, setFuelKg] = useState(1200);
  const [fuelPolicy, setFuelPolicy] = useState("AUTO PW");
  const [reservationState, setReservationState] = useState<ReservationState>({ status: "idle", reservation: null, acarsPayload: null });
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [selectedAircraftPhotoUrl, setSelectedAircraftPhotoUrl] = useState<string | null>(null);
  const [destinationPhotoUrl, setDestinationPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    const interval = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const [authResult, fleetResult, routesResult, operationTypesResult] = await Promise.all([
          fetch("/api/auth/me", { credentials: "include", cache: "no-store" }),
          fetch("/api/fleet/available", { credentials: "include", cache: "no-store" }),
          fetch("/api/routes/available", { credentials: "include", cache: "no-store" }),
          fetch("/api/dispatch/operation-types", { credentials: "include", cache: "no-store" }),
        ]);
        const authJson = (await authResult.json().catch(() => null)) as AuthMeResponse | null;
        const fleetJson = (await fleetResult.json().catch(() => null)) as FleetResponse | null;
        const routesJson = (await routesResult.json().catch(() => null)) as RoutesResponse | null;
        const operationTypesJson = (await operationTypesResult.json().catch(() => null)) as OperationTypesResponse | null;
        if (!mounted) return;
        setAuth(authJson);
        setAircraft(fleetJson?.aircraft ?? []);
        setRoutes(routesJson?.routes ?? []);
        setOperationTypes(operationTypesJson?.operation_types ?? []);
        const currentIdent = airportCode(authJson?.current_airport);
        if (currentIdent && mode !== "training_free") {
          setOriginIdent(currentIdent);
          setOriginQuery(currentIdent);
          setOriginResults([authJson?.current_airport as AirportSearchItem]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    void load();
    return () => {
      mounted = false;
    };
  }, [mode]);

  useEffect(() => {
    let cancelled = false;
    async function search() {
      const query = originQuery.trim();
      if (query.length < 2) {
        setOriginResults(originIdent && auth?.current_airport ? [auth.current_airport] : []);
        return;
      }
      setSearchingOrigin(true);
      try {
        const response = await fetch(`/api/airports/search?q=${encodeURIComponent(query)}`, { credentials: "include", cache: "no-store" });
        const payload = (await response.json().catch(() => null)) as { airports?: AirportSearchItem[] } | null;
        if (!cancelled) setOriginResults(payload?.airports ?? []);
      } finally {
        if (!cancelled) setSearchingOrigin(false);
      }
    }
    if (mode !== "official_route") void search();
    return () => {
      cancelled = true;
    };
  }, [auth?.current_airport, mode, originIdent, originQuery]);

  useEffect(() => {
    let cancelled = false;
    async function search() {
      const query = destinationQuery.trim();
      if (query.length < 2) {
        setDestinationResults([]);
        return;
      }
      setSearchingDestination(true);
      try {
        const response = await fetch(`/api/airports/search?q=${encodeURIComponent(query)}`, { credentials: "include", cache: "no-store" });
        const payload = (await response.json().catch(() => null)) as { airports?: AirportSearchItem[] } | null;
        if (!cancelled) setDestinationResults(payload?.airports ?? []);
      } finally {
        if (!cancelled) setSearchingDestination(false);
      }
    }
    if (mode !== "official_route") void search();
    return () => {
      cancelled = true;
    };
  }, [destinationQuery, mode]);

  useEffect(() => {
    let cancelled = false;
    async function hydrateOriginTimezone() {
      const normalizedOrigin = originIdent.trim().toUpperCase();
      if (!normalizedOrigin) return;
      const hasTimezone = originResults.some(
        (airport) => airportCode(airport).trim().toUpperCase() === normalizedOrigin && Boolean(airport.timezone),
      );
      if (hasTimezone) return;
      try {
        const response = await fetch(`/api/airports/search?q=${encodeURIComponent(normalizedOrigin)}&limit=10`, {
          credentials: "include",
          cache: "no-store",
        });
        const payload = (await response.json().catch(() => null)) as { airports?: AirportSearchItem[] } | null;
        const matched = (payload?.airports ?? []).find(
          (airport) => airportCode(airport).trim().toUpperCase() === normalizedOrigin,
        );
        if (!matched || cancelled) return;
        setOriginResults((previous) => {
          const next = [...previous];
          const index = next.findIndex(
            (airport) => airportCode(airport).trim().toUpperCase() === normalizedOrigin,
          );
          if (index >= 0) {
            next[index] = { ...next[index], timezone: matched.timezone ?? next[index].timezone ?? null };
          } else {
            next.push(matched);
          }
          return next;
        });
      } catch {
        // no-op: keep local-time fallback when timezone cannot be resolved
      }
    }
    void hydrateOriginTimezone();
    return () => {
      cancelled = true;
    };
  }, [originIdent, originResults]);

  const pilot = auth?.pilot || null;
  const currentAirport = auth?.current_airport || null;
  const rankCode = normalizeText(pilot?.rank_code, "CADET").toUpperCase();
  const selectedRoute = useMemo(() => routes.find((route) => routeKey(route) === selectedRouteId) || null, [routes, selectedRouteId]);
  const selectedAircraft = useMemo(() => aircraft.find((item) => item.id === aircraftId || item.registration === aircraftId || aircraftValue(item) === aircraftId) || null, [aircraft, aircraftId]);
  const operationCode = operationCodeForMode(mode, rankCode);
  const selectedOperation = useMemo(() => operationTypes.find((operation) => operation.code === operationCode) || null, [operationCode, operationTypes]);
  const selectedOperationLabel = normalizeText(selectedOperation?.label, modeLabel(mode));
  const selectedOperationHelp = normalizeText(selectedOperation?.description, modeHelp(mode));
  const originAirport = getAirportFromList(originIdent, originResults, currentAirport);
  const destinationAirport = getAirportFromList(destinationIdent, destinationResults, null);
  const effectiveRouteText = routeText || (originIdent && destinationIdent ? buildPlanRoute(originIdent, destinationIdent) : "");
  const operationAllowed = selectedOperation?.allowed_for_rank ?? true;
  const routeCandidates = useMemo(() => routes.filter((route) => (route.blocked_reasons || []).length === 0), [routes]);
  const canContinueSearch = (mode === "official_route" || mode === "cargo_official") ? Boolean(selectedRoute) : Boolean(originIdent && destinationIdent && operationAllowed);
  const canContinueAircraft = Boolean(originIdent && destinationIdent && selectedAircraft && operationAllowed);
  const canContinuePlan = Boolean(effectiveRouteText.trim() && flightLevel && alternateIdent.trim());
  const isCargo = isCargoMode(mode);
  const effectivePassengerCount = isCargo ? 0 : passengerCount;
  const requiresSelectedRoute = mode === "official_route" || mode === "cargo_official";
  const canContinueWeight = Boolean(selectedAircraft && fuelKg > 0 && (!isCargo || cargoKg > 0));
  const reservationCountdown = formatCountdown(reservationState.reservation?.expires_at, nowMs);
  const canCreateReservation = Boolean(originIdent && destinationIdent && selectedAircraft && fuelKg > 0 && operationAllowed && (!requiresSelectedRoute || selectedRoute?.id) && (!isCargo || cargoKg > 0));
  const hasValidReservation = Boolean(reservationState.reservation?.id && reservationState.reservation?.dispatch_token);
  const reservedAircraftLabel = reservationState.reservation
    ? `${normalizeText(reservationState.reservation.aircraft_model_code, selectedAircraft?.model_code || "Modelo")} - ${normalizeText(reservationState.reservation.aircraft_registration, selectedAircraft?.registration || "Sin matricula")}`
    : "";

  useEffect(() => {
    const defaultDeparture = getOriginLocalDepartureDefault(originAirport?.timezone || null);
    if (defaultDeparture !== departureTime) {
      setDepartureTime(defaultDeparture);
    }
  }, [departureTime, originAirport?.timezone]);

  useEffect(() => {
    let cancelled = false;
    async function loadAircraftPhoto() {
      if (!selectedAircraft?.model_code && !selectedAircraft?.display_name) {
        setSelectedAircraftPhotoUrl(null);
        return;
      }
      try {
        const params = new URLSearchParams();
        if (selectedAircraft?.model_code) params.set("code", selectedAircraft.model_code);
        if (selectedAircraft?.display_name) params.set("name", selectedAircraft.display_name);
        const response = await fetch(`/api/aircraft-photo?${params.toString()}`, { cache: "force-cache" });
        const payload = (await response.json().catch(() => null)) as { imageUrl?: string | null } | null;
        if (!cancelled) setSelectedAircraftPhotoUrl(payload?.imageUrl ?? null);
      } catch {
        if (!cancelled) setSelectedAircraftPhotoUrl(null);
      }
    }
    void loadAircraftPhoto();
    return () => {
      cancelled = true;
    };
  }, [selectedAircraft?.display_name, selectedAircraft?.model_code]);

  useEffect(() => {
    let cancelled = false;
    async function loadDestinationPhoto() {
      const ident = destinationIdent.trim().toUpperCase();
      if (!ident) {
        setDestinationPhotoUrl(null);
        return;
      }
      try {
        const response = await fetch(`/api/city-hero?ident=${encodeURIComponent(ident)}`, { cache: "force-cache" });
        const payload = (await response.json().catch(() => null)) as { imageUrl?: string | null } | null;
        if (!cancelled) setDestinationPhotoUrl(payload?.imageUrl ?? null);
      } catch {
        if (!cancelled) setDestinationPhotoUrl(null);
      }
    }
    void loadDestinationPhoto();
    return () => {
      cancelled = true;
    };
  }, [destinationIdent]);

  function selectRoute(routeId: string) {
    const route = routes.find((item) => routeKey(item) === routeId);
    if (!route) return;
    setSelectedRouteId(routeId);
    setOriginIdent(normalizeText(route.origin_ident, ""));
    setDestinationIdent(normalizeText(route.destination_ident, ""));
    setOriginQuery(normalizeText(route.origin_ident, ""));
    setDestinationQuery(normalizeText(route.destination_ident, ""));
    setDestinationResults([
      {
        ident: route.destination_ident,
        icao: route.destination_ident,
        name: route.destination_name,
        city: route.destination_city,
      },
    ]);
    setRouteText(buildPlanRoute(normalizeText(route.origin_ident, ""), normalizeText(route.destination_ident, "")));
    setAircraftId("");
  }

  async function createTemporaryReservation() {
    if (!canCreateReservation || !selectedAircraft) return;
    setReservationState({ status: "creating", message: "Creando reserva temporal...", reservation: null, acarsPayload: null });
    try {
      const response = await fetch("/api/dispatch/training-reservations", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operationType: operationCode,
          aircraftId: selectedAircraft.id || selectedAircraft.registration,
          aircraftCode: selectedAircraft.model_code,
          aircraftRegistration: selectedAircraft.registration,
          routeId: selectedRoute?.id || null,
          routeCode: selectedRoute?.route_code || null,
          originIdent,
          destinationIdent,
          alternateIdent,
          departureTime,
          flightLevel,
          routeText: effectiveRouteText,
          passengerCount: effectivePassengerCount,
          cargoKg,
          fuelKg,
          fuelPolicy,
          isCargo,
        }),
      });
      const payload = (await response.json().catch(() => null)) as {
        ok?: boolean;
        reservation?: DispatchReservation;
        reservationId?: string;
        dispatchToken?: string;
        expiresAt?: string;
        reusedExistingReservation?: boolean;
        message?: string;
        error?: string;
        code?: string;
      } | null;
      if (!response.ok || !payload?.ok || !payload.reservation) throw new Error(payload?.message || payload?.error || "No se pudo crear la reserva temporal.");
      const reservation = {
        ...payload.reservation,
        id: payload.reservationId || payload.reservation.id,
        dispatch_token: payload.dispatchToken || payload.reservation.dispatch_token,
        expires_at: payload.expiresAt || payload.reservation.expires_at,
        reusedExistingReservation: payload.reusedExistingReservation ?? payload.reservation.reusedExistingReservation,
      };
      setReservationState({
        status: "ready",
        message: reservation.reusedExistingReservation
          ? "Ya tenias una reserva activa. Puedes enviarla a ACARS."
          : "Reserva temporal creada. Disponible por 15 minutos.",
        reservation,
        acarsPayload: null,
      });
    } catch (error) {
      setReservationState({ status: "error", message: error instanceof Error ? error.message : "No se pudo crear la reserva temporal.", reservation: null, acarsPayload: null });
    }
  }

  async function prepareAcarsDispatch() {
    const reservation = reservationState.reservation;
    if (!reservation?.id || !reservation.dispatch_token) {
      setReservationState((current) => ({ ...current, status: "error", message: "Primero crea una reserva temporal vigente." }));
      return;
    }
    setReservationState((current) => ({ ...current, status: "sending", message: "Preparando despacho para ACARS..." }));
    try {
      const response = await fetch("/api/dispatch/training-reservations/send-to-acars", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reservationId: reservation.id, dispatchToken: reservation.dispatch_token }),
      });
      const payload = (await response.json().catch(() => null)) as {
        ok?: boolean;
        reservationId?: string;
        dispatchToken?: string;
        expiresAt?: string;
        acarsPayload?: DispatchAcarsPayload;
        message?: string;
        error?: string;
        code?: string;
      } | null;
      if (!response.ok || !payload?.ok || !payload.acarsPayload) throw new Error(payload?.message || payload?.error || "No se pudo preparar el despacho para ACARS.");
      setReservationState((current) => ({
        ...current,
        status: "acars_ready",
        message: "Despacho listo para ACARS.",
        reservation: current.reservation
          ? {
              ...current.reservation,
              id: payload.reservationId || current.reservation.id,
              dispatch_token: payload.dispatchToken || current.reservation.dispatch_token,
              expires_at: payload.expiresAt || current.reservation.expires_at,
              status: "ACARS_READY",
            }
          : reservation,
        acarsPayload: payload.acarsPayload,
      }));
    } catch (error) {
      setReservationState((current) => ({ ...current, status: "error", message: error instanceof Error ? error.message : "No se pudo preparar el despacho para ACARS." }));
    }
  }

  return (
    <main className={embedded ? styles.embeddedShell : styles.pageShell}>
      <div className={embedded ? styles.embeddedFrame : styles.pageFrame}>
        {!embedded ? (
          <>
            <header className={styles.topbar}>
              <a href="/dashboard" className={styles.brand}>PW</a>
              <nav><a href="/dashboard">Dashboard</a><a href="/dispatch">Despachos</a><a href="/fleet">Flota</a></nav>
            </header>
            <section className={styles.blackHeader}><h1>Reservar Vuelo - Despacho</h1></section>
          </>
        ) : (
          <section className={styles.embeddedRoomHeader}>
            <div>
              <span>Sala de despacho</span>
              <h2>{modeLabel(mode)}</h2>
            </div>
            <button type="button" onClick={onBack}>Volver a despachos</button>
          </section>
        )}
        <div className={embedded ? styles.embeddedLayoutGrid : styles.layoutGrid}>
          <section className={styles.mainColumn}>
            <div className={styles.startBlock}>
              <h2>{step === 5 ? "Despacho finalizado" : "Comencemos"}</h2>
              <div className={styles.stepper}>
                <StepItem index={1} label={(mode === "official_route" || mode === "cargo_official") ? "Ruta" : "Búsqueda"} active={step === 1} />
                <StepItem index={2} label="Aeronave" active={step === 2} />
                <StepItem index={3} label="Plan de vuelo" active={step === 3} />
                <StepItem index={4} label="Peso y combustible" active={step === 4} />
                <StepItem index={5} label="Imprimir" active={step === 5} />
              </div>
            </div>
            <section className={styles.dispatchPanel}>
              {!operationAllowed ? <div className={styles.instructions}>{selectedOperation?.blocked_reason || "Tu rango no permite esta operacion."}</div> : null}
              {step === 1 && (mode === "official_route" || mode === "cargo_official") ? (
                <>
                  <OfficialRouteStage
                    routes={mode === "cargo_official"
                      ? routeCandidates.filter((route) => isCargoRouteCategory(route.category))
                      : routeCandidates.filter((route) => isOfficialRouteCategory(route.category))}
                    selectedRouteId={selectedRouteId}
                    setSelectedRouteId={selectRoute}
                  />
                  <div className={styles.actionRow}><button type="button" className={styles.continueButton} disabled={!canContinueSearch} onClick={() => setStep(2)}>Continuar</button></div>
                </>
              ) : null}
              {step === 1 && mode !== "official_route" && mode !== "cargo_official" ? (
                <>
                  <SearchStage
                    mode={mode}
                    originQuery={originQuery}
                    setOriginQuery={setOriginQuery}
                    destinationQuery={destinationQuery}
                    setDestinationQuery={setDestinationQuery}
                    originIdent={originIdent}
                    setOriginIdent={setOriginIdent}
                    destinationIdent={destinationIdent}
                    setDestinationIdent={setDestinationIdent}
                    originResults={originResults}
                    destinationResults={destinationResults}
                    searchingOrigin={searchingOrigin}
                    searchingDestination={searchingDestination}
                  />
                  <div className={styles.actionRow}><button type="button" className={styles.continueButton} disabled={!canContinueSearch} onClick={() => setStep(2)}>Continuar</button></div>
                </>
              ) : null}
              {step === 2 ? (
                <>
                  <AircraftStage
                    mode={mode}
                    aircraft={aircraft}
                    aircraftId={aircraftId}
                    setAircraftId={setAircraftId}
                    selectedAircraft={selectedAircraft}
                    currentAirport={currentAirport}
                    departureTime={departureTime}
                    setDepartureTime={setDepartureTime}
                    originIdent={originIdent}
                    destinationIdent={destinationIdent}
                    operationLabel={selectedOperationLabel}
                    selectedRoute={selectedRoute}
                    aircraftPhotoUrl={selectedAircraftPhotoUrl}
                  />
                  <div className={styles.navButtons}>
                    <button type="button" className={styles.backButton} onClick={() => setStep(1)}>Volver</button>
                    <button type="button" className={styles.continueButton} disabled={!canContinueAircraft} onClick={() => setStep(3)}>Continuar</button>
                  </div>
                </>
              ) : null}
              {step === 3 ? (
                <>
                  <PlanStage originAirport={originAirport} destinationAirport={destinationAirport} originIdent={originIdent} destinationIdent={destinationIdent} flightLevel={flightLevel} setFlightLevel={setFlightLevel} routeText={effectiveRouteText} setRouteText={setRouteText} alternateIdent={alternateIdent} setAlternateIdent={setAlternateIdent} departureTime={departureTime} selectedAircraft={selectedAircraft} mode={mode} destinationPhotoUrl={destinationPhotoUrl} />
                  <div className={styles.navButtons}><button type="button" className={styles.backButton} onClick={() => setStep(2)}>Volver</button><button type="button" className={styles.continueButton} disabled={!canContinuePlan} onClick={() => setStep(4)}>Continuar</button></div>
                </>
              ) : null}
              {step === 4 ? (
                <>
                  <WeightFuelStage selectedAircraft={selectedAircraft} passengerCount={effectivePassengerCount} setPassengerCount={setPassengerCount} cargoKg={cargoKg} setCargoKg={setCargoKg} fuelKg={fuelKg} setFuelKg={setFuelKg} fuelPolicy={fuelPolicy} setFuelPolicy={setFuelPolicy} isCargo={isCargo} />
                  <div className={styles.navButtons}><button type="button" className={styles.backButton} onClick={() => setStep(3)}>Volver</button><button type="button" className={styles.continueButton} disabled={!canContinueWeight} onClick={() => setStep(5)}>Validar y preparar ACARS</button></div>
                </>
              ) : null}
              {step === 5 ? <FinalStage mode={mode} operationLabel={selectedOperationLabel} originIdent={originIdent} destinationIdent={destinationIdent} departureTime={departureTime} selectedAircraft={selectedAircraft} flightLevel={flightLevel} reservationState={reservationState} reservationCountdown={reservationCountdown} canCreateReservation={canCreateReservation} onCreateReservation={createTemporaryReservation} onSendToAcars={prepareAcarsDispatch} /> : null}
            </section>
          </section>
          <aside className={styles.sideCard}>
            <header>{normalizeText(pilot?.callsign, "PWG")}</header>
            <div className={styles.sideBody}>
              <h3>{normalizeText(pilot?.callsign, "Piloto")}</h3>
              <p>Rango: <strong>{normalizeText(pilot?.rank_code, "CADET")}</strong></p>
              <p>Estado: <strong>{normalizeText(pilot?.pilot_status, "ACTIVE")}</strong></p>
              <div className={styles.sideDivider} />
              <p><strong>Ubicacion:</strong></p>
              <div className={styles.badgeLineCentered}><IcaoFlagBadge icao={airportCode(currentAirport) || "----"} countryCode={currentAirport?.iso_country || currentAirport?.country} size="sm" /></div>
              <p><strong>{airportLabel(currentAirport)}</strong></p>
              <div className={styles.sideDivider} />
              <p><strong>{hasValidReservation ? "Avion reservado:" : "Aeronave seleccionada:"}</strong></p>
              <strong>{hasValidReservation ? reservedAircraftLabel : selectedAircraft ? aircraftLabel(selectedAircraft) : "-"}</strong>
              <div className={styles.sideDivider} />
              <p className={styles.smallNote}>{selectedOperationHelp}</p>
              {loading ? <p className={styles.smallNote}>Cargando datos de Neon...</p> : null}
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
