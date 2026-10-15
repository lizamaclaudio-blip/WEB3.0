# WEB 4.4 — correo seguro y sincronización comercial

15 de octubre de 2026. Continuación de [WEB43-VERIFICATION.md](WEB43-VERIFICATION.md).
Solo web, rama `codex/patagonia-wings-web4`. Sin cambios WPF, producción,
pagos, DNS, contraseñas ni mensajes nuevos a terceros.

## Implementado

- `/versiones`, COMPLETE, FAQ y matriz de capacidades sincronizados en ES/EN/FR.
  M31 Academy/Performance y M32 Aircraft Studio figuran **IMPLEMENTADOS EN QA**,
  **PENDIENTES DE VALIDACIÓN REAL**. M33 Career figura **FUTURO**.
  Se conserva una licencia prevista, sin checkout ni oferta comercial activa.
- Límites de Performance y Studio explícitos: no velocidades/distancias
  certificadas del fabricante, ni ocupación real por asiento o comandos GSX.
  La documentación M31/M32 del repositorio WPF se consultó sin modificarlo.
- Reutilización de la cola persistente existente: reclamación de un trabajo
  cada vez, hasta cuatro por invocación y reserva de 32 s por transacción dentro
  de un presupuesto de 45 s. RPC cancelables a 5 s; formularios conservan 8 s.
- Preflight privado `POST /api/vector/mail/verify`: TLS y autenticación SMTP
  sin `sendMail`, sin leer la cola ni devolver credenciales/errores del proveedor.
  Permite verificar la contraseña nueva mientras el envío está deshabilitado.
- No hay backfill ni reapertura de confirmaciones/bienvenidas históricas.
  Backoff 60/120/240/480 s, cinco intentos y presupuesto fijo de 23 h;
  la incertidumbre SMTP queda terminal, sin reintento automático.

## Validación ejecutada

| Comprobación | Resultado |
| --- | --- |
| Next 16.4.1 build + TypeScript | Pasó |
| Pruebas web | 28/28 |
| ESLint de archivos modificados + diff | Pasó |
| HTTP local: páginas ES/EN/FR, recursos, métodos y acceso privado | 64/64 |
| SQL de formularios, consentimiento y baja, con ROLLBACK | Pasó |
| SQL de confirmación, tokens, cola y terminales, con ROLLBACK | Pasó |
| SQL adicional de backoff, topes y supervivencia de solicitudes | Pasó |
| RLS heredado: denegaciones reales y acceso de servicio, con ROLLBACK | 68/68 |
| Contención tras retirar pg_net: ausencia de HTTP/Vault y acceso privado | 42/42 |
| Escritorio 1440×1000 / móvil 390×844 | Revisados; sin desbordamiento horizontal |

Las pruebas SMTP son simuladas, incluidos rechazo temporal/permanente,
autenticación, TLS, timeout, duplicados y fallos de persistencia final. No se
declara una nueva contraseña ni autenticación SMTP real verificada en WEB 4.4.
Los formularios locales permanecen cerrados por falta de configuración segura;
las pruebas SQL comprueban la persistencia real existente en Supabase.

Tras las pruebas de cola quedan los siete trabajos históricos `sent`, cero
trabajos pendientes y cero fixtures de reintentos. Los datos heredados siguen
siendo una fila de settings y 17 hubs. No se cambiaron políticas de formularios.

## Programador: instalación desactivada y limitación detectada

Plan Vercel **Hobby**, comprobado en la cuenta. Cron nativo solo sirve producción
y su frecuencia diaria no cubre este Preview ni la ventana de reintentos.
No se añade `crons`, no se cambia el plan ni se despliega producción.

El titular autorizó instalar la alternativa Supabase desactivada. La migración
`20261015205828_web44_mail_scheduler_disabled.sql` se aplicó: bandera y job
inactivos, cero HTTP, sin crear credenciales. La prueba de 94 controles **falló**
al comprobar permisos efectivos de `net`; no se presenta como aprobada.

