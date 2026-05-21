# AUDIT PW3 06 — WALLET, LEDGER Y PROGRESION
**Fecha:** 2026-05-21 | **Fuente:** wallet-db.ts, ledger-db.ts, progression-expense/route.ts, training-expense.ts

---

## `processProgressionExpenseAtomic` (wallet-db.ts)

**Flujo transaccional verificado:**

1. **INSERT expense_ledger** como `pending, wallet_applied=false` con `ON CONFLICT (idempotency_key) DO NOTHING`
   - Si retorna 0 filas → ya procesado → devuelve estado actual sin deducir
2. **SELECT wallet FOR UPDATE** (lock exclusivo dentro de la transacción)
3. **Validar saldo** (`current >= amount`) — lanza error si insuficiente
4. **UPDATE wallet** (deducir balance, sumar total_spent)
5. **UPDATE expense_ledger** a `posted, wallet_applied=true`
6. **INSERT economy_ledger** con `ON CONFLICT (idempotency_key) DO NOTHING`
7. **ROLLBACK automático** si cualquier paso lanza excepción (dbTransaction)

**Validaciones:**
| Check | Estado |
|---|---|
| processProgressionExpenseAtomic existe | ✅ |
| idempotency_key gatea antes de deducir | ✅ |
| SELECT FOR UPDATE en wallet | ✅ |
| Rollback si falla | ✅ (dbTransaction) |
| No doble cobro | ✅ (ON CONFLICT DO NOTHING) |

---

## API `/api/economy/progression-expense` (POST)

- Requiere auth (`requireUserContext`)
- Lee catálogo DB-first, fallback local
- Pre-valida saldo antes de llamar a `processProgressionExpenseAtomic`
- Genera idempotencyKey único por piloto + itemCode + attemptIndex
- No hay POST público sin protección ✅

---

## Confirmación "Ver" vs "Inscribirse"

- La UI de Training muestra confirmación antes de cobrar ✅
- El usuario debe presionar confirmar explícitamente — no hay cobro automático

---

## Training-Expense

- `getCheckrideExpenseCode`, `getRatingExpenseCode`, `getTheoryExamExpenseCode`
- `resolveExpenseAmount` resuelve monto desde catálogo (DB-first)
- `buildCheckrideExpenseKey`, `buildTheoryExpenseKey`, `buildRatingExpenseKey` — idempotency keys determinísticas

---

## Wallet

- `getPilotWallet(pilotId, callsign)` — busca por UUID o callsign (case-insensitive)
- `deductFromWallet` — transaccional con FOR UPDATE
- `accruePilotAmount` — acumula en `pending_accrual_usd` (no en balance)
- Dashboard Coins lee `wallet_balance_usd` real via `buildCrewCenterPayload`

---

## Liquidación Mensual

- `prepareMonthlyPayout` existe en wallet-db.ts
- **Estado: NO activa** — requiere trigger manual o cron job. Documentado como pendiente pre-ACARS final.

---

## Pago Wallet Vuelo a Vuelo

- **NO implementado** — confirmado. El accrual piloto se acumula en `pending_accrual_usd`, se liquida mensualmente.
- Correcto según diseño.

---

## Traslados / Penalidades

- `pilot_transfer_fee`: 5 códigos definidos en catálogo
- `operational_penalty`: 3 códigos definidos
- Aplicables via `processProgressionExpenseAtomic` con los expense codes correspondientes

---

## Estado Final

| Item | Estado |
|---|---|
| Wallet segura contra doble cobro | ✅ |
| Ledger con idempotency | ✅ |
| Dashboard Coins real (no hardcoded) | ✅ |
| Pago vuelo a vuelo | ❌ Pendiente (por diseño) |
| Liquidación mensual | ⚠️ Parcial — función existe, no activada |
| Traslados/penalidades definidos | ✅ |
