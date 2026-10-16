# Web 5.1 — prueba de aplicación completa en Cloudflare

16 de octubre de 2026. Base `b9bc48c`, misma rama de desarrollo. Sin DNS,
producción, contratación, base duplicada ni cambios al programa WPF.

**Resultado:** OpenNext compila y workerd ejecuta la aplicación completa. La
prueba local pasó 103 comprobaciones HTTP. Esto todavía **no acredita que todas
las funciones puedan publicarse de forma fiable y gratuita**: faltan una cuenta
Cloudflare, credenciales del entorno, medición remota de CPU y resolver correo.
El titular confirmó que aún no tiene cuenta; no se creó una ni se aceptaron términos.

## Evidencia reproducible

- Next 16.4.1; OpenNext 1.20.12 y Wrangler 4.151.1 fijados en lockfile.
- Inventario de **72 páginas y 73 handlers**, incluidos 16 `/api/vector/`.
  Todas las rutas se compilaron, incluyendo las heredadas; no se exportó solo HTML.
- Worker dry-run: **9.640 MiB sin comprimir**, 1.838 MiB gzip aproximadamente
  (`9870.84 KiB / gzip: 1882.13 KiB`). 128 archivos detectados por Wrangler.
- `http://127.0.0.1:3006` es un entorno **local**, no una URL pública Cloudflare.
  `workers.dev` no se desplegó: no hay cuenta ni sesión autenticada.
- La validación HTTP cubre páginas ES/EN/FR, recursos, robots/sitemap, errores de
  entrada y rechazos de acceso. Las escrituras devuelven 503 deliberadamente:
  **los secretos de Vercel no se copiaron a Cloudflare**. La lectura de roadmap
  local puede mostrar el seed revisado, no debe confundirse con una lectura DB.
- Sin R2, D1, colas, cron, Images de pago, dominio personalizado o recursos contratados.

```sh
npm ci
# Copiar .dev.vars.example a .dev.vars, sin secretos para esta prueba.
npm run cf:build
npm run cf:check
npm run cf:preview
# En otra terminal:
npm run cf:smoke
```

El build fuerza modo de prueba y desactiva envío de formularios/correos. En
Windows usa junctions exclusivamente dentro de `.open-next` mediante un preload
del proceso; no cambia privilegios del sistema ni archivos del proveedor. Se
comprobaron directorios reales dentro del workspace. Linux usa OpenNext sin ese
preload. Cerrar `cf:preview` antes de reconstruir para evitar bloqueo de archivos.
WSL no está instalado; una ejecución Linux nativa/CI sigue pendiente.
El script `cf:build` es exclusivamente de prueba. Una futura publicación necesita
un build de producción expresamente aprobado; cambiar solo variables del Worker
no regenera robots/sitemap prerenderizados en un build marcado Preview.

Para una prueba futura con persistencia, configurar en el almacén del Worker
solo `SUPABASE_URL`, `SUPABASE_SECRET_KEY` y `VECTOR_FORM_HASH_SECRET` existentes,
además de los flags revisados. Auth añade `VECTOR_COMMUNITY_PUBLIC_KEY`,
`VECTOR_COMMUNITY_AUTH_ENABLED` y el origen fijo de confirmación. No habilitar
registro/correo por copiar variables: primero sus pruebas específicas. No copiar
DSN ni credenciales de operaciones heredadas hasta revisar su conexión/TLS.
Nunca introducir claves en Git, logs o este chat; no se rotó ni transfirió ninguna.

Evidencias locales ignoradas en Git: `artifacts/web51-cloudflare/routes.json`,
`http-checks.json`, `crypto-probe.json`, `smtp-tls-probe.json` y `bundle/`.

## Compatibilidad y límites por área