Supabase crea `pg_net` bajo `supabase_admin`: los REVOKE de `postgres` no pueden
retirar sus grants PUBLIC. Se confirmó mediante ACL y documentación oficial.
No se copió ningún token ni contraseña a esa cola. El titular autorizó después
retirar exclusivamente el `pg_net` recién instalado. La migración
`20261015231135_web44_scheduler_net_privileges.sql` se aplicó sin CASCADE,
comprobando antes cola/respuestas vacías y ausencia de Database Webhooks.

**Estado final comprobado:** `pg_net` y el esquema `net` están ausentes;
`pg_cron` se conserva; la bandera privada y el job permanecen desactivados. `tick()` solo
desactiva la bandera y retorna false, sin leer Vault ni realizar HTTP.
Pasaron los 42 controles de contención con ROLLBACK. Se volvieron a ejecutar
correctamente las suites de formularios, confirmación/baja/cola y 68 controles
RLS. Los siete trabajos históricos `sent` y las filas heredadas 1/17 siguen
intactos. No se enviaron correos ni se modificaron políticas.

El asesor de seguridad conserva los hallazgos heredados documentados en WEB 4.3:
dos [vistas definer](https://supabase.com/docs/guides/database/database-linter?lint=0010_security_definer_view),
seis [search paths mutables](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable)
y `unaccent` en public. Las tablas privadas mantienen RLS sin políticas públicas
intencionalmente; no se añadieron hallazgos sobre la contención del scheduler.

El programador no está operativo. El archivo de activación falla
deliberadamente hasta resolver la arquitectura y permisos.
Ver [operación y limitación](WEB44-MAIL-SCHEDULER.md).

## Configuración externa pendiente

1. El titular debe rotar la contraseña en el proveedor e introducirla directamente
   en `VECTOR_SMTP_PASSWORD`, sensible y solo Preview de esta rama. Pausar y
   desplegar el envío desactivado antes; verificar mediante el preflight privado
   antes de reactivar. No usar chat, archivos ni comandos con claves literales.
2. Registros/OX debe activar DKIM propio y confirmar los dos CNAME preparados.
   Ambos destinos actuales son NXDOMAIN. La zona autoritativa está en Vercel;
   publicar DKIM/DMARC requiere autorización nueva. No se cambió DNS.
3. La bienvenida QA ya recibida en WEB 4.3 muestra `spf=pass`, `dkim=pass` del
   proveedor `d=oxsus-vadesecure.net`, sin alineación propia, y `dmarc=none`.
   No se guardó el EML, contenido ni tokens. Falta comprobar un mensaje nuevo
   después de activar DKIM propio; no se anuncia `dmarc=pass`.
4. Reintentos periódicos siguen pendientes de una solución segura para Preview.
   El token Automation Bypass de Vercel abarca todos los despliegues del proyecto;
   crearlo/transferirlo requiere autorización explícita y un almacén adecuado.
   La cola existente y los disparos inmediatos `after` permanecen disponibles.

Detalles: [correo/DNS/rotación](WEB44-MAIL-AUTH.md),
[borrador no enviado para Registros](WEB44-DKIM-SUPPORT-DRAFT.md),
[reintentos y preflight](WEB44-RETRIES.md).

## Entrega

Las capturas de revisión se conservan en `artifacts/web44-review/`, ignoradas
por Git, sin secretos. Preview comprobado **READY**, `target:null`, commit de
código `48dc0f8078a0f2581e60cb5e5fb3a6114a3e79d1`:

<https://web-30-46n91rlcc-lizamaclaudio-blips-projects.vercel.app/versiones#hitos>

Los formularios del Preview están habilitados en ES/EN/FR con aviso QA, dos
consentimientos separados y validación obligatoria. Un envío vacío se detiene
en la validación del navegador, sin crear una solicitud. El POST privado SMTP
sin bearer retorna HTTP 401 `UNAUTHORIZED` tras la protección de Vercel.
No se promociona ni se asigna al dominio de producción. Los commits posteriores
que solo actualizan este informe no alteran el código web verificado.
