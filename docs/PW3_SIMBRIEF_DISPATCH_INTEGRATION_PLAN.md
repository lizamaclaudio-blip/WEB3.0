# PW3 SimBrief Dispatch Integration Plan

Fecha: 2026-05-21

## Archivos a tocar

- `src/components/dispatch/DispatchRoomClient.tsx`
- `src/app/api/pilot/simbrief/route.ts`
- `src/app/api/simbrief/ofp/latest/route.ts`
- `src/lib/simbrief/aircraft-map.ts`
- `src/lib/simbrief/ofp.ts`
- `src/lib/dispatch/training-reservations.ts`
- `src/app/api/dispatch/training-reservations/route.ts`
- `scripts/pw3/validate-simbrief-dispatch-integration.mjs`
- `scripts/fixtures/simbrief-ofp-scte-scpf.json`

## Endpoints nuevos

- `GET /api/pilot/simbrief`
- `POST /api/pilot/simbrief`
- `POST /api/simbrief/ofp/latest`

## Contrato SimBrief

- Fetch server-side a:
  - `https://www.simbrief.com/api/xml.fetcher.php?userid=...&json=1`
  - o `...username=...&json=1`
- Normalizar OFP:
  - ruta, alterna, nivel, combustible, payload, pax/carga, flight number, origin/destination.
- Validar match con despacho actual:
  - origin y destination obligatorios.
  - aircraft/flight number con validación compatible.

## Flujo UI

1. Paso 3 muestra botón `Generar plan de vuelo en SimBrief`.
2. Abre SimBrief con prefill de ruta/aeronave/piloto.
3. Estado cambia y aparece `Cargar OFP`.
4. `Cargar OFP` consulta endpoint server-side.
5. Paso 3 queda read-only para oficial con datos OFP.
6. Solo con OFP válido se habilita continuar a paso 4.

## Datos requeridos del piloto

- `simbrief_username` y/o `simbrief_user_id`.
- Guardados en `pilot_profiles` (Neon) por usuario autenticado.

## Validaciones

- Usuario autenticado obligatorio.
- Username sanitizado.
- UserId numérico si viene.
- OFP debe coincidir con origen/destino del despacho.
- Para oficial: bloquear avance sin OFP cargado.

## No se tocará

- ACARS updater/installer
- ACARS desktop claim/finalize
- economía/wallet/ledger
- finalize Web
- HUD
- `globals.css`
- landing
- auth/login
- seeds globales
- reglas de rutas/categorías/rangos
