# Web 5.0 + 5.1 — cierre y preparación de publicación

16 de octubre de 2026. Continuación desde `b9bc48c`, rama
`codex/patagonia-wings-web4`. No se reinició ni descartó trabajo.
**No se considera abierta ni completamente operativa la comunidad.** Su código
está preparado; altas, entrega de identidad y administración humana siguen pendientes.

## Estado real por función

| Área | Comprobado | Pendiente / limitación |
| --- | --- | --- |
| Web 5.0 | Hero cinematográfico, narrativa, recorrido controlado, galería ampliable y recursos WPF auténticos conservados; idiomas y móvil revisados | QA sigue diferenciada de vuelo real; sin afirmación de Core Web Vitals de campo |
| Identidad | Marca principal **COPILOTO VECTOR**; TAKEOFF/HORIZON/COMMANDER; COMMANDER es la completa | Derechos finales por edición y contrato Claude todavía pendientes; sin precios |
| Navegación/SEO | Encabezados, pie, home, producto, metadatos, demo y páginas de correo corregidos | `/versiones#complete` y demás URLs históricas se conservan; capturas originales no se retocan |
| Contacto/interesados | Formularios y almacenamiento existentes conservados; validación/consentimiento/confirmación/baja y cola pasan tests | Preview limita destinatarios; la entrega anterior se documentó y no se repitieron mensajes ya enviados |
| Founders 10 | Persistencia real de un aviso QA verificada en la entrega anterior, consentimientos separados, deduplicación y baja probadas | Aviso nuevo requiere identidad verificada para confirmarse; no es participación; sorteo cerrado |
| Roadmap | Lectura pública disponible; 16 etapas y fecha nula; edición privada implementada | Edición real requiere moderador expresamente autorizado |
| Community Lab público | Tablero/filtros/lectura y rutas disponibles; propuestas solo moderadas, sin datos fabricados | Base actual sin propuestas; no se publicaron ideas de relleno |
| Registro/login | Backend protegido, retorno fijo por idioma y plantilla Auth preparados; cookie/sesión/roles cubiertos por tests | Alta web desactivada, entrega/confirmación/login reales no acreditados en este cierre |
| Votos/propuestas | Exigen cuenta verificada, sesión DB activa; límites, unicidad, retirada y moderación conservados | Interacción real de beta testers pendiente de abrir/verificar identidad |
| Administración | Código y SQL de aprobación, ocultación, respuestas, fusión y roadmap probados | **Cero moderadores** en DB; no se anuncia panel operativo para el titular |
| Correo Vercel | Transporte y controles existentes conservados. TLS/EHLO Node actual correcto, sin autenticación ni envío nuevo | No se confunde con prueba nueva de recepción o de Supabase Auth |
| Cloudflare | Build completo y dry-run correctos; 103 comprobaciones HTTP en workerd | No hay cuenta/URL remota; SMTP workerd falla; CPU Free y operaciones DB autenticadas remotas no verificadas |

## Identidad corregida

Se sustituyó COMPLETE como marca única en encabezado y pie, etiquetas, títulos,
Open Graph, JSON-LD, hero, recorrido, páginas de producto, textos de correo y
metadatos de confirmación/baja. El componente/anchor interno `complete` se reutiliza para
COMMANDER y mantiene enlaces históricos. No se borró información útil.
La distribución funcional de las tres ediciones sigue marcada como propuesta,
sin precios, checkout, PayPal, descargas, emisión de licencias o fechas de venta.

## Identidad y correo: no declarar abierto lo que no lo está

Auth respondió email habilitado, confirmación obligatoria y altas globales
permitidas. La ruta web sigue bloqueada por su flag y requiere ahora además
`VECTOR_COMMUNITY_CONFIRM_ORIGIN` HTTPS fijo. No se tomó un redirect del navegador.
El panel Supabase solicitó sesión; no se comprobaron SMTP personalizado ni URL
Configuration. Plantilla ES/EN/FR preparada, **no aplicada** al proveedor.
[Checklist exacto de activación segura](WEB51-AUTH-READINESS.md).

No se cambiaron el SMTP transaccional, su contraseña, DNS, DKIM, proveedor,
programador ni `pg_net`. No se enviaron correos nuevos, comerciales o a terceros.
La prueba TLS comparativa no incluyó credenciales ni operaciones de mensaje.

