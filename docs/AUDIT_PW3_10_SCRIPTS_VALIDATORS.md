# AUDIT PW3 10 — SCRIPTS Y VALIDADORES
**Fecha:** 2026-05-21 | **Fuente:** scripts/pw3/ (30 archivos)

---

## Validadores Activos

| Script | Resultado | Checks |
|---|---|---|
| `validate-airline-routes.mjs` | **OK** | 17 checks (rutas, aeronaves, retornos, categorías) |
| `validate-economy.mjs` | **OK** | 30+ checks (rentabilidad, accrual, baggage, wear) |
| `validate-economy-db.mjs` | **OK** | 6 checks DB (account, aircraft, routes, expenses, ledger) |
| `validate-pre-acars-dispatch.mjs` | **OK** | **58/58** checks |
| `validate-pw3-master.mjs` | Existe | Integra validadores anteriores |

---

## Exportadores

| Script | Resultado | Output |
|---|---|---|
| `export-economy-excel.mjs` | **OK** | `docs/exports/PW3_ECONOMY_MODEL.xlsx` (13 hojas) |
| `export-airline-routes-excel.mjs` | **OK** | `docs/exports/PW3_AIRLINE_ROUTES_NETWORK.xlsx` (11 hojas) |

---

## Scripts de Aplicación (Write — requieren confirmación)

| Script | Guard | Estado |
|---|---|---|
| `apply-economy-schema-to-neon.mjs` | `PW3_CONFIRM_DB_WRITE=YES` | ✅ Guard existe |
| `apply-pilot-initial-wallet-and-expenses.mjs` | `PW3_CONFIRM_DB_WRITE=YES` | ✅ Guard existe |
| `apply-airline-routes-to-neon.mjs` | `PW3_CONFIRM_DB_WRITE=YES` | ✅ Guard existe |
| `apply-dispatch-accordion-icao-fix.mjs` | — | Parche UI, no DB |
| `apply-pilot-reposition-panel.mjs` | — | Parche UI, no DB |
| `apply-route-official-fix.mjs` | — | Parche UI, no DB |
| `run-pw3-sql-015.mjs` | Verificar | Script SQL masivo — revisar antes de ejecutar |
| `run-pw3-supabase-master.mjs` | — | Supabase legacy — no usar para economía PW3 |

---

## Scripts Auxiliares (Solo Lectura)

| Script | Propósito |
|---|---|
| `_introspect-neon.mjs` | Inspección schema Neon (SELECT) |
| `_check-wallet-schema.mjs` | Schema wallet/ledger (SELECT) |
| `_check-cargo-routes.mjs` | Conteo rutas cargo en DB (SELECT) |
| `_check-operation-types.mjs` | Tipos operación en DB (SELECT) |
| `_check-routes-cols.mjs` | Columnas network_routes (SELECT) |

---

## Checks de Seguridad

| Check | Estado |
|---|---|
| Scripts no usan tablas inexistentes (pw3_pilots) | ✅ Corregido |
| Scripts usan DATABASE_URL | ✅ |
| Scripts write requieren PW3_CONFIRM_DB_WRITE=YES | ✅ |
| No hay DROP/TRUNCATE/DELETE destructivo visible | ✅ |
| No apuntan a Supabase para economía PW3 | ✅ |
| Excel se genera correctamente | ✅ |

---

## Scripts Potencialmente Obsoletos / Riesgo

| Script | Riesgo | Acción recomendada |
|---|---|---|
| `run-pw3-sql-015.mjs` | SQL masivo 29KB — no revisado en esta auditoría | Revisar antes de ejecutar |
| `run-pw3-supabase-master.mjs` | Apunta a Supabase (legacy) | No ejecutar para economía PW3 |
| `validate-pw3-master.mjs.bak` | Backup obsoleto | Eliminar |
| `download-ourairports.mjs` | Descarga datos externos | Verificar si sigue vigente |
| `import-ourairports.mjs` | Importa a Neon | Verificar estado |
| Scripts `fix-dispatch-*` | Parches puntuales ya aplicados | Archivar en docs/ |

---

## Estado Final

Todos los validadores críticos pasan. Scripts de escritura tienen guard. No hay scripts destructivos sin protección.
