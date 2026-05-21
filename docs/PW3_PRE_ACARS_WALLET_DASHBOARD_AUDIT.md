# PW3 — Pre-ACARS Wallet & Dashboard Audit

## 1. ¿Dónde se calcula actualmente "Coins"?

| Archivo | Línea | Valor |
|---|---|---|
| `src/lib/dispatch/neon-ops.ts` | 715 | `coins: 0` — hardcodeado, nunca lee wallet real |
| `src/lib/crew/server-data.ts` | 684 | `coins: Math.round(economy?.balance ?? 0)` — usa loadEconomy de Supabase |
| `src/components/dashboard/sur/PilotCounters.tsx` | 27 | `$${format(counters?.coins, 631)}` — fallback a 631 si es undefined |
| `src/app/mi-perfil/page.tsx` | 86 | `${data.counters.coins}` — muestra lo que venga del API |

**Ruta real del dashboard:** `GET /api/dashboard/crew-center` → `buildCrewCenterPayload()` en `neon-ops.ts`
→ `coins: 0` hardcodeado. **No lee `pw3_pilot_wallets`.**

## 2. ¿Viene de mock/local/contador antiguo?

**SÍ — es mock puro.** `buildCrewCenterPayload` en `neon-ops.ts:715` devuelve `coins: 0` explícitamente.
La función `loadCrewCenterData` en `server-data.ts` usa `economy?.balance` pero esa ruta no es la que sirve el dashboard web actualmente.

## 3. ¿Dashboard lee wallet real?

**NO.** La ruta `/api/dashboard/crew-center` usa `buildCrewCenterPayload` de `neon-ops.ts` que no consulta `pw3_pilot_wallets`.

## 4. Callsign esperado

- Callsign: `PWG001`
- Identificación: `PW3_TARGET_PILOT_CALLSIGN=PWG001`

## 5. Estado esperado en `pw3_pilot_wallets`

- Wallet puede NO existir aún (script de grant no ha corrido contra DB real).
- Si no existe → script `apply-pilot-initial-wallet-and-expenses.mjs` la crea con USD 25.000.

## 6. Estado esperado del ledger

- `idempotency_key = 'pilot_initial_grant:PWG001'` (o con pilot_id UUID si existe en `pw3_pilots`).
- `type = adjustment`, `category = pilot_initial_grant`, `direction = credit`, `amount_usd = 25000`.

## 7. Problema en el script de grant (FASE 2)

El script usa columnas **antiguas** que NO existen en `pw3_pilot_expense_catalog`:
- `code` → correcto es `expense_code`
- `type` → correcto es `category`
- `applies_to` → NO existe; está en `metadata.appliesTo`

La tabla real (`PW3_ECONOMY_SCHEMA_001.sql` línea 133-144):
```sql
expense_code text not null unique,
label text not null,
category text not null,
amount_usd numeric(14,2) not null default 0,
currency text not null default 'USD_VIRTUAL',
active boolean not null default true,
metadata jsonb not null default '{}'::jsonb
```

## 8. Fix requerido en script

Cambiar INSERT de catálogo de:
```sql
insert into pw3_pilot_expense_catalog (code, type, label, amount_usd, applies_to, metadata)
```
a:
```sql
insert into pw3_pilot_expense_catalog (expense_code, label, category, amount_usd, currency, active, metadata)
```

## 9. Fix requerido en dashboard

`neon-ops.ts` `buildCrewCenterPayload` debe:
1. Llamar a `getPilotWallet(user.userId, user.callsign)` desde `wallet-db.ts`.
2. Asignar `coins: Math.round(wallet?.wallet_balance_usd ?? 0)`.
3. Si wallet es null → `coins: 0` (no mock 631).

## 10. Dispatch — estado cargo_official

`CARGO_OFFICIAL` ya existe en `operation-types.ts` y en `operationCodeForRouteCategory()` de `neon-ops.ts`.
**Falta** en `DispatchRoomClient.tsx`:
- `DispatchMode` no incluye `"cargo_official"`.
- `normalizeDispatchMode()` no reconoce `"cargo_official"`.
- `operationCodeForMode()` no lo mapea.
- `OfficialRouteStage` filtra cargo de las rutas visibles con `isOfficialRouteCategory()`.
- No existe paso de `cargo_kg` en el formulario de despacho.
- No existe forzado de `passenger_count = 0` para rutas cargo.

## 11. Archivos a tocar

| Archivo | Cambio |
|---|---|
| `scripts/pw3/apply-pilot-initial-wallet-and-expenses.mjs` | Corregir columnas catalog |
| `src/lib/dispatch/neon-ops.ts` | Leer wallet real para coins |
| `src/components/dispatch/DispatchRoomClient.tsx` | Agregar cargo_official mode + cargo kg + pax=0 |
| `src/lib/dispatch/manifest-types.ts` | Crear tipos PlannedManifest |
| `scripts/pw3/validate-pre-acars-dispatch.mjs` | Nuevo validador |
| `docs/PW3_PRE_ACARS_PAYLOAD_V1.md` | Documentación payload ACARS v1 |

## 12. NO tocado

- globals.css ✓
- landing ✓
- Oficina ✓
- Entrenamiento (visual) ✓
- Certificaciones (visual) ✓
- ACARS desktop ✓
- finalize ✓
- pago wallet vuelo a vuelo ✓

---
*Generado: bloque Pre-ACARS E4.0*
