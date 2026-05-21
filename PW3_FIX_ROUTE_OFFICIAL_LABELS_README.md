# PW3 Fix Route Official Labels

Este hotfix normaliza los textos visibles del despacho para que no aparezca "Rutas oficiales de escuela".

## Resultado esperado

- Mostrar "Ruta oficial" como concepto único visible.
- Mantener la lógica interna de permisos por rango.
- No tocar ACARS.
- No tocar Neon ni ejecutar db-master/import-airports.
- No cambiar iconos.
- No introducir mojibake.

## Aplicación

```powershell
node scripts/pw3/fix-dispatch-route-official-labels.mjs
npm run lint
npx tsc --noEmit
npm run build
```
