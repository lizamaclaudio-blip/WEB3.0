# PW3 Airline Routes And Cargo Audit

## Base auditada

Fecha local: 2026-05-17.

Base inspeccionada: `web-3.0` en `C:\Users\lizam\Desktop\PROYECTO PATAGONIA WINGS\web-3.0`.

Archivos revisados antes de modificar:

- `scripts/pw3/run-pw3-sql-015.mjs`
- `supabase/pw3/008_aircraft_catalog_performance_seed.sql`
- `supabase/pw3/009_fleet_seed.sql`
- `scripts/pw3/validate-pw3-master.mjs`
- `src/lib/dispatch/neon-ops.ts`
- `src/lib/dispatch/operation-types.ts`
- `src/lib/rules/pilot-permissions.ts`
- `src/lib/crew/server-data.ts`
- `src/lib/fleet/catalog.ts`
- `src/lib/office/rank-career.ts`
- `src/app/api/routes/available/route.ts`
- `src/components/dispatch/DispatchRoomClient.tsx`
- `src/components/dashboard/sur/SurStyleTabs.tsx`
- `src/components/dashboard/sur/tabs/OfficeTab.tsx`
- `src/components/dashboard/sur/tabs/FleetTab.tsx`
- `src/components/dashboard/sur/tabs/DispatchTab.tsx`
- `src/app/dispatch/itinerary/page.tsx`
- `docs/PW3_FLEET_AND_ROUTES_SEED.md`

No se inspecciono ni se modifico ACARS. No se conecto contra Supabase productivo.

## 1. Rangos encontrados

La base local expone la jerarquia desde `src/lib/office/rank-career.ts` y la semilla `015`:

| Nivel | Rango |
| --- | --- |
| 1 | CADET |
| 2 | SECOND_OFFICER |
| 3 | FIRST_OFFICER |
| 4 | SENIOR_FIRST_OFFICER |
| 5 | CAPTAIN |
| 6 | SENIOR_CAPTAIN |
| 7 | TRAINING_CAPTAIN |
| 8 | COMMANDER |
| 9 | SENIOR_COMMANDER |
| 10 | CHIEF_PILOT |

## 2. Aeronaves encontradas

La version parcial de 14 aeronaves fue reemplazada por una auditoria completa de flota historica/operacional.

Fuentes principales: `supabase/pw3/008_aircraft_catalog_performance_seed.sql`, Neon `aircraft_models`, `src/lib/rules/pilot-permissions.ts`, `src/lib/training/catalog.ts` y el manifest ACARS en modo solo lectura.

Resultado: 34 aeronaves canonicas encontradas y 34 incluidas en la red.

ACARS reporta 37 perfiles incluidos y 3 pendientes, pero esos perfiles son variantes/addons que se reducen a los mismos 34 codigos canonicos. Por eso el total final correcto para rutas es 34 y no 39.

Detalle completo de aliases/fuentes: `docs/PW3_AIRCRAFT_FLEET_FULL_AUDIT.md`.

