# Web 5.2 — primer despliegue real en Workers Free

16 de octubre de 2026. Continuación desde `95abc7d`, rama
`codex/patagonia-wings-web4`. Se reutilizaron Next/OpenNext y la base existente.

**QA público:** https://patagonia-wings-web51-qa.lizamaclaudio.workers.dev/

**Conclusión:** la web completa se despliega y funciona en Free; las escrituras
sintéticas y permisos se comprobaron realmente. **Todavía no se acredita un
lanzamiento comercial estable y completo sobre Free.** CPU, correo de identidad,
entrega transaccional y revisión móvil remota siguen pendientes.

## Cuenta, despliegue y conservación

- Wrangler 4.151.1 se autenticó por OAuth oficial, aprobado por el titular.
- El panel confirmó **Gratuito — Plan actual, 0 US$**. Ningún upgrade ni compra.
- Se creó exclusivamente `patagonia-wings-web51-qa`. La cuenta termina con dos
  Workers. ETag y fecha de modificación de `withered-fire-fcaf` son idénticos
  antes y después; no se modificó su código, configuración ni secretos.
- Última versión tras retirar el secreto de diagnóstico:
  `3d648378-312f-499e-a0dd-c0f28e8b2292`, al 100% en el Worker QA.
- Paquete final: 9869.63 KiB sin comprimir / 1881.74 KiB gzip; 128 assets.
  Arranque comunicado por Wrangler en el despliegue final: **24 ms**.
  El arranque no equivale a CPU por petición.
- Aplicación completa compilada: 72 páginas y 73 handlers. Las operaciones
  heredadas de aerolínea con DSN privado no se habilitaron ni se presentan como
  verificadas. No hay base duplicada, R2/D1 nuevo, cron o dominio comercial.
- Robots cerrado, sitemap vacío y metadata noindex conservados. Auth público,
  ventas, pagos, sorteo, instaladores y envíos automáticos continúan desactivados.

## Pruebas reales y sus límites

| Comprobación | Resultado |
| --- | --- |
| Build Next, TypeScript y OpenNext | Correctos; build con defaults privados locales eliminados del snapshot de entorno |
| Tests Node | **83 correctos**, incluidos redirects, exclusión de secretos de build y aislamiento QA |
| Suite HTTP remota final | **103/103**: ES/EN/FR, páginas, imágenes, SEO, sesión, acceso privado y entradas rechazadas |
| Flujo HTTP adicional | **7/7**: persistencia FR, Founders repetido, direcciones no autorizadas, origen y límite 429 |
| Permisos por API Supabase | **7/7**: dos lecturas públicas 200; tablas privadas 401; esquema privado 406; RPC de correo 401 |
| Estabilidad de lectura | **32/32**, dos clientes concurrentes; máximo observado de tiempo total del cliente 725 ms, no CPU |
| Lectura de roadmap | `source: database`, 16 etapas; no confundir el seed de respaldo anterior con esta lectura real |
| Escritorio y galería | Portada, ES/EN/FR, formulario inglés, ampliación, cambio de captura y cierre comprobados |
| Móvil remoto | **Pendiente**: el control de viewport no aplicó 390×844; el ancho efectivo siguió en 1265 px. No se etiqueta esa captura como móvil. El layout conserva la QA móvil anterior de Web 5.1 |

La prueba descubrió que `redirect: error` impedía la lectura comunitaria en este
runtime. Se cambió a `manual`: ninguna redirección reenvía credenciales y toda
respuesta RPC no exitosa sigue siendo rechazada. Tras corregirlo, el roadmap
dejó de usar el respaldo y Founders persistió correctamente. Auth conserva la
misma protección y sigue cerrado; sus pruebas positivas son unitarias, no un
ciclo de verificación real. No se modificó la política RLS para resolverlo.

## Persistencia comprobada en Postgres

Se permitió únicamente la dirección sintética
`qa-web52-20261016-a4f2@example.test`. El titular introdujo su clave Supabase
directamente como Secret en Cloudflare. No se descargaron secretos de Vercel:
la revisión automática rechazó esa copia. Las claves de Vercel no recuperables
no se rotaron. Se generó un hash independiente **solo para esta fixture**.
Los handlers de contacto y Founders rechazan cualquier otra dirección antes
de llegar a la base. Esta restricción evita duplicar usuarios reales con otro hash.

- Tres solicitudes nuevas: interés ES sin novedades; contacto EN con preferencia
  de novedades; interés FR con la misma preferencia.
- **Una sola suscripción** sintética pendiente. Repetir el opt-in no creó otro
  ciclo ni otro trabajo de confirmación.
- **Un solo aviso Founders** sintético pendiente, con consentimiento de aviso
  versionado y novedades false, incluso después de repetir el envío.
- El contacto EN se envió desde el formulario real del navegador, mostró
  confirmación de almacenamiento y se verificó después en SQL.
- Se conservaron las seis solicitudes históricas, las suscripciones anteriores
  y el aviso QA retirado de Web 5.1. No se eliminó ni actualizó información histórica.
- El total de enviados permanece en **7**. Tres trabajos sintéticos nuevos
  están **suppressed**, con **0 intentos**. Ningún trabajo pendiente, ningún envío.
- Cero moderadores; cero cron activos; `pg_net` ausente. No se abrió Founders.

