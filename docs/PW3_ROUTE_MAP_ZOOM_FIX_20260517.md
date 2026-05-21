# PW3 Route Map Zoom Fix — 2026-05-17

## Base usada
- `public.zip` entregado por Claudio como base actual para este ajuste puntual.

## Archivos tocados
- `src/components/airline/AirlineRouteMap.tsx`
- `src/components/airline/AirlineRouteMap.module.css`

## Motivo
- Agregar zoom al mapa total de rutas.
- Mantener líneas, aeropuertos y etiquetas anclados a sus coordenadas al hacer zoom.
- Eliminar la leyenda inferior solicitada por Claudio.

## Cambios aplicados
1. El componente del mapa pasó a cliente (`"use client"`) para manejar zoom local.
2. Se agregaron controles `+` y `−` sobre el mapa.
3. El zoom reconstruye teselas OSM y overlay SVG con la misma proyección Web Mercator.
4. Se eliminó la leyenda inferior completa.
5. Se preservó el mapa fijo, sin arrastre manual.

## Qué NO se tocó
- `globals.css`
- landing
- Oficina
- Entrenamiento
- Certificaciones
- ACARS
- Supabase / Neon
- economía / wallet / ledger / salary / finalize
- catálogos de rutas o Excel

## Validación recomendada
- `npm run build`
- `npx tsc --noEmit`
- `npm run lint`
- `node scripts/pw3/validate-airline-routes.mjs`
