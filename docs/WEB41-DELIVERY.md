# Copiloto Vector — Web 4.1

## Entrega

Portada centrada en el software, identidad azul petróleo/jade, seis módulos,
relatos visuales de preparación y revisión, compatibilidad y preguntas frecuentes.
La aerolínea permanece fuera del recorrido público; sus datos, autenticación y
ACARS se conservan. No se modificó el código de escritorio ni la lógica de vuelo.

Galería de siete etapas con 14 capturas WPF nuevas, ampliación a pantalla completa,
resolución original, controles de teclado, foco restaurado y movimiento reducido.
ES, EN y FR completos; cambiar idioma mantiene la página. Las capturas conservan
su interfaz original en español y llevan leyendas traducidas.

Se capturó un vuelo de demostración aislado, sin conexión a MSFS ni GSX, con datos
sintéticos autorizados. Los originales son PNG de 1920×1080; los WebP publicados
pesan 1,85 MB en conjunto. No se publican DLL, SDK, rutas privadas ni registros
reales. Procedencia: public/vector/current/provenance.json.

## Producto documentado

Monitor e instrumentos, OFP/OSM, Vector Weather, cabina/Ground, fases y eventos,
chat/checklists/voz local, diario/estadísticas, Flight Replay y análisis M27.2.
Cada capacidad distingue implementación, evidencia y validación real pendiente.
No se promete compatibilidad universal, 60 FPS certificados, reconocimiento de
micrófono, PDF disponible ni pushback automático. Detalle en WEB41-PRODUCT-AUDIT.md.

## Validación local

| Comprobación | Resultado |
|---|---|
| Next.js build | Correcto |
| TypeScript sin emisión | Correcto |
| Tests web | 10/10 |
| HTTP: páginas, recursos y fallos seguros de API | 47/47 |
| ESLint global | 0 errores; 37 advertencias heredadas |
| Navegador: 18 páginas × 3 tamaños | 54 vistas sin desbordamiento horizontal ni imágenes rotas cargadas |
| Tamaños | 1920×1080, 768×1024, 375×812 |
| Galería | 14/14 originales cargados a 1920 px; flechas, Home/End, Escape y foco comprobados |
| Navegación | Menú móvil y cambio FR→EN en producto y EN→FR en soporte comprobados |
| Formularios | Consentimientos desmarcados, tipo de consulta y envío desactivado comprobados |
| Consola durante revisión local | Sin errores ni advertencias capturados |

Pruebas y capturas de revisión: artifacts/web4-review/web41-* (locales, no
versionadas). Originales WPF: artifacts/web41-software-captures.zip.

## Supabase y límites antes de producción

El adaptador, validación, consentimiento opcional independiente, límites durables,
SQL con RLS y tokens de baja hash de un solo uso están preparados. Las pruebas
locales usan almacenamiento simulado. La persistencia real NO está validada ni
activada: Vercel denegó consultar la configuración (403) y falta una conexión de
gestión Supabase. Los formularios muestran el aviso y no envían ni guardan datos.

Antes de activarlos: conectar el proyecto autorizado, auditar tablas/RLS/grants,
probar la migración y persistencia en un entorno de prueba, confirmar contacto de
privacidad y política de retención. Confirmación de correo, proveedor de envío y
página final de baja pendientes. Ningún correo se envía desde esta entrega.
La migración de producción requiere autorización específica.

Rama de trabajo: codex/patagonia-wings-web4. Los push generan únicamente Previews.
Sin merge a main, publicación definitiva, cambios de DNS ni pagos. Antes de
producción faltan también la revisión final del propietario, contacto legal,
validación de indexación del Preview y las validaciones reales de producto
identificadas en la auditoría. No se han relajado protecciones de acceso.

Preview estable de la rama:
https://web-30-git-codex-patagonia-52d73e-lizamaclaudio-blips-projects.vercel.app

El resultado del despliegue remoto se registra después de verificarlo.
