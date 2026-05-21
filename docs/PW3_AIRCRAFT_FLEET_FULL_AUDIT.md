# PW3 Aircraft Fleet Full Audit

## Base auditada

Fecha local: 2026-05-17.

Base principal: `web-3.0` en `C:\Users\lizam\Desktop\PROYECTO PATAGONIA WINGS\web-3.0`.

Fuentes revisadas:

- `src/lib/airline/catalog.json`
- `src/lib/rules/pilot-permissions.ts`
- `src/lib/training/catalog.ts`
- `src/lib/fleet/catalog.ts`
- `scripts/pw3/run-pw3-sql-015.mjs`
- `supabase/pw3/008_aircraft_catalog_performance_seed.sql`
- `supabase/pw3/009_fleet_seed.sql`
- Neon `aircraft_models`, `aircraft_performance_profiles`, `fleet_aircraft`, `rank_aircraft_permissions`
- Solo lectura ACARS: `ACARS NUEVO/PatagoniaWings.Acars.Master/AircraftProfiles/manifest_patagonia_profiles.json`
- Repo anterior disponible: `PatagoniaWingsACARS/PATAGONIA WINGS WEB 2.0/patagonia-wings-site` para referencias de flota/economia, sin modificarlo.

## Resultado de cuadre

- Total canonico final encontrado: 34 aeronaves.
- Total incluido en red: 34 aeronaves.
- Total inicial parcial reemplazado: 14 aeronaves.
- Neon `aircraft_models`: 34 modelos.
- ACARS `included_profiles`: 37 perfiles/addons, reducidos a 34 codigos canonicos porque hay variantes duplicadas por addon.
- ACARS `pending_profiles`: 3 perfiles pendientes (B350_BLACKSQUARE, BE58_BLACKSQUARE_PRO, TBM9_BLACKSQUARE); no agregan codigos canonicos nuevos.
- Por eso el resultado final es 34 y no 39: el numero 39 mezcla perfiles/addons con aeronaves canonicas.

## Tabla completa

