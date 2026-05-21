"use client";

import type { OperationId } from "@/components/dispatch/OperationTypeStep";

export type AvailableRoute = {
  id: string;
  route_code: string;
  origin_ident: string;
  destination_ident: string;
  destination_name: string;
  destination_city: string;
  category: string;
  distance_nm: number;
  warnings: string[];
  available_aircraft: string[];
  blocked_reasons: string[];
};

export type AirportSearchItem = {
  ident: string;
  icao: string | null;
  name: string;
  city: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  lightingPolicy: string | null;
  lightingWarningOnly: boolean;
};

type RouteSelectionStepProps = {
  operation: OperationId;
  routes: AvailableRoute[];
  selectedRouteId: string;
  onSelectRouteId: (value: string) => void;
  charterAirports: AirportSearchItem[];
  selectedCharterAirport: string;
  onSelectCharterAirport: (value: string) => void;
  onSearchCharter: (query: string) => void;
};

function routeMatchesOperation(route: AvailableRoute, operation: OperationId) {
  const category = route.category.toUpperCase();
  if (operation === "training") return category === "TRAINING";
  if (operation === "itinerary") return category !== "CARGO";
  if (operation === "aircraft_transfer")
    return category === "TRANSFER" || category === "AIRCRAFT_TRANSFER";
  if (operation === "cargo") return category === "CARGO";
  return false;
}

export function RouteSelectionStep(props: RouteSelectionStepProps) {
  if (props.operation === "training") {
    return (
      <div className="space-y-3">
        <input
          type="text"
          placeholder="Buscar origen/destino global para entrenamiento"
          onChange={(event) => props.onSearchCharter(event.target.value)}
          className="w-full rounded-xl border border-sky-100 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-300"
        />
        <select
          value={props.selectedCharterAirport}
          onChange={(event) => props.onSelectCharterAirport(event.target.value)}
          className="w-full rounded-xl border border-sky-100 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-300"
        >
          <option value="">Selecciona aeropuerto para entrenamiento</option>
          {props.charterAirports.map((airport) => (
            <option
              key={`${airport.ident}-${airport.icao || ""}`}
              value={airport.ident}
            >
              {airport.ident} — {airport.name} /{" "}
              {airport.city || "No registrado"}
            </option>
          ))}
        </select>
        <p className="text-xs text-slate-600">
          Entrenamiento libre: este vuelo no mueve tu ubicación ni la aeronave.
          La evaluación es referencial.
        </p>
      </div>
    );
  }

  const filteredRoutes = props.routes.filter((route) =>
    routeMatchesOperation(route, props.operation),
  );

  if (props.operation === "charter") {
    return (
      <div className="space-y-3">
        <input
          type="text"
          placeholder="Buscar destino global (ICAO, ciudad, nombre)"
          onChange={(event) => props.onSearchCharter(event.target.value)}
          className="w-full rounded-xl border border-sky-100 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-300"
        />
        <select
          value={props.selectedCharterAirport}
          onChange={(event) => props.onSelectCharterAirport(event.target.value)}
          className="w-full rounded-xl border border-sky-100 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-300"
        >
          <option value="">Selecciona aeropuerto destino</option>
          {props.charterAirports.map((airport) => (
            <option
              key={`${airport.ident}-${airport.icao || ""}`}
              value={airport.ident}
            >
              {airport.ident} — {airport.name} /{" "}
              {airport.city || "No registrado"}
            </option>
          ))}
        </select>
        <p className="text-xs text-slate-600">
          Charter usa red global de aeropuertos, con origen en tu ubicación
          actual.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <select
        value={props.selectedRouteId}
        onChange={(event) => props.onSelectRouteId(event.target.value)}
        className="w-full rounded-xl border border-sky-100 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-300"
      >
        <option value="">Selecciona ruta disponible</option>
        {filteredRoutes.map((route) => {
          const blocked = route.blocked_reasons.length > 0;
          const label = `${route.destination_ident} · ${route.distance_nm.toFixed(1)} NM · ${route.category}`;
          return (
            <option key={route.id} value={route.id} disabled={blocked}>
              {blocked ? `[Bloqueada] ${label}` : label}
            </option>
          );
        })}
      </select>
      {props.selectedRouteId ? (
        <div className="rounded-xl border border-sky-100 bg-sky-50 p-3 text-xs text-slate-700">
          {(() => {
            const route = filteredRoutes.find(
              (item) => item.id === props.selectedRouteId,
            );
            if (!route) return "Ruta no encontrada.";
            return (
              <>
                <p>
                  Destino: {route.destination_ident} — {route.destination_name}
                </p>
                <p>Ciudad: {route.destination_city}</p>
                <p>Distancia: {route.distance_nm.toFixed(1)} NM</p>
                {route.warnings.length ? (
                  <p>Advertencias: {route.warnings.join(" | ")}</p>
                ) : null}
                {route.blocked_reasons.length ? (
                  <p className="text-rose-600">
                    Bloqueo: {route.blocked_reasons.join(" | ")}
                  </p>
                ) : null}
              </>
            );
          })()}
        </div>
      ) : null}
    </div>
  );
}
