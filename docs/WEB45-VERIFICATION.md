# WEB 4.5 — hitos locales y reintentos preparados

15 de octubre de 2026. Rama `codex/patagonia-wings-web4`, desde WEB 4.4.
Solo web: sin modificar WPF, producción, pagos, DNS, credenciales ni tareas
programadas. No se enviaron correos nuevos durante estas pruebas.

## Sincronización comercial ES/EN/FR

M31 Academy/Performance y M32 Aircraft Studio se conservan. M33 **VECTOR CAREER
LOCAL** incluye piloto, aerolínea virtual personal, flota, misiones, economía,
progreso, DIARIO y PIREP/recompensas sin duplicados. M34 **VECTOR ACARS LOCAL**
incluye eventos, PIREP, cola offline, exportación/importación y CAREER/DIARIO.
Ambos se presentan como **IMPLEMENTADOS EN QA**, **PENDIENTES DE VALIDACIÓN
REAL** y **NO DISPONIBLES COMERCIALMENTE**.

Se consultaron `docs/M33-vector-career.md` y `docs/M34-vector-acars.md` del
repositorio WPF sin modificarlo ni ejecutar la aplicación. El informe M34
supera la antigua mención de ACARS futuro en M33. No se confunde la preparación
de modelos con una plataforma multiusuario operativa.

COMPLETE está diseñado para reunir todas las herramientas locales en una
licencia prevista. CAREER ONLINE y aerolíneas multiusuario figuran aparte como
futuro no desarrollado, sin prometer su inclusión en esa licencia. No hay
precios ni fechas definitivos, checkout, instalador público o ventas activos.
FAQ, capacidades y `/versiones` reutilizan el mismo contenido traducido.

## Alternativa de correo preparada, sin activar

[Runner privado](WEB45-MAIL-RUNNER.md), Node 24 y sin dependencias nuevas:

- Desactivado por defecto; la CLI acepta cero argumentos y confirma `DISABLED`
  con el envío explícitamente desactivado. No se instaló en ningún servidor.
- Una petición POST al alias fijo de esta rama Preview, HTTPS verificado,
  sin redirecciones, cookies, destinatarios ni URL suministrados por el caller.
- Credenciales únicamente por entorno seguro del futuro servidor; no recibe
  clave Supabase, contraseña SMTP ni secreto de enlaces. No se crearon ni copiaron
  credenciales ni se cambió ninguna variable de Vercel.
- Lock exclusivo, intervalo persistente de 120 s reservado antes de HTTP,
  límite HTTP de 55 s y bloqueo persistente en 401/403, incluso respuestas tardías.
- ACK JSON acotado a 2 KiB; códigos saneados, sin cuerpos/headers en registros.
  Fallos de escritura, estado corrupto o locks tras una caída exigen revisión.
- Reutiliza la cola y la idempotencia existentes. No reabre trabajos finales
  ni regenera confirmaciones/bienvenidas; no promete entrega SMTP exactamente una vez.

Los 26 tests del runner emplean red, relojes y filesystem sintéticos, incluido
su adaptador de archivos. **Linux real, inyección segura de secretos y un ciclo
periódico real siguen sin validar y apagados.** Su autorización y un host
adecuado son pasos externos posteriores. El token Vercel Automation Bypass
abarca el proyecto y requiere aprobación explícita antes de provisionarlo.

`pg_net` y `net` siguen ausentes. La bandera Supabase y su job continúan
desactivados; no se instala otra extensión ni se ejecuta el worker autorizado.
Los disparos inmediatos anteriores de los formularios conservan su comportamiento.

## Validaciones ejecutadas

| Comprobación | Resultado |
| --- | --- |
| Next 16.4.1 build y TypeScript | Pasó |
| Tests web, idiomas, formularios, correo y runner | 56/56 |
| ESLint de archivos modificados y diff | Pasó |
| HTTP local: páginas, recursos y rutas privadas | 64/64 |
| RLS heredado, permisos y denegaciones reales, con ROLLBACK | 68/68 |
| Contención del scheduler y ausencia de pg_net, con ROLLBACK | 42/42 |
| SQL real de formularios, consentimiento y baja, con ROLLBACK | Pasó |
| SQL real de confirmación, cola y reintentos, con ROLLBACK | Pasó |
| Escritorio 1440×1000 / móvil 390×844, ES/EN/FR | Revisados; sin desbordamiento horizontal |

La navegación conserva el idioma y el menú móvil se cierra al elegirlo. Los
formularios conservan mensaje requerido, consentimiento de tratamiento obligatorio
y novedades opcionales e independientes. En local permanecen cerrados por falta
de configuración segura; su persistencia real se comprobó mediante las suites SQL.

Estado final de Supabase: siete trabajos históricos `sent`, cero pendientes,
settings 1/hubs 17, sin cambios de políticas ni fixtures persistentes. Las
pruebas simulan SMTP y no generan entregas al propietario o a terceros. No se
declara una auditoría completa de toda la base heredada: sus hallazgos fuera
del alcance siguen documentados en WEB 4.3/4.4.

Las capturas locales están en `artifacts/web45-review/`, ignoradas por Git.
El Preview se genera únicamente desde esta rama; no se promociona a producción.
La comprobación final de commit/estado del Preview acompaña a la entrega.

## Pendientes externos

- Elegir/autorizar host privado, alcance de credenciales y activación del runner;
  primero validar almacenamiento y permisos Linux sin red ni secretos reales.
- Rotación SMTP y DKIM/DNS mantienen sus pasos y autorizaciones separados de
  WEB 4.4. No se ejecutaron aquí.
- La validación real M33/M34 con MSFS y su futura publicación comercial siguen
  pendientes. Esta web informa del QA existente; no sustituye esa validación.
