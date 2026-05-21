# PW3 Pre-ACARS — Wallet & Dispatch Changelog (E4.0)

Fecha: 2026-05-21

---

## 1. Tablas Neon reales detectadas

| Tabla | Uso |
|---|---|
| `public.pilot_profiles` | Tabla real de pilotos — tiene `callsign`, `id` (uuid), `rank_code` |
| `public.app_users` | Tabla real de usuarios — tiene `id`, `email`, `display_name`, `first_name`, `last_name` |
| `public.pw3_pilot_wallets` | Wallet del piloto — `pilot_id`, `callsign`, `wallet_balance_usd` |
| `public.pw3_economy_ledger` | Ledger de economía virtual |
| `public.pw3_pilot_expense_catalog` | Catálogo de gastos de progresión |
| `neon_auth.user` | Auth nativo Neon — email separado |

**NO existen** en este DB:
- `public.pw3_pilots` (el script anterior la usaba — ERROR)
- `auth.users` (no existe en esta DB — es Supabase)

---

## 2. Identificación de Claudio / PWG001

| Campo | Valor |
|---|---|
| `pilot_profiles.callsign` | `PWG001` |
| `pilot_profiles.id` | `f61d2c11-ec66-457b-bd93-76ce693c4eb7` |
| `pilot_profiles.rank_code` | `CADET` |
| `pilot_profiles.pilot_status` | `ACTIVE` |
| `app_users.email` | `lizamaclaudio@gmail.com` |
| `app_users.display_name` | `Claudio Andres Lizama Rivera` |

---

## 3. Wallet antes y después

| Estado | `wallet_balance_usd` |
|---|---|
| Antes del grant | `0` (no existía row) |
| Después del grant | `25000.00` |

- `pw3_pilot_wallets.id` = `12b5648a-cab3-4085-b47b-b37a62bbb026`
- `total_earned_usd` = `25000.00`
- `total_spent_usd` = `0.00`

---

## 4. Ledger entry

| Campo | Valor |
|---|---|
| `id` | `70ff8be5-a242-4135-8acb-4d163d65fe5e` |
| `type` | `adjustment` |
| `category` | `pilot_initial_grant` |
| `direction` | `credit` |
| `amount_usd` | `25000.00` |
| `source` | `system` |
| `idempotency_key` | `pilot_initial_grant:f61d2c11-ec66-457b-bd93-76ce693c4eb7` |
| `created_by` | `apply-script-e3.5` |
| `description` | `Capital inicial carrera Patagonia Wings 3.0` |

---

## 5. Idempotencia

Segunda ejecución: `grants_skipped_already_applied=1` — **balance NO duplicado** ✓

---

## 6. Dashboard Coins

**Antes:** `coins: 0` hardcodeado en `buildCrewCenterPayload` (`neon-ops.ts`).

**Después:** Lee `pw3_pilot_wallets.wallet_balance_usd` via `getPilotWallet(user.userId, user.callsign)`.

```typescript
// neon-ops.ts
const walletRow = await getPilotWallet(user.userId, user.callsign).catch(() => null);
const walletBalanceCoins = Math.round(walletRow?.wallet_balance_usd ?? 0);
// ...
coins: walletBalanceCoins,
```

---

## 7. Script corregido

`scripts/pw3/apply-pilot-initial-wallet-and-expenses.mjs`

| Fix | Detalle |
|---|---|
| Tabla piloto | `public.pw3_pilots` → `public.pilot_profiles` |
| Join usuario | `auth.users` → `public.app_users` |
| Columnas catálogo | `code, type, applies_to` → `expense_code, category, metadata.appliesTo` |
| Wallet upsert | `ON CONFLICT DO NOTHING` → `INSERT WHERE NOT EXISTS` (compatible con partial indexes) |

---

## 8. Dispatch cargo_official

`src/components/dispatch/DispatchRoomClient.tsx`

| Cambio | Detalle |
|---|---|
| `DispatchMode` | Añadido `"cargo_official"` |
| `normalizeDispatchMode` | Reconoce `cargo_official` |
| `operationCodeForMode` | Mapea → `"CARGO_OFFICIAL"` |
| `modeLabel` | `"Vuelo de carga"` |
| `modeHelp` | Texto informativo correcto |
| Paso 1 cargo | Muestra rutas filtradas por `isCargoRouteCategory()` |
| `WeightFuelStage` | `passengerCount` deshabilitado y forzado a 0 si `isCargo` |
| `cargoKg` validación | `canContinueWeight` y `canCreateReservation` requieren `cargoKg > 0` si `isCargo` |
| Payload reserva | Envía `passengerCount: effectivePassengerCount` (0 para cargo) + `isCargo: true` |

---

## 9. Tipos manifest pre-ACARS

`src/lib/dispatch/manifest-types.ts` — NUEVO

- `PassengerManifest`
- `CargoManifest` — incluye `passengerCountForcedZero: boolean`
- `AircraftPayload`
- `EconomySnapshot`
- `PlannedManifest`
- `AcarsV1Payload`
- Helpers: `buildPassengerManifest`, `buildCargoManifest`, `buildAircraftPayload`

---

## 10. Validaciones finales

| Check | Resultado |
|---|---|
| `validate-pre-acars-dispatch.mjs` | 29/29 ✓ |
| `validate-economy.mjs` | OK ✓ |
| `tsc --noEmit` | 0 errores ✓ |
| `npm run build` | Compiled successfully ✓ |

---

## 11. Archivos tocados

| Archivo | Cambio |
|---|---|
| `scripts/pw3/apply-pilot-initial-wallet-and-expenses.mjs` | Tablas reales + columnas correctas + upsert seguro |
| `scripts/pw3/_introspect-neon.mjs` | NUEVO — introspección read-only |
| `scripts/pw3/_check-wallet-schema.mjs` | NUEVO — schema check read-only |
| `scripts/pw3/validate-pre-acars-dispatch.mjs` | NUEVO — 29 checks pre-ACARS |
| `src/lib/dispatch/neon-ops.ts` | Import `getPilotWallet` + `coins: walletBalanceCoins` |
| `src/components/dispatch/DispatchRoomClient.tsx` | `cargo_official` mode completo |
| `src/lib/dispatch/manifest-types.ts` | NUEVO — tipos PlannedManifest + AcarsV1Payload |
| `docs/PW3_PRE_ACARS_WALLET_DASHBOARD_AUDIT.md` | NUEVO |
| `docs/PW3_PRE_ACARS_PAYLOAD_V1.md` | NUEVO |
| `docs/PW3_PRE_ACARS_WALLET_AND_DISPATCH_CHANGELOG.md` | NUEVO (este doc) |

---

## 12. NO tocado

- `globals.css` ✓
- ACARS desktop ✓
- finalize ✓
- globals.css ✓
- Landing ✓
- Training UI (visual) ✓
- Ledger real por vuelo ✓ (no se crea aquí)

---
*PW3 E4.0 — Pre-ACARS Wallet & Dispatch*