| Codigo | Nombre | Rango NM | Categoria local | Pax | Cargo kg | Carga |
| --- | --- | ---: | --- | ---: | ---: | --- |
| C172 | Cessna 172 Skyhawk | 640 | single_engine | 4 | N/D | No |
| BE58 | Beechcraft Baron 58 | 950 | piston_twin | 6 | N/D | No |
| C208 | Cessna Grand Caravan | 900 | cargo_turboprop | 12 | 1600 | Si |
| TBM9 | Daher TBM 930/940 | 1500 | turboprop_single | 6 | N/D | No |
| B350 | Beechcraft King Air 350 | 1500 | turboprop_twin | 10 | 1300 | Si |
| DHC6 | De Havilland DHC-6 Twin Otter | 700 | turboprop_twin | 19 | 1800 | Si |
| ATR72 | ATR 72 | 820 | regional_turboprop | 72 | 7500 | Si |
| AT76 | ATR 72-600 | 850 | regional_turboprop | 76 | 7800 | Si |
| E170 | Embraer E170 | 2100 | regional_jet | 76 | 8000 | Si |
| E175 | Embraer E175 | 2200 | regional_jet | 88 | 9000 | Si |
| E190 | Embraer E190 | 2400 | regional_jet | 100 | 11000 | Si |
| E195 | Embraer E195 | 2300 | regional_jet | 120 | 12000 | Si |
| SU95 | Sukhoi Superjet 95 | 1600 | regional_jet | 95 | 10000 | Si |
| A319 | Airbus A319 | 3700 | narrow_body | 140 | 14000 | Si |
| A320 | Airbus A320 | 3300 | narrow_body | 180 | 16000 | Si |
| A20N | Airbus A320neo | 3500 | long_range_narrow_body | 186 | 16000 | Si |
| A321 | Airbus A321 | 3200 | narrow_body | 220 | 19000 | Si |
| A21N | Airbus A321neo | 4000 | long_range_narrow_body | 220 | 20000 | Si |
| A339 | Airbus A330-900neo | 7200 | wide_body | 300 | 45000 | Si |
| A359 | Airbus A350-900 | 8100 | wide_body | 325 | 50000 | Si |
| B736 | Boeing 737-600 | 3000 | narrow_body | 130 | 13000 | Si |
| B737 | Boeing 737-700 | 3300 | narrow_body | 149 | 15000 | Si |
| B738 | Boeing 737-800 | 3000 | narrow_body | 189 | 18000 | Si |
| B739 | Boeing 737-900 | 3200 | narrow_body | 215 | 19000 | Si |
| B38M | Boeing 737 MAX 8 | 3500 | long_range_narrow_body | 189 | 19000 | Si |
| B748 | Boeing 747-8F | 4300 | freighter | 0 | 137000 | Si |
| B772 | Boeing 777-200ER | 7000 | wide_body | 314 | 65000 | Si |
| B77F | Boeing 777F | 4900 | freighter | 0 | 102000 | Si |
| B77W | Boeing 777-300ER | 7300 | wide_body | 396 | 70000 | Si |
| B789 | Boeing 787-9 | 7600 | wide_body | 290 | 45000 | Si |
| B78X | Boeing 787-10 Dreamliner | 6400 | wide_body | 330 | 50000 | Si |
| MD82 | McDonnell Douglas MD-82 | 2000 | narrow_body | 155 | 14000 | Si |
| MD83 | McDonnell Douglas MD-83 | 2400 | narrow_body | 165 | 15000 | Si |
| MD88 | McDonnell Douglas MD-88 | 2200 | narrow_body | 149 | 14000 | Si |

## 3. Aeronaves permitidas por rango

| Rango | Aeronaves |
| --- | --- |
| CADET | C172, BE58, C208 |
| SECOND_OFFICER | C172, BE58, C208, TBM9, B350 |
| FIRST_OFFICER | C172, BE58, C208, TBM9, B350, DHC6, ATR72, AT76, E170, E175 |
| SENIOR_FIRST_OFFICER | C172, BE58, C208, TBM9, B350, DHC6, ATR72, AT76, E170, E175, E190, E195, SU95, A319, B736 |
| CAPTAIN | C172, BE58, C208, TBM9, B350, DHC6, ATR72, AT76, E170, E175, E190, E195, SU95, A319, A320, A20N, A321, A21N, B736, B737, B738, B739, B38M, MD82, MD83, MD88 |
| SENIOR_CAPTAIN | C172, BE58, C208, TBM9, B350, DHC6, ATR72, AT76, E170, E175, E190, E195, SU95, A319, A320, A20N, A321, A21N, B736, B737, B738, B739, B38M, MD82, MD83, MD88, A339, B789, B78X |
| TRAINING_CAPTAIN | C172, BE58, C208, TBM9, B350, DHC6, ATR72, AT76, E170, E175, E190, E195, SU95, A319, A320, A20N, A321, A21N, B736, B737, B738, B739, B38M, MD82, MD83, MD88, A339, B789, B78X |
| COMMANDER | C172, BE58, C208, TBM9, B350, DHC6, ATR72, AT76, E170, E175, E190, E195, SU95, A319, A320, A20N, A321, A21N, A339, A359, B736, B737, B738, B739, B38M, B748, B772, B77F, B77W, B789, B78X, MD82, MD83, MD88 |
| SENIOR_COMMANDER | C172, BE58, C208, TBM9, B350, DHC6, ATR72, AT76, E170, E175, E190, E195, SU95, A319, A320, A20N, A321, A21N, A339, A359, B736, B737, B738, B739, B38M, B748, B772, B77F, B77W, B789, B78X, MD82, MD83, MD88 |
| CHIEF_PILOT | C172, BE58, C208, TBM9, B350, DHC6, ATR72, AT76, E170, E175, E190, E195, SU95, A319, A320, A20N, A321, A21N, A339, A359, B736, B737, B738, B739, B38M, B748, B772, B77F, B77W, B789, B78X, MD82, MD83, MD88 |

