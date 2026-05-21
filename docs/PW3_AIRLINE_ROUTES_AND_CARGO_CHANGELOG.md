# PW3 Airline Routes And Cargo Changelog

## 1. Base usada

Se trabajo sobre la base local actual de `web-3.0` en `C:\Users\lizam\Desktop\PROYECTO PATAGONIA WINGS\web-3.0`.

No se usaron parches antiguos. No se ejecuto ningun cambio contra Supabase productivo.

## 2. Archivos inspeccionados

- `scripts/pw3/run-pw3-sql-015.mjs`
- `supabase/pw3/008_aircraft_catalog_performance_seed.sql`
- `supabase/pw3/009_fleet_seed.sql`
- `docs/PW3_FLEET_AND_ROUTES_SEED.md`
- `src/lib/dispatch/neon-ops.ts`
- `src/lib/dispatch/operation-types.ts`
- `src/lib/rules/pilot-permissions.ts`
- `src/lib/crew/server-data.ts`
- `src/lib/fleet/catalog.ts`
- `src/lib/office/rank-career.ts`
- `src/app/api/routes/available/route.ts`
- `src/app/dispatch/itinerary/page.tsx`
- `src/components/dashboard/sur/SurStyleTabs.tsx`
- `src/components/dashboard/sur/tabs/DispatchTab.tsx`
- `src/components/dashboard/sur/tabs/FleetTab.tsx`
- `src/components/dashboard/sur/tabs/OfficeTab.tsx`

## 3. Archivos tocados

- `docs/PW3_AIRLINE_ROUTES_AND_CARGO_AUDIT.md`
- `docs/PW3_AIRLINE_ROUTES_AND_CARGO_CHANGELOG.md`
- `docs/PW3_AIRCRAFT_FLEET_FULL_AUDIT.md`
- `docs/exports/PW3_AIRLINE_ROUTES_NETWORK.xlsx`
- `scripts/pw3/apply-airline-routes-to-neon.mjs`
- `scripts/pw3/export-airline-routes-excel.mjs`
- `scripts/pw3/validate-airline-routes.mjs`
- `src/app/routes/page.tsx`
- `src/components/airline/AirlineRouteMap.tsx`
- `src/components/airline/AirlineRouteMap.module.css`
- `src/components/airline/RegularFlightsView.tsx`
- `src/components/airline/RegularFlightsView.module.css`
- `src/components/dashboard/sur/SurStyleTabs.tsx`
- `src/components/dashboard/sur/tabs/RegularFlightsTab.tsx`
- `src/lib/airline/catalog.json`
- `src/lib/airline/aircraft.ts`
- `src/lib/airline/airports.ts`
- `src/lib/airline/cargo-routes.ts`
- `src/lib/airline/ranks.ts`
- `src/lib/airline/route-network.ts`
- `src/lib/airline/routes.ts`
- `src/lib/dispatch/neon-ops.ts`
- `src/components/dispatch/DispatchRoomClient.tsx`

## 4. Rangos detectados

10 rangos: CADET, SECOND_OFFICER, FIRST_OFFICER, SENIOR_FIRST_OFFICER, CAPTAIN, SENIOR_CAPTAIN, TRAINING_CAPTAIN, COMMANDER, SENIOR_COMMANDER, CHIEF_PILOT.

## 5. Aeronaves detectadas

La version previa de 14 aeronaves fue reemplazada por la auditoria de flota completa.

Total final canonico: 34 aeronaves encontradas e incluidas.

Codigos: C172, BE58, C208, TBM9, B350, DHC6, ATR72, AT76, E170, E175, E190, E195, SU95, A319, A320, A20N, A321, A21N, A339, A359, B736, B737, B738, B739, B38M, B748, B772, B77F, B77W, B789, B78X, MD82, MD83, MD88.

Fuentes cruzadas:

- Neon `aircraft_models`: 34 modelos.
- `supabase/pw3/008_aircraft_catalog_performance_seed.sql`: 34 modelos.
- `src/lib/rules/pilot-permissions.ts`: aliases operacionales.
- `src/lib/training/catalog.ts`: perfiles/certificaciones en modo lectura, sin tocar Entrenamiento.
- ACARS manifest solo lectura: 37 perfiles incluidos + 3 pendientes, mapeados a 34 canonicos.

Documento de cuadre: `docs/PW3_AIRCRAFT_FLEET_FULL_AUDIT.md`.

## 6. Hubs pasajeros detectados

5 hubs: SCTE, SCIE, SCEL, SCFA, SCCI.

## 7. Hubs carga detectados

7 hubs: SCTE, SCIE, SCEL, SCFA, SCCI, SBGR, KMIA.

## 8. Rutas pasajeros agregadas

Se actualizo catalogo local con 60 rutas de pasajeros expandidas ida/vuelta usando la flota completa de 34 aeronaves:

- Escuela local: SCPF con SCTE, SCAC, SCJO, SCST, SCVD.
- Regional: SCTE con SCVD, SCJO, SCST, SCAC; SCFA con SCDA y SCAR; SCDA con SCAR.
- Interregional/Patagonia: SCTE con SCIE, SCBA y SCCI; SCIE con SCFA.
- Nacional: SCEL con SCTE, SCIE, SCFA, SCDA, SCAR, SCBA y SCCI.
- Internacional regional: SCEL con SAEZ, SUMU, SPIM y SBGR.
- Largo radio: SCEL con SCIP, KMIA y KJFK.

