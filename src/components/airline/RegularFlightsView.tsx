"use client";

import { useState } from "react";
import IcaoFlagBadge from "@/components/ui/IcaoFlagBadge";
import { AirlineRouteMap } from "@/components/airline/AirlineRouteMap";
import { getAirlineAirport } from "@/lib/airline/airports";
import {
  getOperationalRoutes,
  validateRouteNetwork,
} from "@/lib/airline/route-network";
import type { AirlineRoute } from "@/lib/airline/routes";
import { calculateRouteEconomyByAircraft } from "@/lib/economy";
import type { RouteEconomyByAircraftItem } from "@/lib/economy";
import styles from "./RegularFlightsView.module.css";

const categoryLabels: Record<string, string> = {
  escuela_local: "Escuela local",
  regional: "Regionales",
  interregional: "Interregionales",
  patagonia: "Patagonia",
  nacional: "Nacionales",
  internacional_regional: "Internacionales regionales",
  largo_radio: "Largo radio",
  carga_regional: "Carga regional",
  carga_interregional: "Carga interregional",
  carga_nacional: "Carga nacional",
  carga_internacional: "Carga internacional",
};

const categoryOrder = [
  "regional",
  "interregional",
  "patagonia",
  "nacional",
  "internacional_regional",
  "largo_radio",
  "carga_regional",
  "carga_interregional",
  "carga_nacional",
  "carga_internacional",
];

const schoolCategoryOrder = ["escuela_local"];

function formatFlightType(value: string) {
  if (value === "cargo") return "Carga";
  if (value === "training") return "Entrenamiento";
  if (value === "charter") return "Charter";
  return "Itinerario";
}

function routeCity(icao: string) {
  const airport = getAirlineAirport(icao);
  return airport ? `${airport.city}, ${airport.country}` : icao;
}