## 4. Autonomia y categoria operacional

La autonomia se valida contra `rangeNm` del catalogo local. La red final no asigna una aeronave a una ruta si `distanceNm > rangeNm`.

Categorias operacionales locales:

- `escuela_local`
- `regional`
- `interregional`
- `patagonia`
- `nacional`
- `internacional_regional`
- `largo_radio`
- `carga_regional`
- `carga_interregional`
- `carga_nacional`
- `carga_internacional`

## 5. Hubs de pasajeros encontrados

| ICAO | Ciudad | Categoria |
| --- | --- | --- |
| SCTE | Puerto Montt | mixed_hub |
| SCIE | Concepcion | mixed_hub |
| SCEL | Santiago | main_hub |
| SCFA | Antofagasta | mixed_hub |
| SCCI | Punta Arenas | mixed_hub |

## 6. Hubs de carga encontrados/propuestos desde datos existentes

| ICAO | Ciudad | Categoria |
| --- | --- | --- |
| SCTE | Puerto Montt | cargo_hub |
| SCIE | Concepcion | cargo_hub |
| SCEL | Santiago | cargo_hub |
| SCFA | Antofagasta | cargo_hub |
| SCCI | Punta Arenas | cargo_hub |
| SBGR | Sao Paulo | cargo_hub |
| KMIA | Miami | cargo_hub |

## 7. Aeropuertos no hub encontrados

SCPF, SCAC, SCJO, SCST, SCVD, SCDA, SCAR, SCBA, SCIP, SAEZ, SPIM, SUMU, KJFK.

## 8. Categoria de cada aeropuerto

| ICAO | Categoria aeropuerto | Hub pasajeros | Hub carga |
| --- | --- | --- | --- |
| SCPF | local | No | No |
| SCTE | regional | Si | Si |
| SCAC | local | No | No |
| SCJO | regional | No | No |
| SCST | remote | No | No |
| SCVD | regional | No | No |
| SCIE | interregional | Si | Si |
| SCEL | international | Si | Si |
| SCFA | national | Si | Si |
| SCDA | national | No | No |
| SCAR | national | No | No |
| SCBA | remote | No | No |
| SCCI | patagonia_hub | Si | Si |
| SCIP | remote | No | No |
| SAEZ | international | No | No |
| SBGR | international | No | Si |
| SPIM | international | No | No |
| SUMU | international | No | No |
| KMIA | international | No | Si |
| KJFK | international | No | No |

## 9. Rutas actuales de pasajeros antes del cambio

La semilla `015` traia rutas de escuela, regionales, Patagonia, nacionales y oceanicas. Se encontraron estas rutas de pasajeros:

- SCPF -> SCPF
- SCPF -> SCTE
- SCPF -> SCAC
- SCPF -> SCJO
- SCPF -> SCST
- SCPF -> SCVD
- SCTE -> SCEL / SCEL -> SCTE
- SCTE -> SCIE / SCIE -> SCTE
- SCTE -> SCBA / SCBA -> SCTE
- SCTE -> SCCI / SCCI -> SCTE
- SCEL -> SCIE / SCIE -> SCEL
- SCEL -> SCFA / SCFA -> SCEL
- SCEL -> SCDA / SCDA -> SCEL
- SCEL -> SCIP / SCIP -> SCEL

