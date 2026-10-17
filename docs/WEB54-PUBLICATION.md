# WEB 5.4 — publicación informativa

Publicación inicial: 16 de octubre de 2026. Cierre y recuperación: 17 de octubre de 2026. Base: `79906f6`. Rama: `codex/patagonia-wings-web4`.

## Resultado

- Sitio oficial: https://www.patagoniaw.com/
- Integraciones ES / EN / FR: `/integraciones`, `/en/integraciones`, `/fr/integraciones`.
- Worker independiente: `patagonia-wings-web54-public`, Cloudflare Free.
- Versión publicada: `4bb10c89-5f40-4058-89c3-00d718063fa1`, al 100 %.
- La raíz sirve ahora los mismos archivos estáticos, con canonical a www y noindex. La redirección del Worker se conserva para rutas que llegan a él, pero no se afirma una redirección 308 de las páginas atendidas directamente por Static Assets.
- La URL temporal conserva canonical oficial y cabecera noindex; las páginas estáticas ya no ejecutan la redirección del Worker.
- QA conserva su Worker, configuración y noindex. `withered-fire-fcaf` no se modificó.

## Contenido y alcance real

Se conserva la experiencia cinematográfica, las capturas WPF y los tres idiomas. La identidad comercial es COPILOTO VECTOR, desarrollado por Patagonia Wings, con TAKEOFF / HORIZON / COMMANDER. COMMANDER representa la edición completa; no hay precios, pagos ni descargas públicas.

La nueva página de integraciones presenta STREAMER BAR, LIVE PANEL, GSX AUTO SYNC, DESPACHO / SimBrief, DIARIO, ACARS LOCAL, CAREER LOCAL y FLIGHT DEBRIEF. Se revisaron referencias del código y pruebas existentes de WPF; no se modificó ni recompiló WPF. La implementación interna no se presenta como validación universal con MSFS real.

VECTOR ATC LINK y la integración SayIntentions están **planificados**, sujetos a aprobación y capacidades de API. No se utilizan sus logotipos ni se afirma una asociación. No se enviaron solicitudes ni comunicaciones a SayIntentions.

## Contacto, formularios y comunidad

El contacto publicado es `mailto:patagonia@patagoniaw.com`, también disponible en soporte ES/EN/FR. El buzón fue verificado por su propietario en Web 5.3. En esta publicación no se enviaron mensajes adicionales ni se prometen confirmaciones automáticas.

Los formularios, altas, votos, publicaciones, administración, envíos y reintentos de correo están cerrados en este Worker informativo. Sus implementaciones anteriores se conservan en el repositorio y los entornos existentes; **no se declara operativa su persistencia pública en producción**. Founders 10 es informativo: no se abre el concurso, no se eligen ganadores ni se emiten licencias.

Community Lab es de lectura. El roadmap lee 16 elementos reales desde Supabase; las propuestas públicas devuelven cero elementos. La propuesta privada pendiente no aparece. El adaptador usa exclusivamente la clave publicable, campos públicos y las políticas RLS existentes. No utiliza una clave de servicio ni lee autores, cuentas o votos privados. No hubo migraciones ni cambios de RLS, roles, datos históricos o credenciales durante Web 5.4. La auditoría anterior se conserva; esta validación verifica las lecturas y bloqueos desplegados, no constituye una nueva auditoría exhaustiva de toda la base.

## DNS, correo y respaldo

Se inventarió la zona completa de Vercel antes de modificarla: 12 registros, sin paginación pendiente. Se comprobaron TLS, rutas antiguas, nameservers y ausencia de DS en la consulta pública. Los perfiles de piloto y reservas consultados estaban vacíos. El propietario decidió pausar los accesos antiguos conservando datos y rollback.

El propietario cambió en Registros.com los nameservers a `skip.ns.cloudflare.com` y `vida.ns.cloudflare.com`. La zona gratuita de Cloudflare conserva:

- Los cuatro MX `mx001` a `mx004.cloudus.xion.oxcs.net`, prioridad 10, solo DNS.
- SPF `v=spf1 include:spf.cloudus.xion.oxcs.net ~all`.
- CAA para `pki.goog`, `sectigo.com` y `letsencrypt.org`.
- Los destinos comodín anteriores, en DNS directo, y `_domainconnect` importado.

`www` está vinculado al Worker mediante Custom Domain. El A raíz **no se borró**: conserva `216.198.79.1` detrás del proxy y una ruta específica del Worker realiza la redirección. El tráfico de la web no depende del origen anterior para servir sus páginas.

