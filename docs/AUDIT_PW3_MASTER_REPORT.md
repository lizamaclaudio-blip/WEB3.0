# AUDIT PW3 — MASTER REPORT
**Fecha:** 2026-05-21 | **Estado:** Pre-ACARS E4.1 completado

---

## 1. Resumen Ejecutivo

Patagonia Wings Web 3.0 ha completado todas las fases de base pre-ACARS:
- Infraestructura web (Next.js + Neon DB)
- Flota 34 aeronaves, 10 rangos, red de rutas completa
- Motor económico local + DB con 100% de rentabilidad validada
- Wallet, ledger y gastos de progresión con idempotencia atómica
- Dispatch completo: training_free, official_route, charter_official, **cargo_official**
- Manifiestos separados (passengerManifest + cargoManifest) en payload ACARS v1
- Economy snapshot planificado real (DB → local-fallback → none)
- Validadores: 58/58 pre-ACARS, economy OK, routes OK
- Build: compilado sin errores. TSC: 0 errores. Lint: 0 errores.

**El flujo web → ACARS claim está listo. El flujo ACARS finalize → ledger NO existe.**

---

## 2. Qué Está Cerrado (OK)

| Módulo | Estado |
|---|---|
| Landing pública | ✅ |
| Dashboard / Crew Center (Coins real) | ✅ |
| Oficina (tarjetas Claudio) | ✅ |
| Entrenamiento (tabs, costos) | ✅ |
| Certificaciones (mapa SUR Air) | ✅ |
| Vuelos Regulares | ✅ |
| Mapa de rutas (OSM real) | ✅ |
| Flota 34 aeronaves | ✅ |
| 10 rangos + permisos DB | ✅ |
| 88 rutas (60 pax + 28 cargo) | ✅ |
| Motor económico local (100% rentable) | ✅ |
| Economía DB (34 aircraft, 78 routes) | ✅ |
| Wallet PWG001 ($25,000) | ✅ |
| Ledger atómico + idempotency | ✅ |
| 22 gastos de progresión | ✅ |
| Traslados + penalidades definidos | ✅ |
| Cargo dispatch (visible, CADET bloqueado, F/O+ OK) | ✅ |
| Manifiestos passenger + cargo separados | ✅ |
| Payload ACARS v1 (pw3-dispatch-v1) | ✅ |
| Economy snapshot real (source: db/local-fallback/none) | ✅ |
| Cargo sin pasajeros, sin ticketRevenue | ✅ |
| ACARS claim endpoint | ✅ |
| Validadores (58/58 + economy + routes) | ✅ |
| Build / TSC / Lint | ✅ |

---

## 3. Qué Está Parcial

| Módulo | Qué Falta |
|---|---|
| Dashboard counters | pireps/hours/score hardcoded 0 (depende de ACARS finalize) |
| Liquidación mensual | `prepareMonthlyPayout` existe, no hay trigger/cron |
| economy_snapshot para training_free sin routeId | source="none", valores 0 — esperado por diseño |
| export-airline-routes-excel | Warning DB en sheet Neon (no bloquea Excel local) |

---

## 4. Qué Falta Antes de ACARS Desktop en Producción

| Prioridad | Item |
|---|---|
| 🔴 Alta | `/api/acars/finalize` — endpoint POST que recibe datos reales del vuelo |
| 🔴 Alta | Ledger entry por vuelo completado (economy real post-vuelo) |
| 🔴 Alta | Actualización posición piloto + aeronave post-vuelo |
| 🔴 Alta | Validación schema payload ACARS entrante (zod/ajv) |
| 🟡 Media | Score engine (eventos de vuelo, landing quality) |
| 🟡 Media | PIREPs automáticos post-vuelo |
| 🟡 Media | totalPireps / totalHours en dashboard |
| 🟢 Baja | Liquidación mensual automática (cron o trigger) |

---

## 5. Qué NO Debe Tocarse

| Item | Razón |
|---|---|
| `globals.css` | Diseño aprobado — modificaciones requieren autorización |
| Oficina / Entrenamiento / Certificaciones | Diseño Claudio aprobado |
| ACARS desktop code | Scope independiente |
| `finalize` endpoints | No existen — no inventar hasta tener spec |
| Wallet flow actual | Funciona correctamente — no tocar sin necesidad |

---

## 6. Riesgos Altos

