# AUDIT PW3 07 — DASHBOARD / CREW CENTER
**Fecha:** 2026-05-21 | **Fuente:** neon-ops.ts, crew-center/route.ts, PilotCounters.tsx

---

## Coins (Wallet Balance)

**Implementación actual en `buildCrewCenterPayload` (neon-ops.ts línea 637-638):**
```typescript
const walletRow = await getPilotWallet(user.userId, user.callsign).catch(() => null);
const walletBalanceCoins = Math.round(walletRow?.wallet_balance_usd ?? 0);
```

Asignado en counters:
```typescript
coins: walletBalanceCoins,
```

| Check | Estado |
|---|---|
| Coins no hardcoded en 0 | ✅ (corregido en E3.x) |
| Coins lee pw3_pilot_wallets.wallet_balance_usd | ✅ |
| Dashboard no falla si wallet no existe | ✅ (`.catch(() => null)` + `?? 0`) |
| PWG001 muestra saldo real | ✅ (wallet aplicada) |

---

## Counters Restantes

| Counter | Fuente | Estado |
|---|---|---|
| totalPireps | hardcoded 0 | ⚠️ Mock (pendiente ACARS) |
| totalHours | hardcoded 0 | ⚠️ Mock (pendiente ACARS) |
| score | hardcoded 0 | ⚠️ Mock (pendiente score engine) |
| coins | wallet DB real | ✅ |

---

## Mensaje "No se pudieron cargar datos operacionales"

- **Causa probable:** error en `resolveOperationalContext()` o `listAvailableAircraft()` cuando la sesión es inválida o el piloto no tiene aeronave asignada
- El componente `DashboardClient.tsx` muestra este mensaje como fallback graceful
- No es un error silencioso — se loguea en consola servidor

---

## API `/api/dashboard/crew-center`

- Llama a `loadCrewCenterData(request)` → `buildCrewCenterPayload(user)`
- Auth obligatoria — sin sesión devuelve error, no datos de otro usuario
- No hay fetch fallando silencioso en la ruta crítica

---

## Estado Final

| Item | Estado |
|---|---|
| Coins DB real | ✅ |
| Graceful degradation sin wallet | ✅ |
| pireps/hours/score | ⚠️ Pendiente ACARS/score engine |
| Auth endpoint protegido | ✅ |