Con autorización adicional expresa se sincronizaron SOLO los dos registros web de la zona antigua de Vercel: raíz A y www A → `104.21.36.166`, TTL 60. Esa dirección se obtuvo del DNS público y se probó por HTTPS antes del cambio. Esto atiende resolutores que todavía conservan la delegación anterior. Los registros de correo y CAA de Vercel se conservaron. Esta IP es un puente durante la propagación, no una nueva dirección de origen que deba mantenerse como configuración permanente fuera de Cloudflare.

No se rotó SMTP ni se modificó el proveedor del buzón. No se inventaron registros DKIM/DMARC: no estaban presentes en el inventario completo y su configuración sigue pendiente de valores y validación del proveedor. Conservar MX/SPF no equivale a haber repetido una prueba de entrega de correo después de esta migración.

El despliegue anterior de Vercel y sus datos se conservan. Respaldo inmutable:
https://web-30-o1299xtco-lizamaclaudio-blips-projects.vercel.app

Commit anterior de producción: `ccbbcd133395c1cd9922c152e0817a12993c3df2`. No se desplegó ni promovió una nueva versión en Vercel Production.

## Verificaciones

- Build Next.js / TypeScript / OpenNext correcto. El exportador admite solo 39 páginas públicas; cero páginas privadas exportadas.
- 86 pruebas web existentes + 8 pruebas nuevas de publicación: 94/94 correctas.
- ESLint focalizado: sin errores; el adaptador PublicLink presenta nueve advertencias por propiedades de Next retiradas intencionalmente antes de construir el enlace HTML.
- 39 páginas ES/EN/FR con HTTP 200, canonical oficial y sin noindex; 41 recursos referenciados cargados con HTTP 200.
- Robots y sitemap con el origen oficial; sitemap de 39 páginas. El Preview/QA continúa noindex. Indexable no significa indexado ni enviado a Search Console.
- Lecturas reales de Supabase: roadmap, propuestas públicas; sesión cerrada y sin privilegios administrativos.
- POST de solicitudes, Founders, publicaciones, sesión y correo rechazados con 403. Sin datos ni correos creados por estas comprobaciones.
- HTTPS y redirección raíz verificados contra Cloudflare con validación de certificados. Se distinguió la caché DNS local antigua del estado real del servidor; posteriormente el acceso normal de este equipo respondió desde Cloudflare.
- Revisión de escritorio 1440×900 y móvil 390×844, navegación y ES/EN/FR. Capturas en `artifacts/web54`. Se probó abrir y cerrar la captura ampliada del recorrido.

Evidencia HTTP inicial: `artifacts/web54/official-verification.json`. Validación vigente tras recuperación: `artifacts/web54/static-public-verification.json`. Medición de CPU: `artifacts/web54/profile-official-launch.json`: 56 eventos Tail capturados, máximo 3 ms de CPU, sin errores HTTP 5xx ni límites 429 en 151 solicitudes de la medición. La medición inicial del Worker informativo registró 43 eventos Tail, máximo 3 ms de CPU; se conserva por separado como `profile-public-launch.json`. Los eventos Tail son muestreados: no son un ensayo de carga ni garantía de todos los escenarios. No se afirma memoria máxima observada ni arranque frío forzado.

## Operación y costos

### Incidente comprobado y corrección del 17 de octubre

La revisión final encontró HTTP 429 y la página Cloudflare **1027**, correspondiente a la cuota diaria de invocaciones del plan Free. No era un problema de CPU por solicitud. No se atribuye el volumen a visitas reales ni a un Worker concreto sin consultar analítica de cuenta. No se contrató ningún plan.

La versión inicial tenía `run_worker_first: true`: cada página y recurso ejecutaba el Worker. La versión vigente usa `run_worker_first: false` y un directorio separado con solo las 39 páginas permitidas, recursos públicos, robots, sitemap y cabeceras. No contiene páginas privadas, RSC, secretos ni respuestas de base de datos. Las páginas e imágenes se comprobaron funcionando **mientras las APIs seguían devolviendo 429/1027**, evidencia real de que la presentación pública ya no depende de esa cuota. El marcado React, la galería y las animaciones se conservan.

Validación vigente: 39 páginas con HTTP 200 y canonical www, 41 recursos HTTP 200, imagen y tres hojas CSS con revalidación 304. Se corrigió también el fallo previo que convertía respuestas 304 de imágenes/estilos en páginas 404.

Las cuatro APIs públicas consultadas siguen limitadas hoy. Por ello no se declara disponible actualmente su consulta en vivo a Supabase ni una nueva validación de RLS remota. Las lecturas de 16 hitos y los bloqueos 403 descritos arriba corresponden a la comprobación inicial anterior a la cuota; los bloqueos de código siguen cubiertos por pruebas. El roadmap HTML conserva contenido editorial identificado; no se presentan datos de caché como lectura actual de base de datos. El contacto directo por `mailto` está visible; formularios y registro siguen cerrados.