## 10. Rutas actuales de carga antes del cambio

La semilla `015` ya tenia concepto `CARGO_OFFICIAL`, pero las rutas de carga estaban en una sola direccion:

- SCEL -> SCTE
- SCTE -> SCBA
- SCTE -> SCCI
- SCEL -> SCFA
- SCEL -> SCDA
- SCEL -> SCIP

## 11. Rutas incompletas o sin retorno detectadas

Antes de crear el catalogo local, estas rutas podian dejar al piloto sin vuelta directa:

- Escuela: SCPF -> SCTE, SCPF -> SCAC, SCPF -> SCJO, SCPF -> SCST, SCPF -> SCVD.
- Carga: SCEL -> SCTE, SCTE -> SCBA, SCTE -> SCCI, SCEL -> SCFA, SCEL -> SCDA, SCEL -> SCIP.

La red local nueva crea siempre pares ida/vuelta.

## 12. Aeropuertos que reciben vuelos pero no tienen salida

Antes del cambio, los destinos de escuela SCAC, SCJO, SCST y SCVD recibian rutas desde SCPF sin retorno en la semilla base. En carga, SCBA, SCCI, SCFA, SCDA y SCIP recibian carga sin retorno directo dentro del bloque `015`.

En la red nueva: 0 aeropuertos sin salida.

## 13. Aeropuertos que pueden dejar atrapado al piloto

Riesgo original: SCAC, SCJO, SCST, SCVD, SCBA, SCCI, SCFA, SCDA y SCIP por rutas de una sola direccion en la semilla.

Resultado nuevo: el validador local reporta 0 rutas sin retorno y 0 aeropuertos sin salida.

## 14. Aeronaves asignadas a rutas fuera de autonomia

No se encontro una matriz completa de aeronaves por ruta en la semilla anterior; el despacho filtra por autonomia en `src/lib/dispatch/neon-ops.ts`.

En la red local nueva, `validateRouteNetwork()` reporta 0 rutas fuera de autonomia.

## 15. Categorias de vuelo existentes

Encontradas en codigo/semilla:

- `SCHOOL_OFFICIAL_ROUTE`
- `COMMERCIAL_OFFICIAL_ROUTE`
- `CHARTER_OFFICIAL`
- `CARGO_OFFICIAL`
- `TRAINING_FREE`
- `AIRCRAFT_TRANSFER`
- `PILOT_REPOSITION`
- `EVENT_TOUR`

La UI antigua `OperationTypeStep` ya contemplaba `cargo` como opcion conceptual.

## 16. Tipo de vuelo CARGA

Existe conceptualmente como `CARGO_OFFICIAL` en `src/lib/dispatch/operation-types.ts` y en `scripts/pw3/run-pw3-sql-015.mjs`.

Se agrego soporte local normalizado como `flightType: "cargo"` en la red estatica nueva y se dejo `CARGO_OFFICIAL` activo en Neon con `affects_economy = false`, sin tocar economia, wallet, salary, ledger ni finalize.

## 17. Red completa recomendada/creada

La red local nueva queda en:

- 20 aeropuertos.
- 34 modelos de aeronave canonicos encontrados e incluidos en la red.
- 10 rangos.
- 60 rutas de pasajeros expandidas ida/vuelta, de las cuales 50 son itinerario regular y 10 son escuela/local separadas visualmente.
- 50 rutas de pasajeros regulares visibles en la seccion principal de `Vuelos Regulares`.
- 10 rutas de escuela/local separadas visualmente.
- 28 rutas de carga expandidas ida/vuelta.
- 5 hubs de pasajeros.
- 7 hubs de carga.
- 0 rutas sin retorno.
- 0 aeropuertos sin salida.
- 0 rutas sin aeronaves compatibles.
- 0 rutas fuera de autonomia.
- 0 rutas de carga sin aeronave cargo-compatible.

Detalle completo para revision operacional: `docs/exports/PW3_AIRLINE_ROUTES_NETWORK.xlsx`.
