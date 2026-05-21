# PW3 Remove Embedded Dispatch Notice

Elimina la franja duplicada sobre la Sala de Despacho que dice:

- Flujo de despacho activo
- Se mantiene dentro del Crew Center...
- Volver a despachos

El botón interno de la Sala de Despacho se mantiene.

## Aplicar

```powershell
node scripts/pw3/remove-embedded-dispatch-notice.mjs
npm run lint
npx tsc --noEmit
npm run build
```

No toca ACARS, Neon, SQL ni APIs.