| Área | Resultado real | Pendiente antes de migrar |
| --- | --- | --- |
| Hero, demo, galería, ES/EN/FR | Compilan, se sirven y se revisan visualmente en workerd | Medir UX y CPU remotas, no solo respuestas 200 |
| SSR/App Router/route handlers | Paquete completo generado; pruebas locales correctas | Free CPU de 10 ms por petición y arranque deben medirse remotamente |
| Imágenes | WebP existentes, lazy loading y dimensiones preservados | Trial sirve archivos originales; no activa transformaciones Images ni equivalencia de srcset optimizado de Vercel |
| Formularios/Founders | Adaptadores HTTPS conservados, errores y consentimientos comprobados por tests | Introducir secretos solo en el Worker elegido y probar persistencia real; local está desactivado |
| Supabase/RLS | Misma base; políticas y permisos no modificados | Revalidar acceso desde el nuevo origen con las mismas restricciones |
| Comunidad, votos, administración | Código completo, sesión/roles/controles probados en Node y SQL previo | Auth real, moderador expreso y prueba remota autenticada; no hay ideas/votos inventados |
| Auth verificación | Alta exige retorno HTTPS fijo y proveedor que confirma email | SMTP Auth, redirects exactos, entrega y sesión real; sigue cerrada |
| Correo transaccional | Node TLS/EHLO sin autenticación funciona; workerd **no pasó** la misma prueba | Resolver DNS/socket del transporte y probar TLS/autenticación con secreto seguro; no se envió correo |
| Trabajo tras responder | Workers concede 30 s; dispatcher actual reserva 45 s | Se inhibió solo el envío `after()` en Cloudflare. La solicitud/outbox se conservan; endpoint privado foreground sigue disponible para validación futura |
| PostgreSQL heredado | Incluido `pg-cloudflare` en tracing para empaquetar; imports compilan | No se probaron operaciones reales con DSN. Pool de 8 conexiones frente a límites de conexiones Worker, TLS y aislamiento por petición requieren revisión |
| Auth antigua con scrypt | Prueba sintética workerd soportada, 27 ms de tiempo local | Es CPU intensivo: alerta para Free de 10 ms; no equivale a medida de CPU facturada/remota |
| Caché heredada ISR/fetch | Trial sin caché persistente; SSR responde | Medir llamadas y consumo. Habilitar R2/caché requiere decisión posterior, no se creó almacenamiento |
| SEO | Trial siempre noindex, robots cerrado y sitemap vacío | Indexación necesita modo public y stage production explícitos; canonical previsto sigue siendo www.patagoniaw.com |

### Correo: bloqueo concreto, sin cambiar proveedor

La prueba aislada usó el mismo Nodemailer y App Suite 465, TLS ≥1.2 y validación
de certificado, **sin usuario, contraseña, MAIL FROM, RCPT TO ni DATA**. Node
normal completó TLS/EHLO; workerd devolvió ESOCKET y luego timeout. El runtime
informó resolución de un alias CNAME como dirección IP inválida. Esto señala un
problema de compatibilidad DNS/socket, pero no certifica su causa para el edge
remoto. No se desactivó TLS ni se modificó el SMTP existente para hacerlo pasar.

Pagar Workers no demuestra que ese fallo desaparezca. Opciones a validar:
adaptador de sockets/DNS compatible con Workers manteniendo el SMTP, o un
dispatcher Node/Deno seguro separado que reutilice la cola/RPC idempotente y el
mismo buzón. No se implementó ni activó un relay nuevo. Auth SMTP es otro flujo.

### Workers Free: límite actualizado y alcance de la prueba

La documentación actual de Cloudflare indica **64 MiB sin comprimir**, sin límite
gzip; el texto OpenNext aún menciona 3/10 MiB. Se usa la fuente de Cloudflare y
el paquete medido, que cabe. El análisis anterior de 3 MiB no debe usarse para
exigir pago. Free conserva 100.000 peticiones/día, CPU 10 ms, 128 MB de memoria
y seis conexiones salientes simultáneas. No hubo una prueba remota de esos límites.
El profiler local de startup falló al parsear su bundle; no se informa un tiempo
de arranque inventado. Las latencias HTTP locales son tiempo total, no CPU.

[Límites actuales](https://developers.cloudflare.com/workers/platform/limits/),
[compatibilidad OpenNext](https://opennext.js.org/cloudflare),
[TLS](https://developers.cloudflare.com/workers/runtime-apis/nodejs/tls/),
[TCP y restricciones](https://developers.cloudflare.com/workers/runtime-apis/tcp-sockets/).

## Costos mínimos y alternativa

| Opción | Planes base/mes | Estado |
| --- | ---: | --- |
| Workers Free + Supabase Free | USD 0 | Candidato para prueba remota; **paridad completa y estabilidad no verificadas** |
| Workers Paid + Supabase Free | Desde USD 5 | Alternativa si CPU impide Free; no resuelve por sí sola correo, caché ni Auth; no contratada |
| Vercel Hobby actual | USD 0 | Preview de revisión conservado; no recomendado para publicar promoción comercial |
| Vercel Pro | Desde USD 20 | Solo referencia comparativa; descartado por instrucción del titular |

A todos se suman el buzón contratado, renovación del dominio, impuestos y posibles
excesos. Sus facturas no se consultaron: no se anuncia costo total cero. Supabase
Pro añadiría desde USD 25 si se requieren sus backups/continuidad; no se contrató.
[Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/),
[Supabase pricing](https://supabase.com/pricing).

Pages estático solo **no conserva** las APIs, SSR privado y administración. Una
alternativa Free de Pages + Worker API reducido exige separar frontend/backend,
retrabajar renderizado dinámico y revisar SEO/sesiones. No es una migración
equivalente ya realizada. No se adoptó para ocultar los bloqueos del runtime.

Recomendación actual: conservar el Preview verificado, crear una cuenta Free
cuando lo decida el titular y ensayar este Worker separado en workers.dev sin DNS.
No publicar patagoniaw.com hasta resolver identidad/correo, comprobar CPU/DB y
medir seguridad/rendimiento. No hay una vía íntegra de publicación gratuita
certificada todavía; sí una prueba técnica reproducible con límites concretos.
