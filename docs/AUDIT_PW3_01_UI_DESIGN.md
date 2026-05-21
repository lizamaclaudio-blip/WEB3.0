# AUDIT PW3 01 — UI / DISEÑO
**Fecha:** 2026-05-21 | **Auditor:** Cascade (solo lectura)

---

## 1. Landing Pública (`src/app/page.tsx`)

- **Estado: OK**
- Componentes: `PublicHeader`, `LandingCounters`, `LandingCallout`, `LandingHeroImage`, `LandingPublicOverview`, `NearbyAttractionsPanel`, `PublicFooter`
- No expone módulos internos (dashboard, dispatch, training)
- Usa clases `pw-sur-page-header`, `pw-sur-container`, `pw-sur-eyebrow` — consistente con diseño SUR Air aprobado

## 2. Dashboard / Crew Center

- **Estado: OK (con observación)**
- Archivo principal: `src/components/dashboard/sur/DashboardClient.tsx`
- Usa formato aprobado SUR Air con `PilotCounters`
- Coins: lee `pw3_pilot_wallets.wallet_balance_usd` real (no hardcoded 0 desde E3.x)
- **Observación:** si wallet no existe en DB, `coins` devuelve 0 — no falla, graceful fallback

## 3. Oficina

- **Estado: OK**
- Ruta: `src/app/api/office/`
- Diseño de tarjetas aprobado por Claudio, no modificado en E4.x
- No se detectan cambios visuales en esta auditoría

## 4. Entrenamiento

- **Estado: OK**
- Ruta: `src/app/training/`
- Tabs: teoría, checkrides, habilitaciones
- Formato SUR Air mantenido, no tocado en E4.x

## 5. Certificaciones / Checkrides

- **Estado: OK**
- Mapa de certificaciones: no usa overlay desalineado (fix aplicado en sesión anterior)
- Mapa de rutas: usa OSM basemap real (fix aplicado)
- Formato SUR Air mantenido

## 6. Vuelos Regulares

- **Estado: OK**
- `src/components/airline/RegularFlightsView.tsx` filtra itinerary vs training
- No mezcla rutas de entrenamiento con itinerary

## 7. Dispatch (`DispatchPageShell.tsx` + `DispatchRoomClient.tsx`)

- **Estado: OK**
- "Operaciones disponibles" muestra 4 filas: Entrenamiento libre, Ruta oficial, Charter, **Carga** (nueva)
- Cargo muestra estado dinámico basado en rutas disponibles y rango del piloto
- `typeBadgeCargo` CSS definido (tono amber/amarillo, distinto de charter)
- CADET: cargo aparece bloqueado correctamente

## 8. Mapa de Rutas

- **Estado: OK**
- OSM basemap (no mapa ficticio)
- Rutas reales de la red operacional

## 9. Economy Page

- **Estado: OK**
- `src/app/economy/` con estimados por aeronave y ruta
- Visible en interfaz, no modificado en E4.x

---

## Checks Globales

| Check | Estado |
|---|---|
| Landing no expone módulos internos | ✅ |
| Dashboard formato aprobado | ✅ |
| Oficina tarjetas Claudio intactas | ✅ |
| Entrenamiento formato SUR Air | ✅ |
| Certificaciones formato SUR Air | ✅ |
| Mapa certificaciones sin overlay desalineado | ✅ |
| Mapa rutas OSM real | ✅ |
| globals.css no tocado en E4.x | ✅ |
| Íconos no cambiados en E4.x | ✅ |
| Sin mojibake (validate-economy: mojibake_hits=0) | ✅ |
| Sin páginas en texto plano sin CSS | ✅ |
| Cargo visible en Operaciones disponibles | ✅ |
| `typeBadgeCargo` CSS definido | ✅ |

---

## Observaciones No Bloqueantes

- 8 warnings de lint preexistentes (variables no usadas, `<img>` sin `<Image />`). Ninguno nuevo en E4.x.
- `src/app_globals.tmp` presente — archivo temporal, no afecta build.