Los límites dinámicos se renuevan a las 00:00 UTC según Cloudflare. Queda revisar las APIs después de la renovación e identificar en analítica qué tráfico agotó la cuota compartida de la cuenta. No se ha preparado una tarea automática ni se ha modificado otro Worker.

Las mediciones de CPU citadas son anteriores a este incidente y no prueban disponibilidad actual. El último muestreo anterior a la corrección estática (`profile-official-cache-fixed.json`, versión `f3640020`) conserva 18 eventos de las rutas seleccionadas; no obtuvo muestras de las APIs. La entrega estática vigente no necesita ejecutar ese script para servir HTML/imágenes. Memoria real máxima no observada.

Referencias oficiales: https://developers.cloudflare.com/workers/observability/errors/ y https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/.

La publicación sirve directamente los HTML y recursos generados por Next.js, más un adaptador pequeño de lecturas públicas. La navegación pública usa enlaces de documento para no depender de solicitudes RSC al Worker. QA mantiene la navegación Next habitual. Conserva componentes e interacción; no reemplaza la web por capturas. No ejecuta el servidor completo de Next.js ni rutas privadas en cada visita.

Cloudflare Workers Free: hasta 100.000 solicitudes diarias y 10 ms de CPU por invocación; memoria límite 128 MB. Referencia: https://developers.cloudflare.com/workers/platform/limits/

Costo adicional de alojamiento esperado dentro de esas cuotas: **USD 0/mes**. No se contrató un plan. El dominio y el buzón tienen sus condiciones ya contratadas, cuyo costo no se inventa aquí; los límites y continuidad de Supabase Free también deben vigilarse. No se garantiza capacidad ilimitada.

## Reproducción y rollback

Compilar para el dominio oficial: `npm run cf:build:official`. Probar: `npm run test:web4` y `npm run test:web54`. Verificación vigente: `node scripts/cloudflare/verify-static-public.mjs`. El verificador anterior `verify-public.mjs --official` corresponde a la arquitectura previa y exige APIs disponibles y redirecciones del Worker.

Para publicar cambios de código conservando rutas y DNS, usar `wrangler versions upload --config wrangler.official.jsonc --keep-vars`, revisar la versión obtenida y desplegarla con `wrangler versions deploy`. Los triggers requieren una operación separada; no ejecutar un deploy con el config QA sobre los artefactos de producción.

Rollback de contenido: volver a una versión pública conocida del Worker mediante Versions. Para volver a la plataforma antigua completa, primero revisar la decisión de reabrirla; restaurar el CNAME www `be4995af37b78d80.vercel-dns-017.com` y raíz A `216.198.79.1` en ambas zonas según el inventario, retirar la ruta/custom domain correspondientes y validar TLS, correo y cachés. No basta con volver a los nameservers antiguos porque sus dos registros web fueron sincronizados con autorización.

## Pendientes deliberados

Activación pública de formularios, Auth/comunidad privada, reintentos periódicos, DKIM/DMARC y condiciones comerciales definitivas siguen fuera de esta publicación informativa. Pagos, instaladores, sorteos, cron y pg_net continúan desactivados. La ficha inglesa preparada está en `docs/SAYINTENTIONS-DEVELOPER-KEY.md`; requiere revisión del propietario antes de enviarla.

## Archivos principales modificados

- Publicación: `wrangler.official.jsonc`, `wrangler.official-stage.jsonc`, `wrangler.public.jsonc`, `scripts/cloudflare/build.mjs`, `public-assets.mjs`, `static-site.mjs`, `worker-public.mjs`; guardia del Worker QA en `worker.mjs`.
- Lecturas públicas: `scripts/cloudflare/api-public.ts` y `read-public-data.ts`.
- Presentación: `src/components/web4/Integrations.tsx`, páginas `integraciones` ES/EN/FR, `Chrome.tsx`, `Information.tsx`, `Marketing.tsx`, `CommunityLab.tsx` y sus páginas.
- Navegación estática: `PublicLink.tsx` y los imports de los componentes web; el comportamiento Next original se conserva cuando la variable de compilación está desactivada.
- SEO: `src/app/layout.tsx`, `robots.ts`, `sitemap.ts`, `src/lib/web51/site-policy.ts` y rutas públicas.
- Validación: `tests/web4/public-launch.test.mjs`, `locale.test.mjs`, verificadores `verify-public.mjs` / `verify-static-public.mjs`, inventario `audit-web54.mjs` y muestreo `profile-public.mjs`.
- Entrega: este informe, `SAYINTENTIONS-DEVELOPER-KEY.md` y evidencias públicas seleccionadas en `artifacts/web54`.

No se modificaron archivos del ejecutable WPF ni se agregaron dependencias.
