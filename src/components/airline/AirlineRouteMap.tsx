"use client";
/* eslint-disable @next/next/no-img-element */
import { PointerEvent, useMemo, useRef, useState } from "react";
import { AIRLINE_AIRPORTS, type AirlineAirport } from "@/lib/airline/airports";
import { getCargoRoutes, getPassengerRoutes } from "@/lib/airline/route-network";
import type { AirlineRoute } from "@/lib/airline/routes";
import styles from "./AirlineRouteMap.module.css";

const MAP_WIDTH = 1100;
const MAP_HEIGHT = 760;
const MAP_PADDING = 62;
const TILE_SIZE = 256;
const MIN_ZOOM = 2;
const MAX_ZOOM = 6;

type AirportPoint = AirlineAirport & {
  x: number;
  y: number;
};

type StaticMapTile = {
  key: string;
  src: string;
  left: number;
  top: number;
  width: number;
  height: number;
};

type StaticNetworkMap = {
  zoom: number;
  viewBox: string;
  tiles: StaticMapTile[];
  airports: AirportPoint[];
};

type MapPan = {
  x: number;
  y: number;
};

type DragState = {
  pointerId: number;
  clientX: number;
  clientY: number;
};

function clampLatitude(lat: number) {
  return Math.max(-85.05112878, Math.min(85.05112878, lat));
}