| Codigo canonico | Alias encontrados | Nombre real completo | Categoria | Autonomia NM | Pasajeros | Carga | Carga kg | Rango minimo | Rangos que pueden volarla | Fuente | Incluida red | Motivo |
| --- | --- | --- | --- | ---: | ---: | --- | ---: | --- | --- | --- | --- | --- |
| C172 | C172, C172_MSFS, C172_ASOBO | Cessna 172 Skyhawk | single_engine | 640 | 4 | No | N/D | CADET | CADET, SECOND_OFFICER, FIRST_OFFICER, SENIOR_FIRST_OFFICER, CAPTAIN, SENIOR_CAPTAIN, TRAINING_CAPTAIN, COMMANDER, SENIOR_COMMANDER, CHIEF_PILOT | run-pw3-sql-015; supabase-008; Neon; ACARS manifest | Si | Incluida en red completa |
| BE58 | BE58, BE58_MSFS, BE58_BLACKSQUARE, BE58_BS_PRO, BE58_BLACKSQUARE_PRO | Beechcraft Baron 58 | piston_twin | 950 | 6 | No | N/D | CADET | CADET, SECOND_OFFICER, FIRST_OFFICER, SENIOR_FIRST_OFFICER, CAPTAIN, SENIOR_CAPTAIN, TRAINING_CAPTAIN, COMMANDER, SENIOR_COMMANDER, CHIEF_PILOT | run-pw3-sql-015; supabase-008; Neon; ACARS manifest | Si | Incluida en red completa |
| C208 | C208, C208_MSFS, C208_BLACKSQUARE | Cessna Grand Caravan | cargo_turboprop | 900 | 12 | Si | 1600 | CADET | CADET, SECOND_OFFICER, FIRST_OFFICER, SENIOR_FIRST_OFFICER, CAPTAIN, SENIOR_CAPTAIN, TRAINING_CAPTAIN, COMMANDER, SENIOR_COMMANDER, CHIEF_PILOT | run-pw3-sql-015; supabase-008; Neon; ACARS manifest | Si | Incluida en red completa |
| TBM9 | TBM9, TBM9_MSFS, TBM8, TBM8_BLACKSQUARE, TBM9_BLACKSQUARE | Daher TBM 930/940 | turboprop_single | 1500 | 6 | No | N/D | SECOND_OFFICER | SECOND_OFFICER, FIRST_OFFICER, SENIOR_FIRST_OFFICER, CAPTAIN, SENIOR_CAPTAIN, TRAINING_CAPTAIN, COMMANDER, SENIOR_COMMANDER, CHIEF_PILOT | run-pw3-sql-015; supabase-008; Neon; ACARS manifest; training catalog | Si | Incluida en red completa |
| B350 | B350, B350_MSFS, B350_BLACKSQUARE | Beechcraft King Air 350 | turboprop_twin | 1500 | 10 | Si | 1300 | SECOND_OFFICER | SECOND_OFFICER, FIRST_OFFICER, SENIOR_FIRST_OFFICER, CAPTAIN, SENIOR_CAPTAIN, TRAINING_CAPTAIN, COMMANDER, SENIOR_COMMANDER, CHIEF_PILOT | run-pw3-sql-015; supabase-008; Neon; ACARS manifest | Si | Incluida en red completa |
| DHC6 | DHC6, DHC6_AEROSOFT | De Havilland DHC-6 Twin Otter | turboprop_twin | 700 | 19 | Si | 1800 | FIRST_OFFICER | FIRST_OFFICER, SENIOR_FIRST_OFFICER, CAPTAIN, SENIOR_CAPTAIN, TRAINING_CAPTAIN, COMMANDER, SENIOR_COMMANDER, CHIEF_PILOT | supabase-008; Neon; ACARS manifest | Si | Incluida en red completa |
| ATR72 | ATR72, AT76, ATR72_MSFS | ATR 72 | regional_turboprop | 820 | 72 | Si | 7500 | FIRST_OFFICER | FIRST_OFFICER, SENIOR_FIRST_OFFICER, CAPTAIN, SENIOR_CAPTAIN, TRAINING_CAPTAIN, COMMANDER, SENIOR_COMMANDER, CHIEF_PILOT | supabase-008; Neon; training catalog; ACARS manifest | Si | Incluida en red completa |
| AT76 | AT76, ATR72, ATR72_MSFS | ATR 72-600 | regional_turboprop | 850 | 76 | Si | 7800 | FIRST_OFFICER | FIRST_OFFICER, SENIOR_FIRST_OFFICER, CAPTAIN, SENIOR_CAPTAIN, TRAINING_CAPTAIN, COMMANDER, SENIOR_COMMANDER, CHIEF_PILOT | run-pw3-sql-015; supabase-008; Neon; training catalog | Si | Incluida en red completa |
| E170 | E170, E170_FLIGHTSIM | Embraer E170 | regional_jet | 2100 | 76 | Si | 8000 | FIRST_OFFICER | FIRST_OFFICER, SENIOR_FIRST_OFFICER, CAPTAIN, SENIOR_CAPTAIN, TRAINING_CAPTAIN, COMMANDER, SENIOR_COMMANDER, CHIEF_PILOT | supabase-008; Neon; ACARS manifest | Si | Incluida en red completa |
| E175 | E175, E175_FLIGHTSIM | Embraer E175 | regional_jet | 2200 | 88 | Si | 9000 | FIRST_OFFICER | FIRST_OFFICER, SENIOR_FIRST_OFFICER, CAPTAIN, SENIOR_CAPTAIN, TRAINING_CAPTAIN, COMMANDER, SENIOR_COMMANDER, CHIEF_PILOT | supabase-008; Neon; training catalog; ACARS manifest | Si | Incluida en red completa |
| E190 | E190, E190_FLIGHTSIM | Embraer E190 | regional_jet | 2400 | 100 | Si | 11000 | SENIOR_FIRST_OFFICER | SENIOR_FIRST_OFFICER, CAPTAIN, SENIOR_CAPTAIN, TRAINING_CAPTAIN, COMMANDER, SENIOR_COMMANDER, CHIEF_PILOT | supabase-008; Neon; training catalog; ACARS manifest | Si | Incluida en red completa |
| E195 | E195, E195_FLIGHTSIM | Embraer E195 | regional_jet | 2300 | 120 | Si | 12000 | SENIOR_FIRST_OFFICER | SENIOR_FIRST_OFFICER, CAPTAIN, SENIOR_CAPTAIN, TRAINING_CAPTAIN, COMMANDER, SENIOR_COMMANDER, CHIEF_PILOT | supabase-008; Neon; training catalog; ACARS manifest | Si | Incluida en red completa |
| SU95 | SU95, SU95_HEADWIND | Sukhoi Superjet 95 | regional_jet | 1600 | 95 | Si | 10000 | SENIOR_FIRST_OFFICER | SENIOR_FIRST_OFFICER, CAPTAIN, SENIOR_CAPTAIN, TRAINING_CAPTAIN, COMMANDER, SENIOR_COMMANDER, CHIEF_PILOT | supabase-008; Neon; ACARS manifest | Si | Incluida en red completa |
| A319 | A319, A319_FENIX, A319_LATINVFR | Airbus A319 | narrow_body | 3700 | 140 | Si | 14000 | SENIOR_FIRST_OFFICER | SENIOR_FIRST_OFFICER, CAPTAIN, SENIOR_CAPTAIN, TRAINING_CAPTAIN, COMMANDER, SENIOR_COMMANDER, CHIEF_PILOT | run-pw3-sql-015; supabase-008; Neon; training catalog; ACARS manifest | Si | Incluida en red completa |
| A320 | A320, A320_FENIX, A320_LATINVFR | Airbus A320 | narrow_body | 3300 | 180 | Si | 16000 | CAPTAIN | CAPTAIN, SENIOR_CAPTAIN, TRAINING_CAPTAIN, COMMANDER, SENIOR_COMMANDER, CHIEF_PILOT | run-pw3-sql-015; supabase-008; Neon; training catalog; ACARS manifest | Si | Incluida en red completa |
| A20N | A20N, A20N_FBW | Airbus A320neo | long_range_narrow_body | 3500 | 186 | Si | 16000 | CAPTAIN | CAPTAIN, SENIOR_CAPTAIN, TRAINING_CAPTAIN, COMMANDER, SENIOR_COMMANDER, CHIEF_PILOT | run-pw3-sql-015; supabase-008; Neon; training catalog; ACARS manifest | Si | Incluida en red completa |
| A321 | A321, A321_FENIX | Airbus A321 | narrow_body | 3200 | 220 | Si | 19000 | CAPTAIN | CAPTAIN, SENIOR_CAPTAIN, TRAINING_CAPTAIN, COMMANDER, SENIOR_COMMANDER, CHIEF_PILOT | supabase-008; Neon; training catalog; ACARS manifest | Si | Incluida en red completa |
| A21N | A21N, A21N_LATINVFR | Airbus A321neo | long_range_narrow_body | 4000 | 220 | Si | 20000 | CAPTAIN | CAPTAIN, SENIOR_CAPTAIN, TRAINING_CAPTAIN, COMMANDER, SENIOR_COMMANDER, CHIEF_PILOT | supabase-008; Neon; training catalog; ACARS manifest | Si | Incluida en red completa |
| A339 | A339, A339_HEADWIND | Airbus A330-900neo | wide_body | 7200 | 300 | Si | 45000 | SENIOR_CAPTAIN | SENIOR_CAPTAIN, TRAINING_CAPTAIN, COMMANDER, SENIOR_COMMANDER, CHIEF_PILOT | supabase-008; Neon; training catalog; ACARS manifest | Si | Incluida en red completa |
| A359 | A359, A359_INIBUILDS | Airbus A350-900 | wide_body | 8100 | 325 | Si | 50000 | COMMANDER | COMMANDER, SENIOR_COMMANDER, CHIEF_PILOT | supabase-008; Neon; training catalog; ACARS manifest | Si | Incluida en red completa |
| B736 | B736, B736_PMDG | Boeing 737-600 | narrow_body | 3000 | 130 | Si | 13000 | SENIOR_FIRST_OFFICER | SENIOR_FIRST_OFFICER, CAPTAIN, SENIOR_CAPTAIN, TRAINING_CAPTAIN, COMMANDER, SENIOR_COMMANDER, CHIEF_PILOT | run-pw3-sql-015; supabase-008; Neon; training catalog; ACARS manifest | Si | Incluida en red completa |
| B737 | B737, B737_PMDG | Boeing 737-700 | narrow_body | 3300 | 149 | Si | 15000 | CAPTAIN | CAPTAIN, SENIOR_CAPTAIN, TRAINING_CAPTAIN, COMMANDER, SENIOR_COMMANDER, CHIEF_PILOT | run-pw3-sql-015; supabase-008; Neon; training catalog; ACARS manifest | Si | Incluida en red completa |
| B738 | B738, B738_PMDG | Boeing 737-800 | narrow_body | 3000 | 189 | Si | 18000 | CAPTAIN | CAPTAIN, SENIOR_CAPTAIN, TRAINING_CAPTAIN, COMMANDER, SENIOR_COMMANDER, CHIEF_PILOT | supabase-008; Neon; training catalog; ACARS manifest | Si | Incluida en red completa |
| B739 | B739, B739_PMDG | Boeing 737-900 | narrow_body | 3200 | 215 | Si | 19000 | CAPTAIN | CAPTAIN, SENIOR_CAPTAIN, TRAINING_CAPTAIN, COMMANDER, SENIOR_COMMANDER, CHIEF_PILOT | run-pw3-sql-015; supabase-008; Neon; training catalog; ACARS manifest | Si | Incluida en red completa |
| B38M | B38M, B38M_IFLY | Boeing 737 MAX 8 | long_range_narrow_body | 3500 | 189 | Si | 19000 | CAPTAIN | CAPTAIN, SENIOR_CAPTAIN, TRAINING_CAPTAIN, COMMANDER, SENIOR_COMMANDER, CHIEF_PILOT | supabase-008; Neon; training catalog; ACARS manifest | Si | Incluida en red completa |
| B748 | B748, B748_SALTY | Boeing 747-8F | freighter | 4300 | 0 | Si | 137000 | COMMANDER | COMMANDER, SENIOR_COMMANDER, CHIEF_PILOT | supabase-008; Neon; ACARS manifest | Si | Incluida en red completa |
| B772 | B772, B772_PMDG | Boeing 777-200ER | wide_body | 7000 | 314 | Si | 65000 | COMMANDER | COMMANDER, SENIOR_COMMANDER, CHIEF_PILOT | supabase-008; Neon; training catalog; ACARS manifest | Si | Incluida en red completa |
| B77F | B77F, B77F_PMDG | Boeing 777F | freighter | 4900 | 0 | Si | 102000 | COMMANDER | COMMANDER, SENIOR_COMMANDER, CHIEF_PILOT | supabase-008; Neon; ACARS manifest | Si | Incluida en red completa |
| B77W | B77W, B77W_PMDG | Boeing 777-300ER | wide_body | 7300 | 396 | Si | 70000 | COMMANDER | COMMANDER, SENIOR_COMMANDER, CHIEF_PILOT | supabase-008; Neon; training catalog; ACARS manifest | Si | Incluida en red completa |
| B789 | B789, B789_HORIZONS | Boeing 787-9 | wide_body | 7600 | 290 | Si | 45000 | SENIOR_CAPTAIN | SENIOR_CAPTAIN, TRAINING_CAPTAIN, COMMANDER, SENIOR_COMMANDER, CHIEF_PILOT | supabase-008; Neon; training catalog; ACARS manifest | Si | Incluida en red completa |
| B78X | B78X, B78X_MSFS | Boeing 787-10 Dreamliner | wide_body | 6400 | 330 | Si | 50000 | SENIOR_CAPTAIN | SENIOR_CAPTAIN, TRAINING_CAPTAIN, COMMANDER, SENIOR_COMMANDER, CHIEF_PILOT | run-pw3-sql-015; supabase-008; Neon; training catalog; ACARS manifest | Si | Incluida en red completa |
| MD82 | MD82, MD82_MADDOG | McDonnell Douglas MD-82 | narrow_body | 2000 | 155 | Si | 14000 | CAPTAIN | CAPTAIN, SENIOR_CAPTAIN, TRAINING_CAPTAIN, COMMANDER, SENIOR_COMMANDER, CHIEF_PILOT | supabase-008; Neon; training catalog; ACARS manifest | Si | Incluida en red completa |
| MD83 | MD83, MD83_MADDOG | McDonnell Douglas MD-83 | narrow_body | 2400 | 165 | Si | 15000 | CAPTAIN | CAPTAIN, SENIOR_CAPTAIN, TRAINING_CAPTAIN, COMMANDER, SENIOR_COMMANDER, CHIEF_PILOT | supabase-008; Neon; training catalog; ACARS manifest | Si | Incluida en red completa |
| MD88 | MD88, MD88_MADDOG | McDonnell Douglas MD-88 | narrow_body | 2200 | 149 | Si | 14000 | CAPTAIN | CAPTAIN, SENIOR_CAPTAIN, TRAINING_CAPTAIN, COMMANDER, SENIOR_COMMANDER, CHIEF_PILOT | run-pw3-sql-015; supabase-008; Neon; training catalog; ACARS manifest | Si | Incluida en red completa |

