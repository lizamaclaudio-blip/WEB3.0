# AUDIT PW3 00 — PROJECT SNAPSHOT
**Fecha:** 2026-05-21 | **Rama:** master | **Auditor:** Cascade (solo lectura)

---

## Estado Git

- **Único commit:** `331306d` — "Initial commit from Create Next App"
- **Archivos modificados (M):** README.md, package.json, package-lock.json, src/app/globals.css, src/app/layout.tsx, src/app/page.tsx
- **Eliminados (D):** src/app/favicon.ico
- **Sin trackear (??):** TODO el código de negocio (src/lib, src/components, src/app/api, scripts/, docs/, etc.)

> **Observación crítica:** El repo tiene un único commit inicial de CNA. Todo el trabajo real (1.6 MB+ de código) está sin commitear. Riesgo de pérdida total si el directorio se borra o corrompe.

---

## Tamaños

| Carpeta | Tamaño |
|---|---|
| `src/` | ~947 KB |
| `scripts/pw3/` | ~231 KB |
| `docs/` | ~491 KB |
| `docs/exports/` | ~321 KB (xlsx + zips) |

---

## Estructura `src/app/`

```
academy/   acars/   api/   dashboard/   dispatch/   economy/
fleet/     flights/ login/ mi-perfil/   mis-datos/  page.tsx
profile/   register/ routes/ settings/ training/
```

## Estructura `src/app/api/`

```
acars/       admin/       aircraft-photo/  airport-activity/
airport-metar/ airports/  auth/            city-hero/
dashboard/   dispatch/    economy/         fleet/
hubs/        office/      pilot/           places/
public/      reservations/ routes/
```

## Scripts `scripts/pw3/` (30 archivos)

Incluye: validate-airline-routes, validate-economy, validate-economy-db, validate-pre-acars-dispatch, export-economy-excel, export-airline-routes-excel, apply-economy-schema-to-neon, apply-pilot-initial-wallet-and-expenses, economy-model, y scripts auxiliares `_check-*`.

## Docs `docs/` (30+ archivos)

Changelogs, auditorías parciales, rutas, economía, wallet, dispatch, certificaciones, mapa.

---

## Archivos Sensibles / Higiene

| Item | Presencia | Riesgo |
|---|---|---|
| `.env.local` | **SÍ** en directorio raíz | No debe incluirse en ZIPs |
| `.next/` | Excluido por .gitignore | OK |
| `.cache/` | **SÍ** (sin trackear) | Excluir en próximos ZIPs |
| `node_modules/` | Excluido por .gitignore | OK |
| `public.zip` y `public (2).zip` | **SÍ** en raíz del proyecto | Limpiar |
| `pw3-economy-cierre-20260520-2200.zip` | **SÍ** en raíz | Limpiar |
| `supabase/` | **SÍ** (migrations/, pw3/) | Revisar si aplica |
| `src/app_globals.tmp` | **SÍ** archivo temporal | Eliminar |
| 36 README/PW3_*.md en raíz | **SÍ** | Mover a docs/ o eliminar |
| `validate-pw3-master.mjs.bak` | **SÍ** en scripts/ | Eliminar |
| BOM UTF-8 en archivos clave | **NO** detectado | OK |

---

## Base Auditada

Código en directorio `c:\Users\lizam\Desktop\PROYECTO PATAGONIA WINGS\web-3.0` tal como está el 2026-05-21. No se usaron parches externos ni zips anteriores.
