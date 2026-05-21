# PW3 Fix Dispatch Room Route Helpers

Corrige errores TypeScript en `src/components/dispatch/DispatchRoomClient.tsx`:

- `Cannot find name 'isOfficialRouteCategory'`
- `Cannot find name 'routeCategoryDisplay'`

También mantiene la regla UI: categorías internas como `TRAINING`, `SCHOOL`, `CADET` o `SCHOOL_OFFICIAL_ROUTE` se muestran como **Ruta oficial**, no como training visible.

## Aplicación

```powershell
node scripts/pw3/fix-dispatch-room-route-helpers.mjs
npm run lint
npx tsc --noEmit
npm run build
```
