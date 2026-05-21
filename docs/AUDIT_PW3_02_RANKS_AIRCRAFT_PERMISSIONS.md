# AUDIT PW3 02 — RANGOS, FLOTA Y PERMISOS
**Fecha:** 2026-05-21 | **Fuente:** `src/lib/airline/catalog.json` + `src/lib/dispatch/operation-types.ts`

---

## Rangos (10 total)

| Código | Nivel | Cargo | Internacional | Long Haul |
|---|---|---|---|---|
| CADET | 1 | ❌ | ❌ | ❌ |
| SECOND_OFFICER | 2 | ❌ | ❌ | ❌ |
| FIRST_OFFICER | 3 | ✅ | ❌ | ❌ |
| SENIOR_FIRST_OFFICER | 4 | ✅ | ❌ | ❌ |
| CAPTAIN | 5 | ✅ | ✅ | ❌ |
| SENIOR_CAPTAIN | 6 | ✅ | ✅ | ✅ |
| TRAINING_CAPTAIN | 7 | ✅ | ✅ | ✅ |
| COMMANDER | 8 | ✅ | ✅ | ✅ |
| SENIOR_COMMANDER | 9 | ✅ | ✅ | ✅ |
| CHIEF_PILOT | 10 | ✅ | ✅ | ✅ |

**Validación: 10/10 rangos ✅**

---

## Permisos por Rango en DB (`pilot_ranks`)

Tabla `public.pilot_ranks` consultada vía `getRankOperationPermissions()`:
- `allows_cargo`: CADET=false, SECOND_OFFICER=false, FIRST_OFFICER+=true
- `allows_international`: CAPTAIN+ = true
- `allows_long_range`: SENIOR_CAPTAIN+ = true

**CADET cargo bloqueado correctamente ✅**
**FIRST_OFFICER+ desbloquea cargo ✅**

---

## Flota (34 aeronaves)

| Código | Categoría | Pax | Cargo |
|---|---|---|---|
| C172 | single_engine | ✅ | ✅ |
| BE58 | piston_twin | ✅ | ✅ |
| TBM9 | turboprop_single | ✅ | ✅ |
| B350 | turboprop_twin | ✅ | ✅ |
| C208 | cargo_turboprop | ❌ | ✅ |
| DHC6 | regional_turboprop | ✅ | ✅ |
| AT76/ATR72 | regional_turboprop | ✅ | ✅ |
| E170/E175/E190/E195 | regional_jet | ✅ | ✅ |
| SU95 | regional_jet | ✅ | ✅ |
| A319/A320/A321/A20N/A21N | narrow_body | ✅ | ✅ |
| B736/B737/B738/B739/B38M | narrow_body | ✅ | ✅ |
| MD82/MD83/MD88 | narrow_body | ✅ | ✅ |
| B789/B78X | long_range_narrow_body | ✅ | ✅ |
| A339/A359 | wide_body | ✅ | ✅ |
| B772/B77W | wide_body | ✅ | ✅ |
| B748 | wide_body | ✅ | ✅ |
| B77F | freighter | ❌ | ✅ |

**Total: 34 ✅ | Cargo-capable: 31 | Pax-capable: 32**

---

## Categorías de Aeronaves

`single_engine, piston_twin, cargo_turboprop, turboprop_single, turboprop_twin, regional_turboprop, regional_jet, narrow_body, long_range_narrow_body, wide_body, freighter`

---

## Validaciones

| Check | Estado |
|---|---|
| Total aeronaves = 34 | ✅ |
| Total rangos = 10 | ✅ |
| aircraft_referenced_in_routes = 34 | ✅ |
| aircraft_not_referenced_by_routes = 0 | ✅ |
| cargo_capacity_mismatches = 0 | ✅ |
| CADET cargo bloqueado | ✅ |
| FIRST_OFFICER+ desbloquea cargo | ✅ |
| Widebody/largo radio solo SENIOR_CAPTAIN+ | ✅ |
| Códigos coherentes (todos uppercase 4-5 chars) | ✅ |
| No mezcla checkrides con rutas comerciales | ✅ |

---

## Observaciones

- `validate-airline-routes.mjs`: `aircraft_referenced_in_routes=34`, `routes_without_compatible_aircraft=0`, `routes_with_unauthorizable_aircraft=0` — red totalmente coherente.
- Permisos de rango se leen de `public.pilot_ranks` en Neon (DB-first), con fallback a catalog.json local.