## Reglas aplicadas

- No se fusionaron aeronaves distintas por familia: A319, A320, A20N, A321 y A21N quedan separadas; B736, B737, B738, B739 y B38M quedan separadas; MD82, MD83 y MD88 quedan separadas; B772, B77W, B789 y B78X quedan separadas.
- ATR72 y AT76 quedan como codigos canonicos separados porque existen ambos en Neon, pero cada uno conserva alias cruzado para compatibilidad.
- TBM8 queda como alias de TBM9 porque no existe como modelo canonico en Neon; aparece como perfil/alias compatible en entrenamiento.
- Si `supportsCargo=false`, `cargoCapacityKg` queda en 0 en el catalogo y `N/D` en el Excel.
- Las rutas de carga solo admiten aeronaves con `supportsCargo=true`.
- La red conserva pares ida/vuelta para evitar pilotos atrapados.

## Validacion esperada

- `node scripts/pw3/validate-airline-routes.mjs` debe reportar `expected_aircraft=34`, `total_aircraft=34` y `aircraft_referenced_in_routes=34`.
- Debe quedar en 0: rutas sin retorno, aeropuertos sin salida, rutas fuera de autonomia, rutas sin aeronave compatible, rutas cargo sin aeronave cargo-compatible, flightType invalido y aeronaves referenciadas inexistentes.
