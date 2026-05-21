# PW3 Dispatch Rank Flow Fix

Este parche corrige el flujo visual del despacho:

- Todas las tarjetas/acordeones inician cerradas.
- La lista de aeronaves disponibles se muestra antes que las rutas.
- Las aeronaves disponibles son las devueltas por `/api/fleet/available`, es decir: ubicación actual + AVAILABLE + permisos/rango del piloto según backend.
- Primero se selecciona aeronave; después se muestran rutas oficiales compatibles con esa aeronave.
- Se elimina la sección duplicada “Aeronave compatible”.
- Todo ICAO visible del despacho usa `IcaoFlagBadge` global.
- Si falta ubicación temporalmente se muestra “Cargando ubicación...”; si falta realmente, “Sin ubicación”.
- No toca ACARS, Neon, db-master ni import-airports.

Validar después de copiar:

```powershell
npm run lint
npx tsc --noEmit
npm run build
```

Nota: para que `/dashboard` inicie siempre en HUB Center hace falta ajustar el componente que controla los tabs del dashboard, no `DispatchPageShell.tsx`.
