/* eslint-disable @next/next/no-img-element */
import type { ReactNode } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ConfirmedFlightCallout } from "@/components/dashboard/sur/ConfirmedFlightCallout";
import { CrewHeader } from "@/components/layout/CrewHeader";
import IcaoFlagBadge from "@/components/ui/IcaoFlagBadge";
import { getAuthenticatedPilot } from "@/lib/auth/service";
import { buildCrewCenterPayload } from "@/lib/dispatch/neon-ops";
import { getSessionTokenFromCookies } from "@/lib/session/server";
import { CHECKRIDE_FAILURE_POLICY, getCertificationByCode } from "@/lib/training/catalog";
import styles from "./CertificationCheckridePage.module.css";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type PageProps = {
  params: Promise<{ aircraftCode: string }>;
};

type AirportPosition = {
  lat: number;
  lon: number;
};

type StaticMapTile = {
  key: string;
  src: string;
  left: number;
  top: number;
  width: number;
  height: number;
};

type StaticRoutePoint = AirportPosition & {
  code: string;
  x: number;
  y: number;
};

type StaticDirectRouteMap = {
  zoom: number;
  viewBox: string;
  tiles: StaticMapTile[];
  origin: StaticRoutePoint;
  destination: StaticRoutePoint;
};

const STATIC_MAP_WIDTH = 1200;
const STATIC_MAP_HEIGHT = 310;
const TILE_SIZE = 256;

const AIRPORT_POSITIONS: Record<string, AirportPosition> = {
  SCPF: { lat: -41.455685, lon: -72.918704 },
  SCTE: { lat: -41.443093, lon: -73.094065 },
  SCJO: { lat: -40.611208, lon: -73.060997 },
  SCIE: { lat: -36.772701, lon: -73.063103 },
  SCEL: { lat: -33.392799, lon: -70.785803 },
  SCFA: { lat: -23.444501, lon: -70.445099 },
  SCDA: { lat: -20.5352, lon: -70.181297 },
  SBGR: { lat: -23.435556, lon: -46.473057 },
  SAEZ: { lat: -34.822222, lon: -58.535833 },
  KMIA: { lat: 25.79325, lon: -80.290556 },
  KATL: { lat: 33.6367, lon: -84.428101 },
  KJFK: { lat: 40.639801, lon: -73.7789 },
  KBOS: { lat: 42.3643, lon: -71.005203 },
};

function clampLatitude(lat: number) {
  return Math.max(-85.05112878, Math.min(85.05112878, lat));
}

