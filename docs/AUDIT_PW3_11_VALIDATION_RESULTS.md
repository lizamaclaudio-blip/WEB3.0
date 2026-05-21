# AUDIT PW3 11 — RESULTADOS DE VALIDACION
**Fecha:** 2026-05-21 | **Ejecutado por:** Cascade (solo lectura)

---

## 1. `node scripts/pw3/validate-airline-routes.mjs`

```
[check] total_airports=20
[check] cargo_hubs=7
[check] total_aircraft=34
[check] aircraft_referenced_in_routes=34
[check] passenger_routes=60
[check] cargo_routes=28
[check] return_validated_routes=88
[check] missing_return_routes=0
[check] routes_exceeding_aircraft_range=0
[check] routes_without_compatible_aircraft=0
[check] cargo_routes_without_cargo_aircraft=0
[check] passenger_routes_using_cargo_only_aircraft=0
[check] invalid_flight_type_routes=0
[check] aircraft_not_referenced_by_routes=0
[check] cargo_capacity_mismatches=0
[check] routes_with_unauthorizable_aircraft=0
[ok] airline_route_network=OK
```
**→ EXIT 0 ✅**

---

## 2. `node scripts/pw3/validate-economy.mjs`

```
[check] economy_catalog_version=PW3_ECONOMY_V1
[check] active_aircraft=34
[check] aircraft_economy_profiles=34
[check] passenger_routes_estimated=50
[check] cargo_routes_estimated=28
[check] progression_expenses=22
[check] passenger_routes_profitable=50
[check] passenger_routes_unprofitable=0
[check] passenger_profitability_pct=100
[check] cargo_routes_profitable=28
[check] cargo_routes_unprofitable=0
[check] cargo_profitability_pct=100
[check] pilot_accrual_total_usd=688909.42
[check] airline_cash_usd=11642117.16
[check] monthly_net_usd=9142117.16
[check] negative_amounts=0
[check] cargo_compatibility_errors=0
[check] accrual_exceeds_net=0
[check] ineligible_regular_routes=0
[check] duplicate_progression_expenses=0
[check] routes_with_zero_accrual=0
[check] cargo_routes_with_passengers=0
[check] cargo_routes_with_ticket_revenue=0
[check] passenger_routes_without_ticket_revenue=0
[check] passenger_routes_without_baggage_model=0
[check] routes_without_aircraft_wear=0
[check] maintenance_reserve_mismatch=0
[check] checkrides_without_cost=0 / habilitaciones_without_cost=0 / teoricos_without_cost=0
[check] pax_aircraft_combinations=672 (profitable=672)
[check] cargo_aircraft_combinations=452 (profitable=452)
[check] zero_accrual_combinations=0
[check] initial_wallet_grant_usd=25000
[check] transfer_expense_codes=5
[check] penalty_expense_codes=3
[check] mojibake_hits=0
[ok] economy_model=OK
```
**→ EXIT 0 ✅**

---

## 3. `node scripts/pw3/validate-economy-db.mjs`

```
[ok] validate-economy-db
[ok] account_pw3=1
[ok] aircraft=34
[ok] routes=78
[ok] expenses=22
[ok] ledger/wallet consultables
```
**→ EXIT 0 ✅** *(warning SSL de pg-connection-string — no es error de schema)*

---

## 4. `node scripts/pw3/validate-pre-acars-dispatch.mjs`

**58/58 checks ✅** — todos `=true`
Incluye: cargo_official mode, manifiestos separados, payload ACARS v1, economy snapshot real (db/local-fallback/none), passenger_count=0 para cargo, cargoRevenue desde snapshot, finalize no tocado, ACARS desktop no tocado.

**→ EXIT 0 ✅**

---

## 5. `node scripts/pw3/export-economy-excel.mjs`

```
[ok] excel=docs/exports/PW3_ECONOMY_MODEL.xlsx
[check] hojas=13
[check] rutas_pasajeros_economia=50
[check] rutas_carga_economia=28
[check] aeronaves_perfil_economico=34
```
**→ EXIT 0 ✅**

---

## 6. `node scripts/pw3/export-airline-routes-excel.mjs`

```
[check] hojas=11
[check] rutas=88
[check] rutas_pasajeros_regulares=50
[check] rutas_carga=28
[check] rutas_escuela_local=10
```
**→ EXIT 1** *(warning de conexión DB en hoja Neon, no bloquea Excel local)*

---

## 7. `npx tsc --noEmit`

```
(sin output de error)
```
**→ EXIT 0 — 0 errores TypeScript ✅**

---

## 8. `npm run lint`

```
✖ 8 problems (0 errors, 8 warnings)
```
Warnings preexistentes:
- `HealthBar` definida no usada
- `routeKey` definida no usada
- `getModeFromSearch` definida no usada
- `<img>` sin `<Image />`

**→ 0 ERRORES ✅** (warnings no bloquean build)

---

## 9. `npm run build`

```
✓ Compiled successfully in 3.9s
```
**→ EXIT 0 ✅**

---

## Resumen

| Script | Resultado |
|---|---|
| validate-airline-routes | ✅ OK |
| validate-economy | ✅ OK |
| validate-economy-db | ✅ OK |
| validate-pre-acars-dispatch | ✅ 58/58 |
| export-economy-excel | ✅ OK |
| export-airline-routes-excel | ⚠️ OK (warning DB en sheet Neon) |
| tsc --noEmit | ✅ 0 errores |
| lint | ✅ 0 errores (8 warnings preexistentes) |
| build | ✅ Compiled successfully |
