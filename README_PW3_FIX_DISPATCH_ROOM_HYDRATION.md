# PW3 Fix Dispatch Room Hydration

Corrige el hydration mismatch de `/dispatch/room` donde el servidor renderizaba `Búsqueda` y el cliente cambiaba a `Ruta` al leer `window.location.search`.

## Causa

`DispatchRoomClient` estaba tomando `mode` desde `window.location.search` durante el primer render del cliente. En SSR el servidor no tenía `window`, por lo que renderizaba `training_free`; el cliente veía `official_route` y cambiaba los textos del paso 1.

## Solución

- `src/app/dispatch/room/page.tsx` lee `searchParams` del servidor.
- Pasa `initialMode` e `initialAircraftId` a `DispatchRoomClient`.
- `DispatchRoomClient` ya no depende de `window` para el primer render.

## Aplicación

```powershell
node scripts/pw3/fix-dispatch-room-hydration.mjs
npm run lint
npx tsc --noEmit
npm run build
```

No toca ACARS, Neon, SQL, íconos ni diseño global.
