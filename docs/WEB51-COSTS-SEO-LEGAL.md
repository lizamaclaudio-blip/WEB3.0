# WEB 5.1 — infraestructura, SEO y preparación legal

**Actualización posterior de esta revisión:** no contratar Vercel Pro.
Consultar [la prueba real de Cloudflare y sus bloqueos](WEB51-CLOUDFLARE-TRIAL.md)
y [el cierre final](WEB51-FINAL-CLOSURE.md). Workers Free se compiló y ejecutó
localmente; no se creó cuenta ni se acreditó paridad remota de todas las funciones.

Revisión: **16 de octubre de 2026**, hora de Chile. Documento interno del
repositorio: no se importa en componentes, APIs públicas ni metadatos. Los
importes siguientes son de infraestructura, **no precios de VECTOR**. No se
contrataron servicios, cambiaron planes, migró alojamiento, modificó DNS ni
activaron ventas o comunicaciones masivas durante esta revisión.

## 1. Situación comprobada y límites de la evidencia

| Servicio | Comprobación de solo lectura | Resultado |
| --- | --- | --- |
| Vercel | CLI 64.1.0, GET del equipo vinculado; salida filtrada a `billing.plan` | **Hobby** |
| Supabase | MCP `get_project` y `get_organization` de la organización correspondiente | **Free / tier_free**; proyecto activo, región São Paulo, PostgreSQL 17 |
| Uso facturable Vercel | API de cargos, período 1–15 de octubre UTC | No disponible: respondió `404 Plan not found`; no se interpreta como consumo cero |
| Uso Supabase | El resultado MCP de plan no incluye mediciones de almacenamiento, transferencia ni MAU | **Consumo actual no cuantificado en este informe** |
| Dominio y buzón App Suite contratado | Sin acceso a la factura comercial del proveedor | Costo contractual pendiente de confirmar; no se presume gratuito |

No se consultaron correos, contraseñas, claves, datos de usuarios ni detalles
de facturación personal para obtener estos resultados. El plan actual se
verificó nuevamente; no se deduce del nombre del proyecto.

### Vercel y el prelanzamiento comercial

