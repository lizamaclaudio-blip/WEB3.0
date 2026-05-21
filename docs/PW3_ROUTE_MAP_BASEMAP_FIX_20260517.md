# PW3 Route Map Basemap Fix — 2026-05-17

## Base usada

Archivo recibido: `public.zip` con la base actual de Patagonia Wings 3.0 y la red completa de rutas/flota ya integrada.

## Motivo

El mapa de `Vuelos Regulares` mostraba rutas en un plano blanco/abstracto. Se solicitó colocar el mapa bajo las rutas, manteniendo el mapa fijo y sin repetir el problema anterior de líneas desalineadas sobre un iframe interactivo.

## Archivos tocados

- `src/components/airline/AirlineRouteMap.tsx`
- `src/components/airline/AirlineRouteMap.module.css`

## Cambios aplicados

- Se agregó un basemap SVG fijo dentro del mismo componente del mapa.
- Se dibujan masas terrestres referenciales de Sudamérica, Centroamérica, costa este de Norteamérica, Caribe e Isla de Pascua.
- Las rutas, aeropuertos, hubs y el mapa usan la misma función de proyección basada en lat/lon.
- Se mantienen pasajeros, carga y escuela local con sus estilos diferenciados.
- Se deduplican visualmente los pares ida/vuelta para no oscurecer dos veces la misma línea.
- Se agrega leyenda aclarando que el mapa es fijo y usa la misma proyección para rutas y aeropuertos.

## Qué NO se tocó

- `globals.css`
- landing
- Oficina
- Entrenamiento
- Certificaciones
- Dashboard base
- Iconos globales
- ACARS
- Supabase productivo
- economia
- wallet
- ledger
- salary
- finalize
- catalogo de rutas
- Excel
- scripts de Neon

## Validación recomendada

Ejecutar en Windows dentro de `web-3.0`:

```powershell
npm run build
npx tsc --noEmit
npm run lint
node scripts/pw3/validate-airline-routes.mjs
```

## Nota

No se usa `iframe` ni overlay manual sobre mapa interactivo. El mapa queda fijo y todos los elementos se calculan en la misma proyección SVG.