function hubLabels(route: AirlineRoute) {
  const origin = getAirlineAirport(route.origin);
  const destination = getAirlineAirport(route.destination);
  return [
    origin?.isPassengerHub ? `${route.origin} hub pasajeros` : null,
    origin?.isCargoHub ? `${route.origin} hub carga` : null,
    destination?.isPassengerHub ? `${route.destination} hub pasajeros` : null,
    destination?.isCargoHub ? `${route.destination} hub carga` : null,
  ].filter(Boolean) as string[];
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function defaultAircraft(items: RouteEconomyByAircraftItem[]): string {
  const rec = items.find((item) => item.isRecommended && item.isProfitable);
  if (rec) return rec.aircraftCode;
  const profitable = items.find((item) => item.isProfitable);
  if (profitable) return profitable.aircraftCode;
  return items[0]?.aircraftCode ?? "";
}

function RouteCard({ route, hasReturn, economyByAircraft }: {
  route: AirlineRoute;
  hasReturn: boolean;
  economyByAircraft: RouteEconomyByAircraftItem[];
}) {
  const hubs = hubLabels(route);
  const [selectedCode, setSelectedCode] = useState<string>(() => defaultAircraft(economyByAircraft));
  const selected = economyByAircraft.find((item) => item.aircraftCode === selectedCode) ?? economyByAircraft[0];
  const economy = selected?.estimate ?? null;
  const economyPositive = economy ? economy.airlineNetUsd > 0 : false;

  return (
    <article className={styles.routeCard}>
      <header className={styles.routeHeader}>
        <div className={styles.routePair}>
          <IcaoFlagBadge icao={route.origin} size="sm" />
          <b>-</b>
          <IcaoFlagBadge icao={route.destination} size="sm" />
        </div>
        <span className={styles.routeBadge}>{formatFlightType(route.flightType)}</span>
      </header>
      <div className={styles.routeBody}>
        <p className={styles.cityLine}>{routeCity(route.origin)} - {routeCity(route.destination)}</p>
        <div className={styles.detailGrid}>
          <div className={styles.detail}><span>Distancia</span><strong>{route.distanceNm} NM</strong></div>
          <div className={styles.detail}><span>Categoria</span><strong>{categoryLabels[route.routeCategory] ?? route.routeCategory}</strong></div>
          <div className={styles.detail}><span>Rango minimo</span><strong>{route.minRank}</strong></div>
        </div>
        <div className={styles.aircraftList} aria-label="Aeronaves compatibles">
          {economyByAircraft.map((item) => (
            <button
              key={`${route.routeId}-${item.aircraftCode}`}
              type="button"
              className={`${styles.aircraftChip}${item.aircraftCode === selectedCode ? ` ${styles.aircraftChipSelected}` : ""}${item.isRecommended ? ` ${styles.aircraftChipRecommended}` : ""}`}
              onClick={() => setSelectedCode(item.aircraftCode)}
              aria-pressed={item.aircraftCode === selectedCode}
            >
              {item.aircraftCode}
            </button>
          ))}
        </div>
        {economy ? (
          <div className={`${styles.economyStrip} ${economyPositive ? styles.economyStripPositive : styles.economyStripNegative}`}>
            <span>Economia estimada con {selected?.aircraftCode ?? ""}</span>
            <strong>Ingreso {formatMoney(economy.grossRevenueUsd)}</strong>
            <strong>Costo {formatMoney(economy.totalCostUsd)}</strong>
            <strong>Utilidad {formatMoney(economy.airlineNetUsd)}</strong>
            <strong>Devengo {formatMoney(economy.pilotAccrualUsd)}</strong>
          </div>
        ) : null}
        <div className={styles.hubLine}>
          <span className={hasReturn ? styles.returnOk : styles.returnWarn}>{hasReturn ? "Retorno validado" : "Retorno pendiente"}</span>
          {hubs.map((hub) => <span key={`${route.routeId}-${hub}`}>{hub}</span>)}
        </div>
      </div>
    </article>
  );
}

export function RegularFlightsView() {
  const routes = getOperationalRoutes();
  const regularRoutes = routes.filter((route) => route.flightType === "itinerary" || route.flightType === "cargo");
  const schoolRoutes = routes.filter((route) => route.flightType === "training" || route.routeCategory === "escuela_local");
  const validation = validateRouteNetwork();
  const routeIds = new Set(routes.map((route) => route.routeId));
  const itineraryCount = regularRoutes.filter((route) => route.flightType === "itinerary").length;
  const cargoCount = regularRoutes.filter((route) => route.flightType === "cargo").length;

  const economyMap = new Map<string, RouteEconomyByAircraftItem[]>();
  for (const route of [...regularRoutes, ...schoolRoutes]) {
    if (route.flightType === "itinerary" || route.flightType === "cargo") {
      economyMap.set(route.routeId, calculateRouteEconomyByAircraft(route));
    }
  }

  return (
    <div className={styles.shell}>
      <section className={styles.intro}>
        <header className={styles.introHeader}>
          <h3>Vuelos Regulares</h3>
        </header>
        <div className={styles.introBody}>
          <div className={styles.summaryGrid}>
            <div className={styles.metric}><span>Itinerario</span><strong>{itineraryCount}</strong></div>
            <div className={styles.metric}><span>Carga</span><strong>{cargoCount}</strong></div>
            <div className={styles.metric}><span>Escuela</span><strong>{schoolRoutes.length}</strong></div>
            <div className={styles.metric}><span>Aeronaves</span><strong>{validation.totals.aircraft}</strong></div>
            <div className={styles.metric}><span>Hubs</span><strong>{validation.totals.passengerHubs + validation.totals.cargoHubs}</strong></div>
            <div className={styles.metric}><span>Destinos</span><strong>{validation.totals.destinations}</strong></div>
            <div className={styles.metric}><span>Retornos OK</span><strong>{validation.missingReturnRoutes.length === 0 ? "OK" : "FAIL"}</strong></div>
          </div>
          <p>Vista principal de vuelos regulares: itinerario y carga operacional. Checkrides, licencias y certificaciones quedan fuera de esta red; escuela local se muestra separada.</p>
        </div>
      </section>

      <AirlineRouteMap />

      {categoryOrder.map((category) => {
        const categoryRoutes = regularRoutes.filter((route) => route.routeCategory === category);
        if (!categoryRoutes.length) return null;

        return (
          <section className={styles.section} key={category}>
            <header className={styles.sectionHeader}>
              <h4>{categoryLabels[category] ?? category}</h4>
              <span>{categoryRoutes.length} rutas</span>
            </header>
            <div className={styles.routeGrid}>
              {categoryRoutes.map((route) => (
                <RouteCard
                  key={route.routeId}
                  route={route}
                  hasReturn={routeIds.has(route.returnRouteId)}
                  economyByAircraft={economyMap.get(route.routeId) ?? []}
                />
              ))}
            </div>
          </section>
        );
      })}

      {schoolCategoryOrder.map((category) => {
        const categoryRoutes = schoolRoutes.filter((route) => route.routeCategory === category);
        if (!categoryRoutes.length) return null;

        return (
          <section className={`${styles.section} ${styles.schoolSection}`} key={category}>
            <header className={styles.sectionHeader}>
              <div>
                <h4>{categoryLabels[category] ?? category}</h4>
                <p>Seccion separada de escuela/local. No forma parte de la vista principal de vuelos regulares.</p>
              </div>
              <span>{categoryRoutes.length} rutas</span>
            </header>
            <div className={styles.routeGrid}>
              {categoryRoutes.map((route) => (
                <RouteCard
                  key={route.routeId}
                  route={route}
                  hasReturn={routeIds.has(route.returnRouteId)}
                  economyByAircraft={economyMap.get(route.routeId) ?? []}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