Hobby se limita a uso personal no comercial. Las reglas incluyen anunciar la
venta de productos dentro del uso comercial; quitar checkout no convierte una
campaña de captación para un producto de pago en un proyecto personal. **Antes
de publicar este prelanzamiento en Vercel, autorizar Pro o confirmar por escrito
otra elegibilidad con Vercel.** No se cambió el plan. Esta conclusión se aplica
al propósito comercial, no solo al tráfico. [Reglas de uso oficiales](https://vercel.com/docs/limits/fair-use-guidelines).

Hobby incluye, entre otras cuotas, 100 GB de transferencia, un millón de
invocaciones, 4 horas de CPU activa, 360 GB-h de memoria y 5.000 transformaciones
de imagen. Son cuotas del plan, no saldo disponible de esta cuenta. Al superar
límites pueden suspenderse recursos; no se promete continuidad gratuita.
[Límites Hobby](https://vercel.com/docs/plans/hobby).

Pro parte de **USD 20/mes**, con crédito de uso de USD 20; no se descuenta ese
crédito del precio fijo para anunciar un plan gratis. Se suman asientos y
consumos fuera de lo incluido cuando correspondan. La tarifa actual anuncia CDN
de tasa fija: evitar trasladar supuestas cuotas históricas de Pro a un presupuesto
sin verificar la factura. [Precios Vercel](https://vercel.com/pricing).

### Supabase y correo

Free incluye 500 MB de base, 50.000 MAU, 5 GB de egreso no cacheado, 5 GB cacheado
y 1 GB de archivos; puede pausarse tras una semana inactivo y carece de backups
automáticos. Pro parte de **USD 25/mes** e incluye crédito suficiente para un
proyecto Micro, 8 GB de disco, 100.000 MAU y backups diarios de siete días.
Proyectos adicionales, ampliaciones y excesos pueden sumar cargos. [Precios Supabase](https://supabase.com/pricing).

Un registro de interesados no equivale automáticamente a un MAU de Auth:
depende de si el visitante inicia sesión. La comunidad verificada sí necesita
presupuestar autenticaciones, envío de verificación y abuso. El SMTP por defecto
de Supabase no sirve para abrir una comunidad: está restringido a direcciones
autorizadas del equipo y a dos correos por hora. El SMTP de formularios que ya
funciona en la web **no prueba** que Supabase Auth tenga configurado ese mismo
transporte. [SMTP de Auth](https://supabase.com/docs/guides/auth/auth-smtp),
[límites de Auth](https://supabase.com/docs/guides/auth/rate-limits).

Conservar el buzón y la cola actuales; confirmar con el proveedor que permite
correo transaccional automatizado y sus cuotas diarias, por hora y por buzón.
No presupuestar campañas masivas con una cuenta de correo personal. DKIM y la
rotación SMTP siguen sujetos a configuración y autorización separadas; no se
reactiva el programador ni `pg_net`.

## 2. Presupuesto inicial y escenarios

**Estimaciones, no estadísticas de visitantes ni una factura real.** Moneda USD,
sin impuestos, diferencias de cambio, horas de desarrollo, renovación de dominio,
buzón contratado, backups externos ni eventuales excesos. Sea `E` el costo mensual
del correo contratado y `D` la renovación anual del dominio dividida por 12.
El total completo será el subtotal de la tabla **más E + D** y cualquier consumo
medido que exceda la cobertura elegida.

| Alternativa | Subtotal mensual estimado | Condiciones |
| --- | ---: | --- |
| Recursos actuales Hobby + Supabase Free | **0** de planes base | No es la recomendación para publicar una promoción comercial en Vercel; consumo y correo no incluidos |
| Vercel Pro + Supabase Free | **20** | Menor cambio técnico; confirmar holgura de base y asumir pausa/sin backup automático de Free |
| Vercel Pro + Supabase Pro, un Micro | **45** | Opción inicial más sólida para continuidad y recuperación |
| Cloudflare Workers Paid + Supabase Free | **5** | Solo después de validar una migración; Free de base conserva sus límites operativos |
| Cloudflare Workers Paid + Supabase Pro, un Micro | **30** | Ahorro nominal de hosting, con costo inicial de migración y pruebas pendiente |

Cloudflare Workers Paid tiene mínimo **USD 5/mes**, diez millones de peticiones
dinámicas y treinta millones de milisegundos de CPU incluidos; exceso a USD 0,30
por millón de peticiones y USD 0,02 por millón de ms de CPU. Activos estáticos
servidos como tales son gratuitos; el tráfico que entra a la caché de Workers
puede tener otra contabilización. No cobra egreso. Free limita CPU a 10 ms por
invocación y peticiones a 100.000/día, por lo que no se recomienda asumir que
SSR Next completo encaja en ese plan. [Precios Workers](https://developers.cloudflare.com/workers/platform/pricing/).

### Supuestos para dimensionar, sin pronosticar demanda

| Escenario de planificación por mes | Sesiones del sitio | Altas voluntarias nuevas | Cuentas comunitarias activas | Consecuencia a medir |
| --- | ---: | ---: | ---: | --- |
| Inicio | 1.000 | 100 | 50 | Comprobar confirmación, moderación y entrega con poco volumen |
| Crecimiento | 10.000 | 1.000 | 1.000 | Límites SMTP y escrituras de auditoría pueden importar más que el precio de Auth |
| Campaña amplia | 100.000 | 10.000 | 10.000 | Medir CDN, SSR, ráfagas de acceso y capacidad de moderación antes de promocionar |

Ejemplo propio: una media hipotética de 2 MB transferidos por sesión produce
2/20/200 GB en esos tres escenarios. **No es el peso medido de la Home**: caché,
número de páginas, resolución, galería y repetición cambian el resultado. El
informe visual y de rendimiento registra las mediciones reales disponibles.

Reservar inicialmente, como presupuesto técnico de prueba, 8 KiB por interesado
con índices y auditoría, 8 KiB por idea y 0,5 KiB por voto. Por ejemplo, 10.000
interesados, 1.000 ideas y 50.000 votos ocuparían alrededor de 111 MiB con esos
supuestos, **más** datos existentes, Auth, outbox, versiones de filas y otros
índices. Medir `pg_database_size`/tablas reales antes de compararlo con una cuota;
esta fórmula no certifica espacio libre ni reemplaza una prueba de carga.

Una confirmación y una bienvenida por alta darían hasta dos mensajes de ciclo
inicial; contactos, identidad comunitaria y avisos Founders son flujos diferentes.
No multiplicar esa estimación para ejecutar envíos. La cola debe respetar los
mensajes ya entregados y el consentimiento de cada propósito.

### Crecimiento gradual propuesto

1. Publicar solo con plan comercial elegible, presupuesto aprobado y medición
   de la capacidad real de base/buzón. Revisar límites de gasto y alertas sin
   activarlos automáticamente en esta entrega.
2. Medir semanalmente CPU, invocaciones, transferencia, tamaño de base, MAU,
   errores SMTP, cola pendiente, propuestas y reportes; no registrar contenidos
   personales en logs de infraestructura.
3. Definir avisos internos al 70 % y revisión al 85 % de una cuota: umbrales
   operativos propuestos, no alertas ya configuradas ni funciones al usuario.
4. Pasar Supabase a Pro cuando la continuidad y recuperación lo requieran,
   sin esperar necesariamente a llenar disco. El presupuesto de spam y la
   capacidad humana de moderar también son límites.
5. No usar adjuntos ni Realtime para la primera comunidad. Reutilizar activos
   optimizados, páginas cacheables y consultas paginadas. Mantener cuotas por
   identidad, límites por solicitud y controles de acceso incluso en planes pagos.

## 3. Vercel frente a Cloudflare

| Aspecto de este repositorio | Vercel actual | Workers + OpenNext, alternativa por evaluar |
| --- | --- | --- |
| Next 16.4.1, App Router, route handlers | Ya compila y tiene Preview | OpenNext declara soporte de Next 16 y sus versiones menores/parches; requiere build propio y pruebas |
| React Server Components y páginas dinámicas | Flujo actual conservado | Revisar SSR, caché, invalidación y límites del Worker con la configuración real |
| SMTP 465, Nodemailer, TLS y `after()` | Transporte existente, conservar | Prueba de compatibilidad obligatoria; no asumir Node completo por habilitar `nodejs_compat` |
| Supabase HTTPS/RLS/cola | Reutilización directa | Se puede conservar Supabase; revisar secretos, sesiones, red y cabeceras del nuevo origen |
| Optimización de imágenes | Next Image existente | Configurar Images o una estrategia equivalente y presupuestarla por separado |
| Protección de Preview | Vercel Authentication existente | Configurar protección equivalente antes de compartir páginas privadas |
| Dev local Windows | Flujo actual probado | Preferir CI Linux/WSL para prueba del adaptador; Windows no tiene garantías completas |
| Esfuerzo | Bajo al conservar infraestructura | Prueba técnica y migración estimadas en **2–5 días de ingeniería**, no cotización ni trabajo realizado |

OpenNext distingue su adaptador Workers del antiguo `next-on-pages`. Declara
App Router, route handlers, SSR, SSG y `after()` compatibles, pero señala
limitaciones específicas —incluido Node middleware—. Su texto sobre 3/10 MiB
gzip difiere de la documentación actual de Cloudflare, que indica 64 MiB sin
comprimir para ambos planes; se usó esta última y se midió el paquete real.
La compatibilidad declarada no equivale
a haber ejecutado esta aplicación en Workers. [Compatibilidad OpenNext](https://opennext.js.org/cloudflare),
[guía Cloudflare Next.js](https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/).

**Pages estático por sí solo no sustituye esta web**: formularios, identidad,
moderación y endpoints necesitan servidor. Workers ofrece sockets salientes con
restricciones, como bloqueo del puerto 25; eso no demuestra ni descarta el
funcionamiento de nuestro SMTP 465. Hacer una prueba aislada de TLS, tiempos y
errores antes de decidir. [Next en Pages](https://developers.cloudflare.com/pages/framework-guides/nextjs/),
[sockets Workers](https://developers.cloudflare.com/workers/runtime-apis/tcp-sockets/).

**Recomendación actualizada:** conservar el Preview y reutilizar Supabase.
No contratar Pro por decisión del titular. Ensayar el Worker preparado en una
cuenta Cloudflare Free cuando exista, resolver correo/Auth y medir CPU antes
de decidir su viabilidad. Paid desde USD5 es solo una referencia si Free no
alcanza; no resuelve automáticamente las incompatibilidades. Ningún plan cambió.

## 4. SEO: estado inicial, preparación y publicación

La revisión del código base encuentra `metadataBase` canónico en
`https://www.patagoniaw.com`, canonical y hreflang ES/EN/FR/x-default por ruta,
Open Graph y Twitter Cards. `robots.ts` usa allowlist; `sitemap.ts` omite Preview.
El layout marca Preview `noindex,nofollow`. La transformación Web 5.0 ya usa
imágenes WebP, tamaños declarados y capturas con procedencia QA.

### Lista de implementación/verificación Web 5.1

- Ampliar la allowlist y sitemap con las páginas públicas realmente existentes:
  inicio, descubre/producto, ediciones, roadmap, comunidad, Founders y novedades,
  sin borrar rutas históricas útiles. Usar ES/EN/FR y canonical coherentes.
- Las ideas individuales solo deben ser indexables cuando estén publicadas;
  no incluir propuestas pendientes, identidad, correos ni datos de moderación.
- Mantener metadata `noindex` y protección en todos los Preview; añadir
  `X-Robots-Tag` de defensa en profundidad para admin, API, páginas de confirmación,
  baja y datos personales. `robots.txt` **no controla acceso**.
- Una restricción de rastreo impide a Google leer `noindex`; para entornos
  privados, la protección del despliegue es la barrera principal. No afirmar
  desindexación solo por `Disallow`. [Noindex y rastreo](https://developers.google.com/search/docs/crawling-indexing/block-indexing).
- Metadatos y tarjetas sociales específicos por página, incluido enlace de
  idea pública. No publicar una tarjeta con contenido aún sin moderar.
- JSON-LD Organization/WebSite es apropiado si sus datos son verdaderos;
  SoftwareApplication puede describir desarrollo. **No usar Offers, precio,
  disponibilidad de compra, estrellas o AggregateRating inventados.** No
  prometer resultados enriquecidos solo por añadir datos estructurados.
- Conservar hreflang recíproco y canonical propio de cada idioma; no enviar
  inglés/francés al canonical español. Evitar canonical de URLs Vercel.
  [Hreflang](https://developers.google.com/search/docs/specialty/international/localized-versions),
  [canonical](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls).
- El `<main lang>` está localizado; el HTML raíz del proyecto base es español.
  Si se conserva esta arquitectura, documentar ese límite y verificar que los
  lectores de pantalla reciben el idioma correcto en contenido y navegación.
- Comprobar teclado, foco, contraste, formularios, acordeones, galerías,
  reducción de movimiento y anchos móviles. Las mediciones locales de carga
  no son evidencia de Core Web Vitals de campo.

Este archivo registra el análisis y las tareas de preparación. La comprobación
del **build final**, páginas, headers, sitemap y Preview pertenece al informe
general Web 5.1; no presenta las recomendaciones como comprobaciones ya realizadas.

### Acciones manuales antes de indexar

1. Aprobar el Preview final y el plan comercial; autorizar aparte producción.
2. Confirmar con el titular el dominio público y si el apex debe redirigir a
   `www`. Probar HTTPS y una redirección permanente única; esta revisión no
   modifica ni certifica los registros DNS o redirecciones de producción.
3. Crear/verificar la propiedad en Google Search Console con la cuenta del
   titular. Si requiere un TXT, preparar su valor exacto y pedir autorización
   antes de tocar DNS; nunca inventar token de verificación.
4. Tras publicar y comprobar el origen, enviar
   `https://www.patagoniaw.com/sitemap.xml`, inspeccionar una URL de cada idioma
   y revisar canonical elegido, rastreo y cobertura. [Sitemap oficial](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap).
5. Monitorizar resultados posteriores. **No hay evidencia de indexación de
   Google ni garantía de posicionamiento en esta entrega.** No registrar Preview
   como propiedad pública ni enviar su sitemap.

## 5. Founders 10 y privacidad: preparación, no apertura

Founders 10 es únicamente un **aviso voluntario de futura apertura**. Premio
previsto: diez licencias COMMANDER completas, una por persona ganadora. No es
participación válida, reserva de licencia, concurso activo ni derecho adquirido
a un premio. No hay compra requerida, pago, selección de ganadores ni resultados
simulados. No reutilizar el alta al aviso como entrada automática posterior.

Antes de activar el concurso, preparar y aprobar: identidad y domicilio del
organizador; países/edad elegibles; inicio, cierre y zona horaria; diez premios
y sus derechos/limitaciones; método de selección verificable; prevención de
duplicados; notificación, aceptación, suplencias, reclamación y entrega;
tratamiento de datos; publicación de resultados con datos mínimos; resolución
de conflictos y exclusiones geográficas. Revisar la normativa de cada territorio
objetivo. SERNAC exige informar bases/duración y, para sorteos, premios,
reclamación y resultados. [Orientación SERNAC](https://www.sernac.cl/portal/617/w3-article-57431.html),
[artículo 36](https://www.sernac.cl/portal/609/w3-article-52760.html).

### Datos mínimos y consentimiento

- Alta al aviso: nombre o alias, correo, idioma, país opcional y consentimiento
  específico. No pedir contraseña, domicilio, documento de identidad o fecha de
  nacimiento para una simple notificación.
- Aviso Founders y novedades comerciales son **dos propósitos distintos**.
  Casillas independientes, sin preselección; versión del texto y evidencia de
  consentimiento. Rechazar comercial no impide pedir solo el aviso Founders.
- Publicar solo el alias elegido en ideas, si el usuario decide usarlo. Correo,
  identidad interna, auditoría, reportes y moderación permanecen privados.
- Confirmación por correo y baja por propósito cuando estén verificadas.
  Aceptación SMTP no equivale a entrega; no decir que un correo llegó si no
  existe evidencia. No reenviar bienvenidas ya entregadas ni importar consentimientos.
- Evitar píxeles de seguimiento y marketing de terceros por defecto. El
  interés en un premio no autoriza anuncios generales; no basarse en una cuenta
  creada para presumir que hubo una venta. [Consentimiento y prospección CNIL](https://www.cnil.fr/fr/la-prospection-commerciale-par-courrier-electronique-sms-mms-et-automate-dappel).

### Aviso de privacidad y revisión jurídica pendientes

La Ley chilena 19.628 exige finalidad informada y consentimiento cuando
corresponde, admite revocación y reconoce derechos sobre los datos. Preparar un
aviso que identifique al responsable real, finalidades, base aplicable,
destinatarios/proveedores, transferencias, retención, derechos y canal de
contacto. No inventar una sociedad, número tributario o domicilio para rellenar
el aviso. [Texto vigente 19.628](https://www.bcn.cl/leychile/navegar?idNorma=141599).

La Ley 21.719 cambia el marco chileno y contempla una entrada diferida; revisar
la fecha y versión vigentes antes de abrir una campaña que atraviese esa
transición. Preparar desde ahora minimización, seguridad, responsabilidad y
gestión de derechos. Esta auditoría no confunde su texto de reforma con todas
las obligaciones ya vigentes hoy. [Ley 21.719 y transitorios](https://www.bcn.cl/leychile/navegar?idNorma=1209272).

El alcance internacional exige analizar RGPD cuando proceda, transferencias
con proveedores, representación y reglas locales de promociones. ES/EN/FR no
constituyen una certificación jurídica. El responsable debe acordar plazos
concretos de retención y borrado futuro —incluidas auditorías y respaldos— antes
de publicar; **no se borran ni alteran registros históricos en esta etapa**.

No se declara cumplimiento legal integral. Se preparan controles y contenidos
para revisión, con el concurso formal desactivado hasta contar con bases, fechas,
territorios elegibles y aprobación del titular.

## 6. Puertas de aprobación

**Preparado para revisar:** estructura pública, estados basados en evidencia,
plan de captación sin precios, comparación de infraestructura y checklist SEO/legal.

**Necesita acción del titular antes de producción:** aprobar publicación y
presupuesto de alojamiento comercial; confirmar datos legales del responsable,
política de retención y proveedor de correo; completar autenticación comunitaria
y acceso administrativo seguro donde la verificación final los marque pendientes;
revisar entrega/dominio DKIM; confirmar redirección canónica y Search Console.

**Necesita autorización aparte:** planes pagos, migración, DNS, rotación SMTP,
activación de reintentos periódicos, campañas masivas, concurso formal y, más
adelante, ventas/licencias comerciales. El contrato actualizado de activación
de Claude es requisito previo a endpoints definitivos de licencias.
