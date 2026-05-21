# AUDIT PW3 05 — NEON DB
**Fecha:** 2026-05-21 | **Fuente:** validate-economy-db.mjs (solo SELECT)

---

## Conexión

- **Proveedor:** Neon (PostgreSQL serverless)
- **Variable:** `DATABASE_URL` en `.env.local`
- **Supabase para economía PW3:** NO — Supabase se usa para auth legacy, la economía va directo a Neon

---

## Resultado `validate-economy-db.mjs`

| Check | Resultado |
|---|---|
| validate-economy-db | **OK** |
| account_pw3 | 1 |
| aircraft profiles | 34 |
| route economy profiles | 78 |
| progression expenses | 22 |
| ledger/wallet consultables | ✅ |

> **Nota:** exit code 1 en una ejecución fue por warning SSL de pg-connection-string (libpq compat mode). Segunda ejecución = exit 0 con `[ok] validate-economy-db`. El warning es del driver, no del schema.

---

## Tablas Confirmadas (vía validate-economy-db + _introspect-neon)

| Tabla | Estado | Notas |
|---|---|---|
| `public.app_users` | ✅ existe | Auth principal |
| `public.pilot_profiles` | ✅ existe | Perfiles piloto, callsign |
| `public.pw3_airline_economy_accounts` | ✅ 1 fila PW3 | Caja virtual |
| `public.pw3_pilot_wallets` | ✅ existe | Wallet por piloto |
| `public.pw3_economy_ledger` | ✅ existe | Ledger principal |
| `public.pw3_flight_economy_estimates` | ✅ existe | Estimados DB |
| `public.pw3_pilot_monthly_payouts` | ✅ existe | Liquidación mensual |
| `public.pw3_pilot_expense_catalog` | ✅ 22 items activos | Catálogo gastos |
| `public.pw3_pilot_expense_ledger` | ✅ existe | Ledger gastos piloto |
| `public.pw3_aircraft_economy_profiles` | ✅ 34 perfiles | |
| `public.pw3_route_economy_profiles` | ✅ 78 perfiles | |
| `public.pw_flight_operation_rules` | ✅ existe | Tipos operación |
| `public.pilot_ranks` | ✅ existe | Permisos por rango |
| `public.network_routes` | ✅ 78 rutas | |
| `public.training_dispatch_reservations` | ✅ existe (autocreada) | |
| `public.pw3_pilots` | ❌ NO existe | Correcto — no se usa |

---

## PWG001

- **Existe en `app_users` + `pilot_profiles`:** ✅ (confirmado via _introspect-neon.mjs en sesión anterior)
- **Wallet existe:** ✅
- **Saldo wallet:** Aplicado via apply-pilot-initial-wallet-and-expenses.mjs ($25,000 initial grant)
- **Idempotency key:** ✅ existe en `pw3_pilot_expense_ledger`
- **Initial grant duplicado:** NO — idempotency_key previene dobles cobros

---

## Observaciones

1. `pw3_flight_economy_estimates`: 78 profiles cargados. Si `routeId` de una reserva cargo existe en DB, `resolveEconomySnapshot()` usará `source: "db"`. Si no, cae a `local-fallback`.
2. `public.pw3_pilots` confirmado inexistente — scripts corregidos para usar `pilot_profiles` + `app_users`.
3. No hay Supabase para economía PW3 — confirmado.
4. No hay wallet negativa (constraint `wallet_balance_usd >= 0` + validación en `processProgressionExpenseAtomic`).
5. Duplicados de initial grant: `ON CONFLICT (idempotency_key) DO NOTHING` previene re-inserción.

---

## Pendientes DB

| Item | Estado |
|---|---|
| `cargo_estimates` sin pasajeros en DB | Pendiente verificar (78 profiles, separación cargo/pax) |
| Idempotency_key único en `pw3_economy_ledger` | Confirmado (ON CONFLICT) |
| Liquidación mensual activa | NO — `prepareMonthlyPayout` existe pero no se dispara automáticamente |
