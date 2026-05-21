# PW3 - Correccion mapa real de rutas

## Base usada

Se trabajo sobre `public.zip` actual, que ya contiene la red completa de rutas/flota de 34 aeronaves.

## Motivo

El mapa total de rutas tenia un fondo geografico dibujado manualmente y no correspondia al mapa real usado en certificaciones. Se reemplazo por un mapa fijo basado en teselas OpenStreetMap, igual en principio al mapa de certificaciones: las teselas, rutas, puntos y etiquetas usan la misma proyeccion Web Mercator.

## Archivos tocados

- `src/components/airline/AirlineRouteMap.tsx`
- `src/components/airline/AirlineRouteMap.module.css`
- `docs/PW3_ROUTE_MAP_OSM_BASEMAP_FIX_20260517.md`

## Cambios aplicados

- Se elimino el basemap SVG manual/ficticio.
- Se agrego capa fija de teselas OpenStreetMap.
- Se mantiene mapa no interactivo para evitar desalineaciones por arrastre.
- Se proyectan aeropuertos y rutas con Web Mercator, igual que las teselas.
- Se deduplican visualmente pares ida/vuelta para que una misma ruta no se dibuje doble.
- Se conserva el formato de tarjeta SUR Air: header negro, cuerpo blanco, badges/leyenda compactos.

## No tocado

- `src/app/globals.css`
- landing
- Oficina
- Entrenamiento
- Certificaciones
- Dashboard base
- Iconos
- ACARS
- Supabase/Neon
- economia, wallet, ledger, salary, finalize
- catalogo de rutas
- Excel
- scripts de carga/validacion

## Validacion recomendada

```powershell
npm run build
npx tsc --noEmit
npm run lint
node scripts/pw3/validate-airline-routes.mjs
```
