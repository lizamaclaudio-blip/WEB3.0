# Web 4.1 — producto y capturas

La web se actualizó desde una copia congelada del build WPF y sus fábricas de prueba.
No se editó ni compiló el proyecto de escritorio. MSFS permaneció abierto; ninguna
captura se conectó al simulador ni modificó registros del piloto.

## Estado comprobado

| Área | Estado y límites |
|---|---|
| Monitor | Horizonte, HSI, motores, tanques y 14 sistemas implementados; evidencia real previa del B350. La cadencia interna no equivale a FPS presentados certificados. |
| Despacho | OFP/caché y mapa OSM verificados previamente. Waypoints/SID/STAR dependen de metadatos del OFP; no es un editor AIRAC. Progreso observado necesita plan asociado y posición reciente. |
| Weather | METAR decodificado, TAF original y cálculo de viento implementados. NOAA es meteorología real, no el clima del simulador. La captura usa un boletín de prueba archivado. |
| Cabina / Ground | Nuevo layout King Air y figuras con recuentos agregados GSX. Posiciones individuales ilustrativas. Servicios y retención de recuento implementados; validación completa de embarque real pendiente. |
| Operaciones | Fases, avisos y cronología implementados y probados. La fase siguiente es un orden operativo, no una predicción. |
| Copiloto | Chat por reglas ES/EN/FR, checklists y voz local Windows. No reconocimiento de micrófono ni control automático del avión. Validación de voz en vuelo completo pendiente. |
| Diario / Replay | Historial, estadísticas y CSV/JSON implementados. Replay usa muestras registradas; 1× equivale a un minuto de vuelo por segundo. Sin posiciones no hay replay. |
| Análisis M27.2 | La copia capturada ya contiene secciones de despegue, aproximación y aterrizaje con dinámica/compresión/contacto. Captura de prueba; aterrizaje real y compatibilidad universal no verificados. |
| Pushback automático | Planificado; no existe canal operativo de movimiento. |
| PDF | No se anuncia como descarga disponible. |

Fuentes revisadas: docs/M23.7-fluidez-monitor.md, docs/M24-M25-copiloto-y-producto.md,
docs/M26/, docs/M27-diario-premium.md, docs/M27.1-viabilidad.md, workspaces WPF,
integraciones SimBrief/GSX, FlightReplay.cs, FlightDynamics.cs y pruebas actuales.
Los documentos anteriores pueden quedar superados por el build capturado.

## Capturas nuevas

14 renders WPF nativos de 1920×1080: inicio, despacho, monitor, Weather, cabina,
Ground, operaciones, copiloto, diario, Replay, aterrizaje, configuración, informe
y estadísticas. Se usan datos sintéticos explícitamente autorizados por el usuario.
Un pie visible indica «VUELO SIMULADO SIN CONEXIÓN · DATOS DE PRUEBA».
Los textos de rutas privadas se ocultaron solo en el árbol visual temporal antes
del render; no se retocaron datos reales ni bitmaps con generación artificial.

- Originales y manifiesto: artifacts/web41-wpf/fixture-captures/ (no versionados).
- WebP publicados: public/vector/current/, con procedencia y SHA256 de originales.
- 14 WebP: 1.85 MB en total; resolución original conservada.
- Iconos: recursos originales M26 del propietario, misma identidad de la app.
- Regeneración: VECTOR_SOURCE_ROOT + node scripts/web41-assets.mjs.
- DLL Desktop congelada: 9B9F9BBDD099D56FDCE76E3B5C0F2BF70B2A7AA14B56F4A7AB9800F5F7163FB3.
- DLL Core congelada: 509ABFA09F8FE25130FBF4971A23BCD4A0D9B018D4EA5AA506A1EF3529A2B9F1.

Las capturas son interfaz real con un vuelo simulado de demostración. No constituyen
evidencia de un aterrizaje real. Ninguna DLL ni componente del SDK se publica.
