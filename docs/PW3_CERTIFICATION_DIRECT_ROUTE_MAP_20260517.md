# Patagonia Wings 3.0 — Certificaciones / mapa con ruta directa

Base usada:
- `scripts.zip` como base oficial corregida por Claudio.
- Se conserva el formato SUR Air de la pagina de certificacion ya restaurado en el parche anterior.

Cambio solicitado:
- Dibujar el trayecto como ruta directa en el mapa de `/training/certifications/[aircraftCode]`.

Archivos tocados:
1. `src/app/training/certifications/[aircraftCode]/page.tsx`
   - Se reemplazo el mapa centrado solo con marcador por un calculo local de bbox origen-destino.
   - Se agrego proyeccion Web Mercator local para ubicar una linea directa sobre el iframe de OpenStreetMap.
   - Se dibuja solo la ruta directa `origen -> destino`.
   - El alterno sigue apareciendo en la informacion del checkride, pero no se usa para ampliar el mapa directo.

2. `src/app/training/certifications/[aircraftCode]/CertificationCheckridePage.module.css`
   - Se agregaron estilos locales para la linea directa, halo blanco, puntos y etiquetas ICAO sobre el mapa.
   - No se toco `globals.css`.

No se toco:
- `src/app/globals.css`
- Oficina
- Entrenamiento
- Dashboard
- Landing
- Iconos globales
- ACARS
- Supabase
- APIs
- Economia / ledger / salary / finalize

Validacion realizada en este entorno:
- Revision estatica de archivos modificados.
- Scan sin caracteres de reemplazo/mojibake.

Validacion recomendada en Windows:
```powershell
npm run build
```

Notas:
- No se agregaron dependencias nuevas.
- No se usa Leaflet ni librerias externas.
- El mapa sigue usando OpenStreetMap embed como fondo y la ruta directa se superpone con SVG local.