## Pruebas y auditoría

- Build normal Next/TypeScript correcto; OpenNext/workerd completo correcto.
- **77 tests Node** correctos, incluidos retorno fijo, registro cerrado sin
  configuración, IP Cloudflare confiable y no iniciar correo con presupuesto insuficiente.
- **103 comprobaciones HTTP workerd** correctas. Incluyen 503 deliberados cuando
  no hay secretos, no pruebas positivas de persistencia en Cloudflare.
- Revisión visual escritorio y móvil ES/EN/FR; ningún desbordamiento horizontal
  observado. Demo conserva controles, capítulos, pausa y zoom.
- No se alteró el esquema ni las políticas RLS. Se conservan las migraciones y
  suites SQL ya verificadas con rollback; no se volvieron a crear datos históricos.
- Estado DB actual: 0 propuestas, 0 moderadores, 0 avisos activos; 1 aviso QA
  retirado conservado. 7 correos enviados históricos, 0 pendientes/fallidos,
  0 cron activos y `pg_net` ausente.
- Asesores: dos vistas heredadas con privilegios de propietario, seis funciones
  heredadas con search_path mutable y extensión pública. Los esquemas privados
  de comunidad sin políticas de lectura mantienen denegación por defecto. No se
  presenta la auditoría como seguridad perfecta de toda la base.
- Dependencias: se corrigió el glob vulnerable introducido por el tooling del
  adaptador mediante parche compatible. Quedan seis avisos: cinco high del árbol
  ESLint/braces de desarrollo y uno moderate de csv-parse usado por el importador
  CLI heredado. No se aplicó `audit fix --force` ni se degradó Next para ocultarlos.

[Vistas de propietario](https://supabase.com/docs/guides/database/database-linter?lint=0010_security_definer_view),
[search_path](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable).
El acceso DB heredado con TLS sin verificación de certificado permanece fuera
de la validación de nuevas funciones; revisarlo antes de habilitar esas operaciones
en otro hosting. No se cambió a ciegas una conexión histórica sin prueba real.

## Cloudflare y costos

[Prueba completa, matriz y comandos](WEB51-CLOUDFLARE-TRIAL.md).
Se analizó toda la aplicación: 72 páginas, 73 handlers; no una portada exportada.
Paquete de 9.640 MiB sin comprimir, inferior a los 64 MiB actuales de Workers.
Free sigue limitado a 10 ms de CPU; no se acredita paridad remota gratuita.
El SMTP Nodemailer/App Suite que funciona en Node no pasó la prueba workerd.
Además, el dispatcher de 45 s no cabe en el grace period de 30 s de `waitUntil`;
se inhibe solo ese camino Cloudflare y se conserva la cola para un envío seguro.

Workers Free + Supabase Free tiene planes base de USD 0; es un candidato, no un
costo total de producción verificada. Workers Paid desde USD 5 puede resolver
presupuesto CPU, no automáticamente SMTP/Auth. Dominio y buzón existentes,
impuestos y excesos van aparte y sus facturas son desconocidas. **No se contrata
Vercel Pro**, no se migra la base y no se activan servicios de pago.

## Publicación: acciones pendientes

1. Crear cuenta Cloudflare Free por el titular y autorizar una prueba workers.dev
   separada, sin DNS. Introducir secretos por el almacén seguro, no por el chat.
2. Verificar CPU, arranque, sesiones, persistencia, acceso privado y DB remotos.
   Resolver SMTP o validar un dispatcher seguro separado con el mismo proveedor.
3. Completar Supabase Auth según el checklist; comprobar recepción y confirmación
   real, después abrir el flag. Designar y probar un moderador.
4. Resolver avisos heredados, backups/retención, responsable legal y textos finales.
   Founders formal requiere bases, países/edades y fechas aprobadas aparte.
5. Solo con aprobación posterior, configurar producción y su puerta SEO. Preview
   mantiene robots disallow, sitemap vacío y noindex en metadata/headers.
   No se modifican DNS ni Search Console en este cierre.

El [Preview de rama](https://web-30-git-codex-patagonia-52d73e-lizamaclaudio-blips-projects.vercel.app/)
se actualiza con el commit de cierre. La entrega adjunta la URL inmutable y SHA
verificados. El entorno Workers local se identifica como local; no se inventa una
URL Cloudflare pública ni se declara completada una migración sin cuenta.
