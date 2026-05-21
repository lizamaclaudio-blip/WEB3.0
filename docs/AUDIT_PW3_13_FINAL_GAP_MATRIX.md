# AUDIT PW3 13 — MATRIZ FINAL DE PENDIENTES
**Fecha:** 2026-05-21

| # | Área | Estado | Evidencia | Archivo(s) | Riesgo | Acción Recomendada | Prioridad | ¿Bloquea ACARS? |
|---|---|---|---|---|---|---|---|---|
| 1 | Landing | ✅ OK | page.tsx sin módulos internos | `src/app/page.tsx` | Bajo | Ninguna | — | No |
| 2 | Dashboard | ✅ OK | Coins real, counters presentes | `neon-ops.ts`, `DashboardClient.tsx` | Bajo | pireps/hours reales post-ACARS | Media | No |
| 3 | Oficina | ✅ OK | Tarjetas Claudio intactas | `src/app/api/office/` | Bajo | Ninguna | — | No |
| 4 | Entrenamiento | ✅ OK | Tabs teoría/checkrides/hab. | `src/app/training/` | Bajo | Ninguna | — | No |
| 5 | Certificaciones | ✅ OK | Mapa sin overlay, formato SUR Air | `src/components/training/` | Bajo | Ninguna | — | No |
| 6 | Rutas | ✅ OK | 88 rutas, 0 retornos faltantes | `route-network.ts`, `catalog.json` | Bajo | Ninguna | — | No |
| 7 | Mapa rutas | ✅ OK | OSM real, no ficticio | `AirlineRouteMap.tsx` | Bajo | Ninguna | — | No |
| 8 | Flota 34 | ✅ OK | 34 aeronaves, 0 huérfanas | `catalog.json` | Bajo | Ninguna | — | No |
| 9 | Rangos 10 | ✅ OK | 10 rangos, permisos coherentes | `catalog.json`, `pilot_ranks` DB | Bajo | Ninguna | — | No |
| 10 | Vuelos Regulares | ✅ OK | Itinerary separado de training | `RegularFlightsView.tsx` | Bajo | Ninguna | — | No |
| 11 | Economía local | ✅ OK | 50 pax + 28 cargo, 100% rentables | `calculator.ts`, `validate-economy.mjs` | Bajo | Ninguna | — | No |
| 12 | Economía DB | ✅ OK | 34 aircraft + 78 routes en Neon | `validate-economy-db.mjs` | Bajo | Verificar cargo estimates sin pax | Media | No |
| 13 | Wallet PWG001 | ✅ OK | $25,000 aplicado, idempotency OK | `wallet-db.ts`, Neon | Bajo | Ninguna | — | No |
| 14 | Ledger | ✅ OK | ON CONFLICT idempotency, FOR UPDATE | `wallet-db.ts` | Bajo | Ninguna | — | No |
| 15 | Progresión | ✅ OK | 22 gastos, API protegida, atómica | `progression-expense/route.ts` | Bajo | Ninguna | — | No |
| 16 | Traslados | ✅ OK | 5 códigos transfer, 3 penalidades | `catalog.json` | Bajo | Ninguna | — | No |
| 17 | Cargo dispatch | ✅ OK | Visible, bloqueado CADET, F/O+ OK | `DispatchPageShell.tsx` | Bajo | Ninguna | — | No |
| 18 | Manifest planificado | ✅ OK | PassengerManifest + CargoManifest separados | `manifest-types.ts` | Bajo | Ninguna | — | No |
| 19 | Payload ACARS v1 | ✅ OK | pw3-dispatch-v1, todos los campos | `training-reservations.ts` | Bajo | Ninguna | — | No |
| 20 | Economy snapshot planificado | ✅ OK | source: db/local-fallback/none, no ceros | `training-reservations.ts` | Bajo | Ninguna | — | No |
| 21 | Cargo sin pasajeros / sin ticketRevenue | ✅ OK | ticketRevenue=0, pax=0, cargoRev>0 | `training-reservations.ts` | Bajo | Ninguna | — | No |
| 22 | ACARS endpoints web (claim/status) | ✅ OK | /api/acars/dispatch/claim existe | `src/app/api/acars/` | Medio | Verificar auth ACARS vs piloto | Alta | No (pre-ACARS) |
| 23 | Finalize / post-vuelo | ❌ NO EXISTE | Sin endpoint, sin ledger post-vuelo | N/A | **ALTO** | **Implementar /api/acars/finalize** | **Alta** | **SÍ** |
| 24 | Validadores | ✅ OK | 58/58 pre-acars, economy OK, routes OK | `scripts/pw3/validate-*.mjs` | Bajo | Ninguna | — | No |
| 25 | Build/tsc/lint | ✅ OK | 0 errores tsc, 0 errores lint, build OK | — | Bajo | Limpiar 8 warnings | Baja | No |
| 26 | Seguridad repo | ⚠️ Parcial | .env.local sin commit pero en directorio, 0 commits reales | — | **ALTO** | `git commit` urgente + excluir .env.local de ZIPs | **Alta** | No (pero riesgo pérdida) |

---

## Bloqueantes Reales Antes de ACARS Desktop en Producción

| # | Bloqueante | Acción |
|---|---|---|
| B1 | `/api/acars/finalize` no existe | Implementar endpoint que reciba payload real del vuelo |
| B2 | Sin ledger entry post-vuelo | Implementar registro economía real tras vuelo |
| B3 | Sin actualización posición piloto/aeronave post-vuelo | Implementar |
| B4 | Sin validación schema payload ACARS entrante | Implementar zod/ajv |
| B5 | Score engine no existe | Implementar o definir en próxima fase |
| B6 | pireps/hours en dashboard hardcoded 0 | Depende de B1/finalize |


## POST-E5 Update (Codex)
- Bloqueante B1 (finalize endpoint) resuelto en web.
- Pendiente real: validacion con ACARS desktop real en produccion controlada.