function latLonToWorld(point: AirportPosition, zoom: number) {
  const lat = clampLatitude(point.lat);
  const scale = TILE_SIZE * 2 ** zoom;
  const sinLat = Math.sin((lat * Math.PI) / 180);
  const x = ((point.lon + 180) / 360) * scale;
  const y = (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale;

  return { x, y };
}

function chooseStaticMapZoom(origin: AirportPosition, destination: AirportPosition) {
  for (let zoom = 13; zoom >= 3; zoom -= 1) {
    const a = latLonToWorld(origin, zoom);
    const b = latLonToWorld(destination, zoom);
    const spanX = Math.abs(a.x - b.x);
    const spanY = Math.abs(a.y - b.y);

    if (spanX <= STATIC_MAP_WIDTH * 0.76 && spanY <= STATIC_MAP_HEIGHT * 0.58) {
      return zoom;
    }
  }

  return 3;
}

function normalizeTileX(tileX: number, zoom: number) {
  const max = 2 ** zoom;
  return ((tileX % max) + max) % max;
}

function buildStaticDirectRouteMap(origin: string, destination: string): StaticDirectRouteMap | null {
  const originPosition = AIRPORT_POSITIONS[origin];
  const destinationPosition = AIRPORT_POSITIONS[destination];

  if (!originPosition || !destinationPosition) return null;

  const zoom = chooseStaticMapZoom(originPosition, destinationPosition);
  const originWorld = latLonToWorld(originPosition, zoom);
  const destinationWorld = latLonToWorld(destinationPosition, zoom);
  const centerX = (originWorld.x + destinationWorld.x) / 2;
  const centerY = (originWorld.y + destinationWorld.y) / 2;
  const viewportLeft = centerX - STATIC_MAP_WIDTH / 2;
  const viewportTop = centerY - STATIC_MAP_HEIGHT / 2;
  const tileMinX = Math.floor(viewportLeft / TILE_SIZE);
  const tileMaxX = Math.floor((viewportLeft + STATIC_MAP_WIDTH) / TILE_SIZE);
  const tileMinY = Math.max(0, Math.floor(viewportTop / TILE_SIZE));
  const tileMaxY = Math.min(2 ** zoom - 1, Math.floor((viewportTop + STATIC_MAP_HEIGHT) / TILE_SIZE));
  const tiles: StaticMapTile[] = [];

  for (let tileX = tileMinX; tileX <= tileMaxX; tileX += 1) {
    for (let tileY = tileMinY; tileY <= tileMaxY; tileY += 1) {
      const normalizedX = normalizeTileX(tileX, zoom);
      tiles.push({
        key: `${zoom}-${normalizedX}-${tileY}`,
        src: `https://tile.openstreetmap.org/${zoom}/${normalizedX}/${tileY}.png`,
        left: ((tileX * TILE_SIZE - viewportLeft) / STATIC_MAP_WIDTH) * 100,
        top: ((tileY * TILE_SIZE - viewportTop) / STATIC_MAP_HEIGHT) * 100,
        width: (TILE_SIZE / STATIC_MAP_WIDTH) * 100,
        height: (TILE_SIZE / STATIC_MAP_HEIGHT) * 100,
      });
    }
  }

  const originX = originWorld.x - viewportLeft;
  const originY = originWorld.y - viewportTop;
  const destinationX = destinationWorld.x - viewportLeft;
  const destinationY = destinationWorld.y - viewportTop;

  return {
    zoom,
    viewBox: `0 0 ${STATIC_MAP_WIDTH} ${STATIC_MAP_HEIGHT}`,
    tiles,
    origin: { code: origin, ...originPosition, x: originX, y: originY },
    destination: { code: destination, ...destinationPosition, x: destinationX, y: destinationY },
  };
}

function mapPointStyle(point: StaticRoutePoint) {
  return {
    left: `${(point.x / STATIC_MAP_WIDTH) * 100}%`,
    top: `${(point.y / STATIC_MAP_HEIGHT) * 100}%`,
  };
}

function money(value: number) {
  return `$ ${value.toLocaleString("es-CL")}`;
}

function Panel({ title, icon, children }: { title: string; icon: string; children: ReactNode }) {
  return (
    <article className={styles.panel}>
      <header className={styles.panelHeader}><i>{icon}</i>{title}</header>
      <div className={styles.panelBody}>{children}</div>
    </article>
  );
}

export default async function CertificationCheckridePage({ params }: PageProps) {
  const { aircraftCode } = await params;
  const cert = getCertificationByCode(decodeURIComponent(aircraftCode));

  if (!cert) notFound();

  const token = await getSessionTokenFromCookies();
  const user = await getAuthenticatedPilot(token);
  if (!user) redirect("/login");

  const data = await buildCrewCenterPayload(user);
  const activeReservation = data.activeReservation ?? data.reservedFlight ?? null;
  const routeMap = buildStaticDirectRouteMap(cert.route.origin, cert.route.destination);

  return (
    <main className={styles.page}>
      <CrewHeader pilot={data.pilot} />

      <div className={`pw-sur-container ${styles.content}`}>
        <ConfirmedFlightCallout reservedFlight={activeReservation} />

        <section className={styles.academyIntro}>
          <div className={styles.academyTop}>
            <span>Patagonia Wings Academy</span>
            <h1>Certificacion {cert.code} — {cert.name}</h1>
          </div>
          <div className={styles.academyMeta}>
            <div className={styles.metaBox}>
              <small>Equipo</small>
              <strong>{cert.code}</strong>
              <span>{cert.name}</span>
            </div>
            <div className={styles.metaBox}>
              <small>Ruta checkride</small>
              <strong>{cert.route.origin} → {cert.route.destination}</strong>
              <span>Alterno {cert.route.alternate}</span>
            </div>
            <div className={styles.metaBox}>
              <small>Costo</small>
              <strong className={styles.money}>{money(cert.costCoins)}</strong>
              <span>Wallet/economia pendiente</span>
            </div>
          </div>
        </section>

        <Panel title={`Certificacion ${cert.category} — ${cert.family} — ${cert.code}`} icon="▸">
          <div className={styles.academyMeta}>
            <div className={styles.metaBox}>
              <small>Equipo</small>
              <strong>{cert.code}</strong>
              <span>{cert.name}</span>
            </div>
            <div className={styles.metaBox}>
              <small>Ruta</small>
              <strong>{cert.route.origin} → {cert.route.destination}</strong>
              <span>{cert.route.cruiseLevel}</span>
            </div>
            <div className={styles.metaBox}>
              <small>Costo</small>
              <strong className={styles.money}>{money(cert.costCoins)}</strong>
              <span>Sin transacciones reales</span>
            </div>
          </div>
        </Panel>

        <Panel title="Acerca del checkride" icon="i">
          <div className={styles.twoCards}>
            <section className={styles.infoCard}>
              <h3>Que es</h3>
              <p>{cert.scenario.objective}</p>
            </section>
            <section className={styles.infoCard}>
              <h3>Como se aprueba</h3>
              <p>El vuelo debe completarse dentro de los parametros operacionales definidos por Patagonia Wings. La evaluacion oficial sera server-side cuando el modulo ACARS/evaluacion quede conectado.</p>
            </section>
          </div>
          <section className={styles.routeBlock}>
            <h3>Ruta del vuelo</h3>
            <div className={styles.routeLine}>
              <div className={styles.routeStop}>
                <IcaoFlagBadge icao={cert.route.origin} size="sm" />
                <b>Origen</b>
              </div>
              <span className={styles.routeArrow}>→</span>
              <div className={styles.routeStop}>
                <IcaoFlagBadge icao={cert.route.destination} size="sm" />
                <b>Destino</b>
              </div>
              <span className={styles.routeArrow}>→</span>
              <div className={styles.routeStop}>
                <IcaoFlagBadge icao={cert.route.alternate} size="sm" />
                <b>Alternativa</b>
              </div>
            </div>
          </section>
        </Panel>

        <Panel title="Criterios de evaluacion" icon="●">
          <ol className={styles.criteriaList}>
            {cert.criteria.map((item, index) => (
              <li key={item}>
                <span className={styles.stepNumber}>{index + 1}</span>
                <span>{item}</span>
              </li>
            ))}
          </ol>
        </Panel>

        <Panel title="Plan de vuelo" icon="▦">
          <ul className={styles.flightPlan}>
            {cert.plan.map((item) => (
              <li key={item}>
                <span className={styles.planDot} />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Clima del checkride" icon="☁">
          <div className={styles.weatherStrip}>
            <p>{cert.scenario.weather}</p>
            <div className={styles.weatherMeta}>
              <span>Tipo: {cert.route.cruiseLevel.startsWith("VFR") ? "Visual" : "Instrumental"}</span>
              <span>Nivel: {cert.route.cruiseLevel}</span>
              <span>Duracion: {cert.scenario.duration}</span>
            </div>
          </div>
        </Panel>

        <Panel title="Requisitos del simulador" icon="▣">
          <div className={styles.twoCards}>
            <section className={`${styles.simCard} ${styles.simCardWarn}`}>
              <h3>MSFS 2020 / 2024</h3>
              <p>{cert.scenario.simulator}</p>
            </section>
            <section className={`${styles.simCard} ${styles.simCardOk}`}>
              <h3>ACARS / evaluacion</h3>
              <p>La evidencia oficial se validara en servidor cuando se conecte el flujo completo ACARS.</p>
            </section>
          </div>
        </Panel>

        <Panel title="Mapa del trayecto" icon="▰">
          <div className={styles.mapBox}>
            {routeMap ? (
              <div className={styles.staticMap} aria-label={`Ruta directa ${cert.route.origin} a ${cert.route.destination}`}>
                <div className={styles.tileLayer} aria-hidden="true">
                  {routeMap.tiles.map((tile) => (
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
                <svg className={styles.directRouteOverlay} viewBox={routeMap.viewBox} preserveAspectRatio="none" aria-hidden="true">
                  <line className={styles.routeHalo} x1={routeMap.origin.x} y1={routeMap.origin.y} x2={routeMap.destination.x} y2={routeMap.destination.y} />
                  <line className={styles.routeTrack} x1={routeMap.origin.x} y1={routeMap.origin.y} x2={routeMap.destination.x} y2={routeMap.destination.y} />
                  <circle className={styles.routeDot} cx={routeMap.origin.x} cy={routeMap.origin.y} r="5.8" />
                  <circle className={styles.routeDot} cx={routeMap.destination.x} cy={routeMap.destination.y} r="5.8" />
                </svg>
                <div className={`${styles.mapMarker} ${styles.mapMarkerOrigin}`} style={mapPointStyle(routeMap.origin)}>
                  {routeMap.origin.code}
                </div>
                <div className={`${styles.mapMarker} ${styles.mapMarkerDestination}`} style={mapPointStyle(routeMap.destination)}>
                  {routeMap.destination.code}
                </div>
                <div className={styles.mapAttribution}>© OpenStreetMap contributors</div>
              </div>
            ) : (
              <div className={styles.mapFallbackStatic}>
                <div>
                  <strong>{cert.route.origin} → {cert.route.destination}</strong>
                  <span>{cert.route.distanceNm} NM · {cert.route.cruiseLevel}</span>
                </div>
              </div>
            )}
            <div className={styles.mapCaption}>
              <IcaoFlagBadge icao={cert.route.origin} size="sm" />
              <span>Ruta directa fija · {cert.route.distanceNm} NM · {cert.route.cruiseLevel}</span>
              <IcaoFlagBadge icao={cert.route.destination} size="sm" />
            </div>
          </div>
        </Panel>

        <Panel title="Solicitud" icon="✈">
          <div className={styles.requestGrid}>
            <section className={styles.pilotCard}>
              <small>Piloto</small>
              <strong>{data.pilot.callsign} · {data.pilot.name}</strong>
              <span>{data.pilot.rank}</span>
              <span>Este checkride aun no cobra wallet. El cobro se activara mas adelante con economia.</span>
            </section>
            <div className={styles.actions}>
              <button type="button" className={styles.actionButton}>Solicitar checkride</button>
              <Link href="/dashboard" className={styles.actionLink}>Volver al Crew Center</Link>
            </div>
          </div>
        </Panel>

        <Panel title="Regla de reintentos" icon="!">
          <ul className={styles.policyList}>
            {CHECKRIDE_FAILURE_POLICY.map((item, index) => (
              <li key={item}>
                <span className={styles.stepNumber}>{index + 1}</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </main>
  );
}
