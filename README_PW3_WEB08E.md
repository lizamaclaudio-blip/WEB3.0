# PW3 WEB08E - Acordeon de aeronaves e ICAO con bandera

Este hotfix corrige dos puntos visuales del despacho:

1. La tarjeta **Aeronaves disponibles en tu ubicacion operacional** queda como tarjeta desplegable con Mostrar/Ocultar, igual que las otras secciones.
2. Los ICAO dejan de mostrarse como badges simples tipo `SCPF` y pasan a usar un formato unificado con bandera, como el resto de la pagina.

## Aplicacion

Copiar el contenido del zip en la raiz de `web-3.0` y ejecutar:

```powershell
node scripts/pw3/apply-dispatch-accordion-icao-fix.mjs
npm run lint
npx tsc --noEmit
npm run build
```

## Confirmaciones

- No toca ACARS.
- No toca Neon data.
- No ejecuta db-master.
- No ejecuta import-airports.
- No cambia iconos globales.
- No introduce mojibake.