## 9. Rutas carga agregadas

Se actualizo catalogo local con 28 rutas de carga expandidas ida/vuelta usando solo aeronaves con `supportsCargo=true`:

- Carga regional: SCTE con SCVD, SCST y SCBA.
- Carga interregional: SCTE con SCCI y SCIE.
- Carga nacional: SCEL con SCTE, SCIE, SCFA, SCDA, SCAR y SCCI.
- Carga internacional: SCEL con SAEZ, SBGR y KMIA.

## 10. Rutas corregidas

La correccion principal fue convertir la red a pares ida/vuelta. La semilla `015` tenia rutas de escuela y carga en una sola direccion. La red local nueva valida retorno para todos los registros.

Tambien se ajusto Lima a `SPIM`, porque Neon tiene el aeropuerto como `SPIM` y no como `SPJC`.

## 11. Rutas eliminadas

No se eliminaron datos ni seeds existentes. En Neon no se borraron rutas: el script idempotente activo las rutas `PW-*` nuevas y desactivo rutas oficiales antiguas del mismo set operacional que quedaban fuera del catalogo nuevo, sin `delete`.

## 12. Reglas de autonomia aplicadas

`src/lib/airline/route-network.ts` calcula distancia por Haversine y filtra `allowedAircraft` usando `distanceNm <= aircraft.rangeNm`.

La validacion reporta 0 rutas fuera de autonomia.

## 13. Validacion de retornos

`node scripts/pw3/validate-airline-routes.mjs`:

- Rutas sin retorno: 0.
- Aeropuertos sin salida: 0.
- Aeropuertos sin llegada: 0.
- Aeronaves esperadas/detectadas: 34/34.
- Aeronaves referenciadas por rutas: 34.

## 14. Validacion de carga

`node scripts/pw3/validate-airline-routes.mjs`:

- Rutas de carga sin aeronave cargo-compatible: 0.
- `flightType` invalido: 0.
- Rutas checkride mezcladas: 0.
- Aeronaves inexistentes referenciadas: 0.
- Aeronaves sin cargo con capacidad positiva: 0.
- Rutas con aeronaves no autorizables por rango: 0.

## 15. Validacion de build

Validaciones ejecutadas:

- `node scripts/pw3/validate-airline-routes.mjs`: OK.
- `npx tsc --noEmit`: OK.
- `npm run lint`: OK con warnings preexistentes.
- `npm run build`: OK.
- `node scripts/pw3/export-airline-routes-excel.mjs`: OK.
- `node scripts/pw3/apply-airline-routes-to-neon.mjs`: OK contra `DATABASE_URL`.

## 16. Que NO se toco

- No se toco ACARS.
- No se toco Supabase productivo.
- No se toco economia real, wallet, salary, ledger ni finalize.
- No se toco `globals.css`.
- No se tocaron checkrides, licencias ni certificaciones.
- No se modifico landing.
- No se cambio iconografia global.
- No se redisenaron Oficina, Entrenamiento ni Flota.
- No se modificaron `OfficeTab`, `TrainingTab` ni paginas de certificaciones en este bloque.

## 17. Pagina Vuelos Regulares

Se creo `src/app/routes/page.tsx` y se integro un tab `Vuelos Regulares` en `src/components/dashboard/sur/SurStyleTabs.tsx`.

Componentes nuevos:

- `src/components/airline/RegularFlightsView.tsx`
- `src/components/airline/AirlineRouteMap.tsx`

El mapa usa SVG estatico con proyeccion simple lat/lon. No usa iframe de OpenStreetMap.

La vista principal muestra solo `itinerary` y `cargo`. Las rutas `training` / `escuela_local` quedan en una seccion separada y marcada como escuela/local.

## 18. Neon y Excel

Se creo `scripts/pw3/apply-airline-routes-to-neon.mjs` y se ejecuto contra Neon via `DATABASE_URL`.

Resultado Neon:

- Rutas activas `PW-*`: 88.
- Rutas pasajeros `PW-PAX-*`: 60.
- Rutas carga `PW-CGO-*`: 28.
- Rutas sin retorno: 0.
- `CARGO_OFFICIAL`: activo con `affects_economy = false`.

Se creo `scripts/pw3/export-airline-routes-excel.mjs` y el archivo final quedo en:

- `docs/exports/PW3_AIRLINE_ROUTES_NETWORK.xlsx`

Hojas del Excel:

- `Resumen`
- `Rangos`
- `Aeronaves`
- `Aeropuertos`
- `Rutas pasajeros`
- `Rutas carga`
- `Rutas consolidado`
- `Validaciones`
- `Rutas escuela local`
- `Aeronaves Neon`
- `Neon resumen`

## 19. Pendientes reales

- La pagina muestra el catalogo operacional local; el despacho en vivo ya tiene `network_routes` actualizado con las rutas `PW-*`.
- No se hizo commit/push porque el repo local tiene un estado previo donde casi todo `src/`, `scripts/` y `docs/` esta sin trackear, y los archivos trackeados modificados incluyen cambios fuera de alcance como `globals.css`, layout y landing. Subir solo este bloque dejaria un commit parcial; subir todo mezclaria trabajo no autorizado.
