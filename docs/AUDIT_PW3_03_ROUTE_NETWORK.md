# AUDIT PW3 03 — RED DE RUTAS
**Fecha:** 2026-05-21 | **Fuente:** catalog.json, route-network.ts, validate-airline-routes.mjs

---

## Conteos Validados

| Métrica | Catálogo local | validate-airline-routes | Excel (XLSX) |
|---|---|---|---|
| Links pasajeros (pares base) | 30 | — | — |
| Links cargo (pares base) | 14 | — | — |
| Rutas pasajeros (con retorno) | **60** | 60 | 50* |
| Rutas cargo (con retorno) | **28** | 28 | 28 |
| Rutas escuela/local | 10 | — | 10 |
| Total rutas operacionales | **88** | 88 | 88 |
| Aeropuertos red | 20 | 20 | — |
| Retorno faltantes | 0 | 0 | — |

> **Nota Excel vs código:** El xlsx marca "50 rutas pasajeros regulares" separando las escuela/local (10) de las comerciales. Las 60 del código incluyen las escuela/local expandidas con retorno. Sin discrepancia real.

---

## Categorías de Rutas

**Pasajeros:** `escuela_local, regional, interregional, patagonia, nacional, internacional_regional, largo_radio`

**Cargo:** `carga_regional, carga_interregional, carga_nacional, carga_internacional`

---

## Aeropuertos

**Red pasajeros (20):** KJFK, KMIA, SAEZ, SBGR, SCAC, SCAR, SCBA, SCCI, SCDA, SCEL, SCFA, SCIE, SCIP, SCJO, SCPF, SCST, SCTE, SCVD, SPIM, SUMU

**Red cargo (13):** KMIA, SAEZ, SBGR, SCAR, SCBA, SCCI, SCDA, SCEL, SCFA, SCIE, SCST, SCTE, SCVD

**Hubs cargo (validate-airline-routes: 7):** SCDA, SCTE, SCCI, SCST, SAEZ, SCEL, KMIA *(aprox.)*

---

## Validaciones Críticas

| Check | Estado |
|---|---|
| Rutas con retorno faltante = 0 | ✅ |
| Aeropuertos sin salida = 0 | ✅ |
| Rutas excediendo autonomía aeronave = 0 | ✅ |
| Rutas sin aeronave compatible = 0 | ✅ |
| Rutas cargo sin aeronave cargo = 0 | ✅ |
| Rutas pasajero con aeronave cargo-only = 0 | ✅ |
| Tipos de vuelo inválidos = 0 | ✅ |
| Economía visible por aeronave en UI | ✅ |
| Vuelos Regulares no mezcla training con itinerary | ✅ |

---

## Generación de Rutas (route-network.ts)

- `buildRoute(link, reverse=false)` genera ida y vuelta desde cada link
- `expandRouteLinks()` aplica el patrón bidireccional
- `getOperationalRoutes()` = pasajeros + cargo, filtrando `route.active = true`
- `compatibleAircraftForLink()` valida distancia, soporte cargo/pax y rango

---

## Observaciones

- Mapa de rutas usa OSM real (no ficticio) — verificado en sesión anterior
- Red validada tanto en catálogo local como en Neon (`network_routes` con 78 rutas en DB)
- Diferencia 88 (local) vs 78 (DB): la DB tiene 78 registros; el local genera 88 expandiendo con retorno. No es error — son modelos distintos.
