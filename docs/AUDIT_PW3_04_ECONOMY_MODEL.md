# AUDIT PW3 04 — MODELO ECONOMICO LOCAL
**Fecha:** 2026-05-21 | **Fuente:** catalog.json, calculator.ts, validate-economy.mjs

---

## Catálogo Económico (`src/lib/economy/catalog.json`)

- **Versión:** PW3_ECONOMY_V1
- **Moneda:** USD, virtualOnly=true
- **Caja base aerolínea:** $2,500,000 USD
- **Wallet inicial piloto:** $25,000 USD

### Categorías de Ruta (11)
`escuela_local, regional, interregional, patagonia, nacional, internacional_regional, largo_radio, carga_regional, carga_interregional, carga_nacional, carga_internacional`

### Categorías de Aeronave (12 perfiles)
`single_engine, piston_twin, turboprop_single, turboprop_twin, regional_turboprop, light_jet, regional_jet, narrow_body, long_range_narrow_body, wide_body, freighter, cargo_turboprop`

### Gastos de Progresión (22 items)
Tipos: `training_fee, checkride_fee, rank_progression_fee, certification_fee, pilot_transfer_fee, operational_penalty`

---

## Resultados validate-economy.mjs

| Check | Valor | Estado |
|---|---|---|
| active_aircraft | 34 | ✅ |
| aircraft_economy_profiles | 34 | ✅ |
| passenger_routes_estimated | 50 | ✅ |
| cargo_routes_estimated | 28 | ✅ |
| progression_expenses | 22 | ✅ |
| passenger_routes_profitable | 50/50 | ✅ 100% |
| cargo_routes_profitable | 28/28 | ✅ 100% |
| pax_aircraft_combinations | 672/672 rentables | ✅ |
| cargo_aircraft_combinations | 452/452 rentables | ✅ |
| cargo_routes_with_passengers | 0 | ✅ |
| cargo_routes_with_ticket_revenue | 0 | ✅ |
| passenger_routes_without_ticket_revenue | 0 | ✅ |
| passenger_routes_without_baggage_model | 0 | ✅ |
| routes_without_aircraft_wear | 0 | ✅ |
| maintenance_reserve_mismatch | 0 | ✅ |
| zero_accrual_combinations | 0 | ✅ |
| checkrides_without_cost | 0 | ✅ |
| habilitaciones_without_cost | 0 | ✅ |
| teoricos_without_cost | 0 | ✅ |
| duplicate_progression_expenses | 0 | ✅ |
| negative_amounts | 0 | ✅ |
| cargo_compatibility_errors | 0 | ✅ |
| accrual_exceeds_net | 0 | ✅ |
| ineligible_regular_routes | 0 | ✅ |
| mojibake_hits | 0 | ✅ |
| initial_wallet_grant_usd | 25000 | ✅ |
| transfer_expense_codes | 5 | ✅ |
| penalty_expense_codes | 3 | ✅ |
| pilot_accrual_total_usd | $688,909 | ✅ |
| airline_cash_usd | $11,642,117 | ✅ |
| monthly_net_usd | $9,142,117 | ✅ |

---

## Motor Económico (calculator.ts)

- **Modelo de ingresos pasajero:** ticket base + yield/nm + exceso equipaje + ventas a bordo + servicio
- **Modelo de ingresos cargo:** base fee + rate/kg/nm + handling revenue + special cargo fee
- **Modelo de costos:** fuel/nm + aeropuerto + mantenimiento + reserva mantenimiento + tripulación + catering + cargo handling
- **Desgaste aeronave:** baseWear + cycleWear + payloadWear + landingWear + maneuverWear × simulatedOperationalFactor
- **operationalSupportRevenue:** garantiza que rutas pax no queden en negativo
- **pilotAccrualUsd:** max(minimum, netProfit × accrualRate), capped a netProfit

---

## Excel (`PW3_ECONOMY_MODEL.xlsx`)

Hojas: Resumen | Perfil aeronaves | Costos por categoria | Rutas pasajeros | Rutas carga | Pax por aeronave | Carga por aeronave | Devengos piloto | Gastos progresion | Wallet inicial y traslados | Desgaste aeronave | Equipaje y sobrepeso | Validaciones

**Conteos confirmados en Excel:** 50 rutas pax, 28 rutas cargo, 34 perfiles aeronave.

---

## Estado Final

`validate-economy.mjs` → **OK** (todas las validaciones verdes, sin errores)