| Riesgo | Impacto | Acción |
|---|---|---|
| **0 commits reales en git** | Pérdida total si directorio se corrompe | `git add -A && git commit` URGENTE |
| `.env.local` en directorio | Credenciales expuestas en ZIPs | Excluir de todos los ZIPs |
| Sin finalize ACARS | Vuelos no pueden cerrarse económicamente | Implementar antes de ACARS prod |
| economy_snapshot = "none" para TRAINING_FREE | Esperado, pero puede confundir ACARS desktop | Documentar en contrato v1 |

---

## 7. Orden Recomendado de Próximos Bloques

```
BLOQUE E5 — ACARS Finalize Web
  E5.1 - Diseñar schema payload entrante ACARS (zod)
  E5.2 - Implementar /api/acars/finalize
  E5.3 - Registrar ledger entry real por vuelo
  E5.4 - Actualizar posición piloto/aeronave
  E5.5 - Calcular economy real vs. planificado

BLOQUE E6 — Score Engine
  E6.1 - Modelo de puntuación por vuelo
  E6.2 - Eventos de vuelo (landing, overspeed, etc.)
  E6.3 - Dashboard score real

BLOQUE E7 — PIREPs y Dashboard Real
  E7.1 - POST /api/pireps tras finalize
  E7.2 - totalPireps / totalHours en Crew Center
  E7.3 - Historial de vuelos

BLOQUE E8 — Liquidación Mensual
  E8.1 - Cron o trigger manual
  E8.2 - Payout summary en dashboard
```

---

## 8. Decisión Final

### ¿Listo para ACARS Desktop?

**NO — para producción completa.**

**SÍ — para pruebas de integración (claim + payload).**

### Condiciones para ACARS Producción

1. ✅ Payload ACARS v1 entregado correctamente en `/api/acars/dispatch/claim`
2. ❌ Endpoint `/api/acars/finalize` no existe
3. ❌ Ledger post-vuelo no implementado
4. ❌ Posición piloto/aeronave no actualizada post-vuelo
5. ❌ Score engine no existe

**El ACARS desktop puede conectarse para prueba de claim y verificar el payload. No puede cerrar vuelos en producción hasta que E5 esté completado.**

---

## Documentos de Auditoría Creados

| Archivo | Contenido |
|---|---|
| `docs/AUDIT_PW3_00_PROJECT_SNAPSHOT.md` | Estructura, git, tamaños, archivos sensibles |
| `docs/AUDIT_PW3_01_UI_DESIGN.md` | Landing, dashboard, oficina, entrenamiento, dispatch |
| `docs/AUDIT_PW3_02_RANKS_AIRCRAFT_PERMISSIONS.md` | 10 rangos, 34 aeronaves, permisos |
| `docs/AUDIT_PW3_03_ROUTE_NETWORK.md` | 88 rutas, categorías, aeropuertos |
| `docs/AUDIT_PW3_04_ECONOMY_MODEL.md` | Motor económico, 672+452 combinaciones rentables |
| `docs/AUDIT_PW3_05_NEON_DB.md` | Tablas, PWG001, wallet, ledger |
| `docs/AUDIT_PW3_06_WALLET_LEDGER_PROGRESSION.md` | Flujo atómico, idempotency, traslados |
| `docs/AUDIT_PW3_07_DASHBOARD_CREW_CENTER.md` | Coins real, counters, crew center |
| `docs/AUDIT_PW3_08_DISPATCH_PRE_ACARS.md` | 4 modos, cargo, manifiestos, payload v1, 58/58 |
| `docs/AUDIT_PW3_09_ACARS_READINESS.md` | Qué existe, qué falta, flujo claim, riesgos |
| `docs/AUDIT_PW3_10_SCRIPTS_VALIDATORS.md` | 30 scripts, guards, obsoletos |
| `docs/AUDIT_PW3_11_VALIDATION_RESULTS.md` | Output completo de todos los validadores |
| `docs/AUDIT_PW3_12_REPOSITORY_HYGIENE.md` | ZIPs, BOM, git, .env.local |
| `docs/AUDIT_PW3_13_FINAL_GAP_MATRIX.md` | Tabla 26 áreas, estado, riesgo, bloquea ACARS |
| `docs/AUDIT_PW3_MASTER_REPORT.md` | Este documento |


## POST-E5 Update (Codex)
- Se implemento /api/acars/finalize web con idempotencia por reserva.
- Se agrego schema validation v1 finalize y ledger post-vuelo idempotente.
- Se mantiene regla: no wallet vuelo a vuelo, solo pending_accrual.
- Se agrego historial basico (pw3_flight_reports) para counters reales de dashboard.