function latLonToWorld(lat: number, lon: number, zoom: number) {
  const safeLat = clampLatitude(lat);
  const scale = TILE_SIZE * 2 ** zoom;
  const sinLat = Math.sin((safeLat * Math.PI) / 180);

  return {
    x: ((lon + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale,
  };
}

function normalizeTileX(tileX: number, zoom: number) {
  const max = 2 ** zoom;
  return ((tileX % max) + max) % max;
}

function chooseBaseZoom(airports: AirlineAirport[]) {
  for (let zoom = MAX_ZOOM; zoom >= MIN_ZOOM; zoom -= 1) {
    const points = airports.map((airport) => latLonToWorld(airport.lat, airport.lon, zoom));
    const minX = Math.min(...points.map((point) => point.x));
    const maxX = Math.max(...points.map((point) => point.x));
    const minY = Math.min(...points.map((point) => point.y));
    const maxY = Math.max(...points.map((point) => point.y));

    if (
      maxX - minX <= MAP_WIDTH - MAP_PADDING * 2 &&
      maxY - minY <= MAP_HEIGHT - MAP_PADDING * 2
    ) {
      return zoom;
    }
  }

  return MIN_ZOOM;
}

function buildStaticNetworkMap(airports: AirlineAirport[], zoom: number, pan: MapPan): StaticNetworkMap {
  const worldPoints = airports.map((airport) => ({
    airport,
    ...latLonToWorld(airport.lat, airport.lon, zoom),
  }));
  const minX = Math.min(...worldPoints.map((point) => point.x));
  const maxX = Math.max(...worldPoints.map((point) => point.x));
  const minY = Math.min(...worldPoints.map((point) => point.y));
  const maxY = Math.max(...worldPoints.map((point) => point.y));
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const viewportLeft = centerX - MAP_WIDTH / 2 + pan.x;
  const viewportTop = centerY - MAP_HEIGHT / 2 + pan.y;
  const tileMinX = Math.floor(viewportLeft / TILE_SIZE);
  const tileMaxX = Math.floor((viewportLeft + MAP_WIDTH) / TILE_SIZE);
  const tileMinY = Math.max(0, Math.floor(viewportTop / TILE_SIZE));
  const tileMaxY = Math.min(2 ** zoom - 1, Math.floor((viewportTop + MAP_HEIGHT) / TILE_SIZE));
  const tiles: StaticMapTile[] = [];

  for (let tileX = tileMinX; tileX <= tileMaxX; tileX += 1) {
    for (let tileY = tileMinY; tileY <= tileMaxY; tileY += 1) {
      const normalizedX = normalizeTileX(tileX, zoom);
      tiles.push({
        key: `${zoom}-${normalizedX}-${tileY}`,
        src: `https://tile.openstreetmap.org/${zoom}/${normalizedX}/${tileY}.png`,
        left: ((tileX * TILE_SIZE - viewportLeft) / MAP_WIDTH) * 100,
        top: ((tileY * TILE_SIZE - viewportTop) / MAP_HEIGHT) * 100,
        width: (TILE_SIZE / MAP_WIDTH) * 100,
        height: (TILE_SIZE / MAP_HEIGHT) * 100,
      });
    }
  }

  return {
    zoom,
    viewBox: `0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`,
    tiles,
    airports: worldPoints.map(({ airport, x, y }) => ({
      ...airport,
      x: x - viewportLeft,
      y: y - viewportTop,
    })),
  };
}

function dedupeRoutes(routes: AirlineRoute[]) {
  const seen = new Set<string>();

  return routes.filter((route) => {
    const pair = [route.origin, route.destination].sort().join("-");
    const key = `${route.flightType}:${route.routeCategory}:${pair}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function lineClass(route: AirlineRoute) {
  if (route.isCargoRoute) return styles.cargoLine;
  if (route.flightType === "training" || route.routeCategory === "escuela_local") return styles.schoolLine;
  return styles.passengerLine;
}

function dotClass(airport: AirlineAirport) {
  if (airport.isPassengerHub && airport.isCargoHub) return styles.mixedHubDot;
  if (airport.isCargoHub) return styles.cargoHubDot;
  if (airport.isPassengerHub) return styles.passengerHubDot;
  return styles.airportDot;
}

export function AirlineRouteMap() {
  const passengerRoutes = getPassengerRoutes().filter((route) => route.flightType === "itinerary" || route.flightType === "charter");
  const schoolRoutes = getPassengerRoutes().filter((route) => route.flightType === "training" || route.routeCategory === "escuela_local");
  const cargoRoutes = getCargoRoutes();
  const airports = AIRLINE_AIRPORTS.filter((airport) => airport.active);
  const passengerHubs = airports.filter((airport) => airport.isPassengerHub).length;
  const cargoHubs = airports.filter((airport) => airport.isCargoHub).length;
  const baseZoom = useMemo(() => chooseBaseZoom(airports), [airports]);
  const [zoom, setZoom] = useState(baseZoom);
  const [pan, setPan] = useState<MapPan>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<DragState | null>(null);
  const staticMap = useMemo(() => buildStaticNetworkMap(airports, zoom, pan), [airports, zoom, pan]);
  const airportPoints = useMemo(() => new Map(staticMap.airports.map((airport) => [airport.icao, airport])), [staticMap.airports]);
  const visualRoutes = useMemo(() => dedupeRoutes([...passengerRoutes, ...cargoRoutes, ...schoolRoutes]), [passengerRoutes, cargoRoutes, schoolRoutes]);

  function updateZoom(nextZoom: number) {
    setZoom(nextZoom);
    setPan({ x: 0, y: 0 });
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
    };
    setIsDragging(true);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const deltaX = ((event.clientX - drag.clientX) / rect.width) * MAP_WIDTH;
    const deltaY = ((event.clientY - drag.clientY) / rect.height) * MAP_HEIGHT;

    setPan((current) => ({
      x: current.x - deltaX,
      y: current.y - deltaY,
    }));

    dragRef.current = {
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
    };
  }

  function finishDragging(event: PointerEvent<HTMLDivElement>) {
    if (dragRef.current?.pointerId === event.pointerId) {
      dragRef.current = null;
      setIsDragging(false);
    }
  }

  return (
    <section className={styles.mapCard}>
      <header className={styles.mapHeader}>
        <h3>Mapa total de rutas</h3>
        <span>{passengerRoutes.length} pasajeros / {cargoRoutes.length} carga / {schoolRoutes.length} escuela / {passengerHubs + cargoHubs} hubs</span>
      </header>
      <div className={styles.mapBody}>
        <div
          className={`${styles.staticMap} ${isDragging ? styles.draggingMap : ""}`}
          aria-label="Mapa fijo de rutas Patagonia Wings con zoom y desplazamiento OpenStreetMap"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishDragging}
          onPointerCancel={finishDragging}
          onPointerLeave={finishDragging}
        >
          <div className={styles.mapControls} onPointerDown={(event) => event.stopPropagation()}>
            <button
              type="button"
              className={styles.zoomButton}
              onClick={() => updateZoom(Math.min(MAX_ZOOM, zoom + 1))}
              disabled={zoom >= MAX_ZOOM}
              aria-label="Acercar mapa"
              title="Acercar"
            >
              +
            </button>
            <button
              type="button"
              className={styles.zoomButton}
              onClick={() => updateZoom(Math.max(MIN_ZOOM, zoom - 1))}
              disabled={zoom <= MIN_ZOOM}
              aria-label="Alejar mapa"
              title="Alejar"
            >
              −
            </button>
          </div>
          <div className={styles.tileLayer} aria-hidden="true">
            {staticMap.tiles.map((tile) => (
              <img
                key={tile.key}
                src={tile.src}
                alt=""
                draggable={false}
                className={styles.mapTile}
                style={{
                  left: `${tile.left}%`,
                  top: `${tile.top}%`,
                  width: `${tile.width}%`,
                  height: `${tile.height}%`,
                }}
              />
            ))}
          </div>
          <svg className={styles.mapOverlay} viewBox={staticMap.viewBox} preserveAspectRatio="none" aria-hidden="true">
            {visualRoutes.map((route) => {
              const from = airportPoints.get(route.origin);
              const to = airportPoints.get(route.destination);
              if (!from || !to) return null;
              return (
                <line
                  key={route.routeId}
                  className={lineClass(route)}
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                />
              );
            })}
            {staticMap.airports.map((airport) => (
              <g key={airport.icao}>
                <circle className={dotClass(airport)} cx={airport.x} cy={airport.y} r={airport.isPassengerHub || airport.isCargoHub ? 6.8 : 5} />
                <text className={styles.airportLabel} x={airport.x + 8} y={airport.y - 8}>{airport.icao}</text>
              </g>
            ))}
          </svg>
          <div className={styles.mapAttribution}>© OpenStreetMap contributors</div>
        </div>
      </div>
    </section>
  );
}
