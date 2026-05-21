# PW3 Dispatch ICAO Flag Badge Fix

Este parche corrige el despacho para que los ICAO usen el componente global `IcaoFlagBadge`, el mismo patrón de la repo anterior, en vez de un badge local tipo `CL SCPF`.

## Aplica

```powershell
node scripts/pw3/fix-dispatch-use-icao-flag-badge.mjs
npm run lint
npx tsc --noEmit
npm run build
```

## Qué hace

- Importa `src/components/ui/IcaoFlagBadge` en `DispatchPageShell.tsx`.
- Elimina el helper local `AirportBadge` si existe.
- Reemplaza `<AirportBadge ident={...} />` por `<IcaoFlagBadge icao={...} size="sm" />`.
- No toca ACARS, Neon, db-master ni import-airports.

## Regla visual

Todo ICAO visible en despacho debe salir con el componente global de bandera + código.
