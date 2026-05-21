# PW3 Route Map Pan Fix — 2026-05-17

## Base usada
- Parche anterior `pw3_route_map_zoom_fix_patch.zip`, aplicado sobre el mapa real OpenStreetMap de rutas.

## Archivos tocados
- `src/components/airline/AirlineRouteMap.tsx`
- `src/components/airline/AirlineRouteMap.module.css`

## Motivo
- Permitir mover/desplazar el mapa con el mouse sin separar rutas, aeropuertos ni etiquetas de sus coordenadas.

## Cambios aplicados
1. Se agregó desplazamiento por mouse con Pointer Events.
2. El movimiento actualiza el viewport Web Mercator completo, no un overlay separado.
3. Las teselas OSM, líneas, puntos y etiquetas se recalculan juntas.
4. Se mantiene zoom `+ / −`.
5. El zoom recentra el mapa para evitar quedar perdido fuera del área operacional.
6. Se conserva la eliminación de la leyenda inferior.

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
