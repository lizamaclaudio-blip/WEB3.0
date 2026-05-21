# Patagonia Wings 3.0 — Certificaciones / mapa directo fijo y alineado

Base usada:
- `scripts.zip` como base oficial corregida por Claudio.
- Parche anterior de certificaciones con formato SUR Air como punto de partida.

Problema reportado:
- La linea directa se dibujaba como overlay sobre un iframe interactivo de OpenStreetMap.
- Al mover el mapa, el fondo se desplazaba pero la linea quedaba fija, por lo que se perdia la alineacion.
- La linea tampoco quedaba exactamente anclada a los puntos reales de los aeropuertos.

Cambio aplicado:
- Se reemplazo el iframe interactivo por un mapa estatico basado en teselas OpenStreetMap.
- La linea, puntos y etiquetas ICAO se proyectan con el mismo sistema Web Mercator que las teselas.
- El mapa ya no se puede arrastrar ni mover: queda fijo dentro de la tarjeta.
- La ruta sigue siendo directa origen -> destino.
- Se corrigieron coordenadas base de SCPF y SCTE para que el tramo SCPF -> SCTE quede mejor ubicado.

Archivos tocados:
1. `src/app/training/certifications/[aircraftCode]/page.tsx`
   - Se agrego generador local de mapa estatico.
   - Se agrego calculo Web Mercator para tiles, linea y marcadores.
   - Se elimino el uso de iframe interactivo en el mapa del trayecto.

2. `src/app/training/certifications/[aircraftCode]/CertificationCheckridePage.module.css`
   - Se agregaron clases locales para mapa estatico, teselas, linea, puntos, etiquetas y atribucion.
   - No se toco CSS global.

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
- Revision estatica de los archivos modificados.
- Revision para evitar restos del iframe anterior.
- Scan sin caracteres de reemplazo/mojibake.

Validacion recomendada en Windows:
```powershell
npm run build
```

Nota operacional:
- Este mapa queda fijo por diseno. Si mas adelante se quiere zoom/drag real, debe implementarse con un componente cliente de mapa y polyline anclada a coordenadas, no con overlay manual sobre iframe.