SQL confirmó RLS en las tablas revisadas. `anon` y `authenticated` no tienen
SELECT en solicitudes, suscripciones ni tablas comunitarias privadas, ni EXECUTE
en RPC de escritura/administración/correo. `service_role` conserva únicamente
los permisos existentes; el outbox no tiene SELECT directo y se gestiona por RPC.
La prueba HTTP se hizo con una clave pública; no con una clave privilegiada.
No se simula que una sesión Auth real haya sido probada. Los avisos heredados
de vistas/funciones y dependencias de Web 5.1 siguen documentados y pendientes.

## CPU, memoria y conexiones

La cuenta Free declara 10 ms de CPU por petición. Cloudflare registró:

| Muestra | Invocaciones observadas | CPU mínima/máxima | Mediana / p95 | Más de 10 ms |
| --- | ---: | ---: | ---: | ---: |
| Versión final durante pruebas | 31 | 4 / 148 ms | 9 / 102 ms | 14 |
| Segunda muestra, lecturas y navegación | 47 | 2 / 191 ms | 12 / 79 ms | 25 |

Todas las invocaciones de esas muestras tuvieron outcome `ok`. No se observó
`exceededCpu` ni `exceededMemory`, pero **eso no convierte los picos en CPU
garantizada por Free**: Cloudflare documenta flexibilidad temporal del isolate.
Las muestras no son todas las peticiones ni una prueba de carga prolongada.

Memoria: límite de **128 MB por isolate**; no se obtuvo un pico de heap fiable.
No se sustituye ese dato por RSS local ni por memoria total del navegador.
Conexiones: máximo documentado de seis salientes simultáneas por petición.
Los flujos de persistencia usan RPC HTTPS acotadas y la prueba moderada fue estable;
no se certifica el límite bajo carga intensa ni el pool PostgreSQL heredado.

[Límites y flexibilidad de CPU](https://developers.cloudflare.com/workers/platform/limits/),
[telemetría de invocaciones](https://developers.cloudflare.com/workers/observability/logs/).

## Correo: diagnóstico y solución propuesta

Prueba privada temporal en el Worker real, sin contraseña SMTP, autenticación,
MAIL FROM, RCPT TO ni DATA:

- Nodemailer/App Suite 465 con TLS verificado: timeout en CONN.
- Socket nativo `cloudflare:sockets`, `secureTransport: on`, mismo hostname y
  puerto: **TLS, saludo 220 y EHLO 250 correctos**, después QUIT.
- No se debilitó TLS, no se cambió proveedor y no se envió correo.

Propuesta: conservar Nodemailer/plantillas/outbox y preparar un adaptador
`getSocket` respaldado por el socket TLS nativo, con puente de streams, cierre y
plazos acotados. Verificar SNI/certificado y TLS antes de marcarlo `secured`.
No está integrado ni activado. Aún necesita pruebas de autenticación y un único
mensaje autorizado al titular con recepción real. EHLO no demuestra entrega.
El dispatcher debe ejecutarse en una petición privada con presupuesto suficiente;
no trasladar su límite de 45 s al grace period de 30 s de `waitUntil`.
Sin cron ni reenvíos automáticos. Los tokens e idempotencia existentes se conservan.

Los endpoints de diagnóstico regresaron a 404 y su secreto temporal se retiró.
Quedaron exclusivamente `SUPABASE_SECRET_KEY` y el hash de QA, como secretos.
[TCP/TLS nativo](https://developers.cloudflare.com/workers/runtime-apis/tcp-sockets/).

## Costos y recomendación

**Alojamiento de esta prueba: USD 0/mes**, en Workers Free. Sin contratación.
Supabase reutiliza el proyecto existente, sin duplicarlo ni contratar otro plan.
Dominio y buzón contratados siguen costando según las facturas del titular;
no se anuncia costo total cero. Free mantiene 100.000 solicitudes/día y sus
demás cuotas; no se contrató exceso ni auto-upgrade.
[Precios de Workers](https://developers.cloudflare.com/workers/platform/pricing/).

**No conectar aún patagoniaw.com.** Primero reducir CPU de SSR/arranques en rutas
públicas y volver a medir; considerar servir páginas públicas precompiladas desde
Assets y conservar APIs/sesiones seguras en Workers. Es una optimización futura,
no una separación ya implementada ni motivo para borrar la aplicación.
Después: validar móvil remoto, adaptador SMTP y entrega, y Supabase Auth según
[el checklist existente](WEB51-AUTH-READINESS.md). Designar moderador solo con
autorización expresa sobre una cuenta verificada. Mantener noindex hasta una
decisión separada de publicación. No se recomienda comprar un plan para ocultar
estos pendientes y no se ha publicado producción.

## Reproducir y evidencias

`npm run test:web4`, `npm run cf:build`, `npm run cf:check`, `npm run cf:smoke:qa`.
El despliegue se hace explícitamente con Wrangler sobre este Worker; `cf:build`
continúa marcado como prueba. No cambiar flags a public ni vincular dominios.

Evidencias locales ignoradas en Git en `artifacts/web52/`: respuestas HTTP,
RLS, persistencia, estabilidad, telemetría sanitizada, diagnóstico TLS y comparación
del Worker protegido. Capturas: `home-desktop.jpg`, `gallery-desktop.jpg`,
`editions-desktop-fr.jpg`, `form-persisted-en.jpg`. Ningún secreto en el informe.
