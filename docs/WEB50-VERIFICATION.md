# WEB 5.0 — Verificación

Fecha: 16 de octubre de 2026, America/Santiago. Rama: `codex/patagonia-wings-web4`. Base de comparación: Web 4.5, commit `6e32a700b4f67229eac22335c19a15f3e37148d1`, Preview `https://web-30-cp7mnb886-lizamaclaudio-blips-projects.vercel.app/`.

**Cierre de fase antes de Web 5.1:** implementación `6ef705e1bfe0430bc3ff1e8c5017cc439f1ad5d4`, enviada a la rama web. Preview READY: `https://web-30-abqlo5jpb-lizamaclaudio-blips-projects.vercel.app/`, destino Preview, sin promoción a producción. Se comprobaron visualmente sus imágenes cargadas, el rechazo del worker sin autorización (401) y el rechazo de formularios sin consentimiento (400). Las capturas del Preview están en `artifacts/web50-review/preview-desktop.jpg`.

## Cambio visual y comercial

La Home abandona la composición de texto junto a una captura y los bloques técnicos repetidos. La nueva portada ocupa una escena amplia, con titular expresivo, arte aeronáutico original y una interfaz WPF integrada. La ruta aérea es ambiental y decorativa, sin presentarse como seguimiento de un vuelo. La llamada principal conduce a la lista de interesados existente; la secundaria abre la demostración.

La narrativa recorre ANTES, DURANTE y DESPUÉS con capturas grandes y composiciones asimétricas. Academy, Performance, Aircraft Studio, Career y ACARS Local se presentan mediante beneficios y material verificado. CAREER ONLINE queda en una sección aspiracional explícitamente futura y sin implementar. No hay cifras de usuarios, reseñas ficticias, precios, compras ni urgencia artificial.

La página de producto conserva compatibilidad, capacidades y limitaciones técnicas, añadiendo cinco historias visuales. La galería ampliable reúne 19 capturas y añade miniaturas, controles de teclado y resolución original. Los CTAs y el acabado del formulario se unifican sin modificar sus campos, consentimiento ni lógica de envío. `/versiones` mantiene M31–M34 implementados en QA y añade M35, licencias e instalador, **en preparación**.

El recorrido de 36 segundos ofrece reproducción manual, pausa, reinicio, capítulos, línea de tiempo y ampliación modal. Se identifica como recorrido de capturas QA. No es un vídeo de acciones ni de vuelo real y no tiene audio. [Storyboard y material pendiente](WEB50-STORYBOARD.md). [Fuentes y recursos](WEB50-ASSETS.md). [Referencias estudiadas](WEB50-REFERENCES.md).

## Validación

| Comprobación | Resultado |
| --- | --- |
| Build optimizado Next 16.4.1 y TypeScript | Pasó |
| Pruebas de web, idiomas, formularios, correo, runner y recorrido | 61/61 |
| Páginas, recursos y rutas privadas locales | 70/70 |
| ESLint de archivos afectados y diff | Pasó |
| RLS y permisos de tablas heredadas, SQL real con ROLLBACK | 68/68 |
| Contención del programador, SQL real con ROLLBACK | 42/42; cero HTTP |
| Formularios, consentimiento y baja, SQL real con ROLLBACK | Pasó |
| Confirmación, cola e idempotencia de correo, SQL real con ROLLBACK | Pasó |
| Backoff, límites y ambigüedad SMTP, SQL real con ROLLBACK | Pasó |

No se alteraron políticas, esquemas, datos históricos, variables de entorno, SMTP ni DNS. No se enviaron correos. Comprobación final: siete trabajos históricos `sent`, cero pendientes, una fila de configuración y 17 hubs; `pg_net` ausente y programador desactivado. Las pruebas de correo usan transporte simulado; la entrega real ya verificada en Web 4.3 no se vuelve a disparar.

## Revisión visual e interacción

Capturas comparativas en `artifacts/web50-review/` (ignoradas por Git): `before-desktop.jpg`, `before-mobile.jpg`, `after-desktop.jpg`, `after-mobile.jpg`, `after-laptop-en.jpg` y `after-tablet-fr.jpg`.

Se revisaron escritorio 1440×1000, portátil 1366×768, tablet 820×1180 y móvil 390×844. Sin desbordamiento horizontal en esas vistas. El texto francés se adapta al ancho, las leyendas distinguen QA y arte conceptual y las capturas mantienen proporción. Se comprobaron el CTA de demostración, reproducción hasta la escena final, ampliación de Career, navegación por escenas, Escape y retorno del foco. El menú y el cambio de idioma mantienen las páginas equivalentes.

Las transiciones respetan `prefers-reduced-motion`; el reproductor empieza pausado y pausa al ocultar la pestaña o salir de pantalla. Se corrigieron la navegación desde el capítulo enfocado, la semántica del reproductor, el área de interacción del rango y el tamaño de las leyendas de evidencia. No se sustituye una captura ausente por otro módulo.

## Mediciones disponibles

Build local de producción, HTTP de loopback, sin simular red móvil ni ralentizar CPU. HTML Home ES: 78.206 bytes, 13.911 bytes en gzip; respuestas locales calientes de aproximadamente 6 ms hasta cabeceras. Son mediciones locales de servidor, no tiempos de carga del visitante.

Hero WebP: 122.530 bytes; variante optimizada a 640 px: 18.698 bytes. Las cinco capturas nuevas suman 538.798 bytes y se cargan de forma diferida. No se añade vídeo automático, biblioteca de animación ni dependencia. El hero utiliza preload y tamaños responsivos. Las cifras completas están en `artifacts/web50-review/performance.json`.

No se dispone de Core Web Vitals de usuarios reales ni se declara una puntuación Lighthouse. Las métricas de campo y la producción audiovisual completa quedan pendientes de tráfico y material auténtico respectivamente.

## Entrega y límites

Commit y push únicamente en la rama web de desarrollo; Preview de Vercel sin promoción a producción. La URL final y el SHA verificados acompañan a la entrega. WPF no se modificó ni ejecutó. No se activaron pagos, programadores, envíos masivos ni cuentas comerciales.

El runner de correo preparado en Web 4.5 permanece desactivado; host privado y permisos Linux reales siguen pendientes. Rotación SMTP y DKIM continúan sujetos a sus autorizaciones separadas. El QA de la aplicación no equivale a validación con MSFS real ni a disponibilidad comercial.
