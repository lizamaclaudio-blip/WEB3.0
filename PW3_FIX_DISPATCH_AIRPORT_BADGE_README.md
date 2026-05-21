# PW3 Fix Dispatch AirportBadge

Corrige el error:

`AirportBadge is not defined`

El script agrega un helper local `AirportBadge` en `src/components/dispatch/DispatchPageShell.tsx` para mantener el formato visual bandera + ICAO dentro del despacho.

## Aplicación

Desde la raíz de `web-3.0`:

```powershell
node scripts/pw3/fix-dispatch-airport-badge.mjs
npm run lint
npx tsc --noEmit
npm run build
```

## Alcance

- No toca ACARS.
- No toca Neon.
- No ejecuta db-master.
- No ejecuta import-airports.
- No cambia íconos globales.
