# PW3 WEB 08D — Ruta oficial / Itinerario fix

Este parche corrige textos visibles del despacho para que **Itinerario oficial** quede unificado como **Ruta oficial**.

## Qué hace

- Reemplaza textos visibles `Itinerario oficial` por `Ruta oficial`.
- Reemplaza `Itinerario oficial de aerolínea` por `Ruta oficial de aerolínea`.
- Ajusta el bloqueo CADET a: `Tu rango CADET aún no permite operar rutas oficiales de aerolínea.`
- Cambia botones/textos como `Confirmar itinerario` a `Confirmar ruta oficial`.
- No cambia enums ni datos de base.
- No toca Neon, ACARS, db-master ni import-airports.
- Escanea mojibake en archivos de despacho/dashboard revisados.

## Cómo aplicar

Copiar el archivo:

```txt
scripts/pw3/apply-route-official-fix.mjs
```

en el proyecto `web-3.0`, luego ejecutar:

```powershell
node scripts/pw3/apply-route-official-fix.mjs
npm run lint
npx tsc --noEmit
npm run build
```

## Revisión visual esperada

En el despacho debe quedar:

- `Ruta oficial`
- `Ruta oficial de aerolínea`
- `Selección de ruta oficial`
- No debe aparecer `Itinerario oficial` como sección o label visible.

## Regla operacional

- Entrenamiento libre: no mueve piloto ni aeronave.
- Ruta oficial: operación real de aerolínea; antes se llamaba itinerario.
- Charter oficial: separado.
- Traslado de aeronave: misión especial para mover aeronaves reales.
- Reposicionamiento del piloto: solo HUB Center.
