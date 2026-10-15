# WEB 4.4 — programador desactivado; activación bloqueada

## Viabilidad

Se comprobó el plan Vercel **Hobby**. Su Cron diario se ejecuta en producción y
no cubre reintentos frecuentes en un Preview protegido. No se añade un cron de
producción ni se cambia el plan.
[Límites oficiales](https://vercel.com/docs/cron-jobs/usage-and-pricing),
[funcionamiento](https://vercel.com/docs/cron-jobs#how-cron-jobs-work).

## Estado comprobado y límite de la plataforma

La instalación remota `20261015205828` sí se aplicó después de autorizarla.
`pg_cron`, `pg_net` y la infraestructura privada están instalados, con ambos
controles desactivados:

- `vector_mail_scheduler.state.enabled = false`.
- Job `vector-preview-mail-drain`: `active = false`.
- Cero solicitudes HTTP y cero respuestas; no se enviaron correos.
- No se aprovisionaron credenciales del scheduler ni se modificó el outbox/RLS.

La [suite original de 94 comprobaciones](supabase/web44-mail-scheduler.pg-net-NOT-SUPPORTED.sql)
**se ejecutó y falló** al comprobar los permisos de `net`. No son 94 pruebas
aprobadas. La inspección posterior confirmó que sus objetos y grants pertenecen
a `supabase_admin`; PUBLIC conserva acceso, heredado por anon, authenticated y
service_role. Los `REVOKE` de la primera migración no cerraron ese acceso.

Supabase documenta que `postgres` no puede revocar esos grants administrados y
que la plataforma no permite modificarlos por proyecto. La cola de `pg_net`
almacena temporalmente headers, legibles por roles con conexión SQL. Mantener
`net` fuera de la API no convierte esa cola en exclusiva del propietario.
[Limitación oficial de pg_net](https://supabase.com/docs/guides/troubleshooting/revoking-access-to-pg_net-objects-has-no-effect-0bbc16).

Por tanto, **no habilitar el scheduler ni introducir sus tokens en Vault**.
La activación está bloqueada hasta disponer de una solución segura revisada.
El [archivo de activación](supabase/web44-mail-scheduler.activation.NOT-APPLIED.sql)
falla deliberadamente antes de realizar cualquier operación.

## Retirada acotada pendiente de autorización

La migración `20261015210006_web44_scheduler_net_privileges.sql` prepara la
retirada exclusiva del `pg_net` recién instalado. Comprueba ambas banderas
desactivadas, cola y respuestas vacías y ausencia de Database Webhooks. Sustituye
`tick()` por una rutina que desactiva la bandera y nunca transmite; después usa
`DROP EXTENSION pg_net` **sin CASCADE**, de modo que una dependencia inesperada
cancele la transacción. Conserva `pg_cron`, la fila privada, el job inactivo y
todos los datos de formularios/correo.

**La retirada no se ha ejecutado.** La revisión automática rechazó esa operación
por requerir autorización específica para desinstalar la extensión; se solicitó
al titular y está pendiente. No se afirma que `net` haya desaparecido ni que
sus permisos estén corregidos.

La [nueva suite de 42 comprobaciones](supabase/web44-mail-scheduler.access-tests.sql)
está preparada para verificar la contención **después de la retirada**; todavía
no se ha ejecutado. Comprueba ausencia de `pg_net`/`net`, controles inactivos,
rutina sin HTTP/Vault y acceso privado. No sustituye el resultado fallido de la
suite original ni constituye prueba de reintentos automáticos operativos.

## Condiciones para una solución futura

La cola durable existente, `public.vector_mail_outbox`, conserva deduplicación,
leases, backoff y estados terminales. Los formularios mantienen su kick inmediato
mediante Next `after`; eso no constituye un programador periódico. La ejecución
automática de reintentos sigue pendiente. No reabrir jobs `sent`, `failed`,
`delivery_unknown` o `suppressed` ni reenviar bienvenidas históricas.

El Preview exige además Automation Bypass, cuyo token cubre **todos los
despliegues del proyecto**, aunque el destino elegido sea una rama. Su creación
y uso requieren autorización separada. No se ha creado ni usado ese permiso.
[Alcance oficial](https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection/protection-bypass-automation).

Una futura solución deberá impedir que credenciales de HTTP queden accesibles a
roles no previstos, verificar límites/coste y probar un ciclo automático sin
correos a terceros. El acceso privilegiado existente de `service_role` a
`vault.decrypted_secrets` tampoco se modifica aquí. Nunca copiar la contraseña
SMTP a la cola ni cambiar los secretos HMAC para esta preparación.

Consulta saneada del estado actual, solo propietario:

```sql
select enabled,last_invoked_at,last_http_status,last_result
from vector_mail_scheduler.state where singleton;
select jobname,active from cron.job where jobname='vector-preview-mail-drain';
select status,count(*) from public.vector_mail_outbox group by status;
```

No consultar ni registrar headers HTTP, contenido de Vault o cuerpos de correo.
No borrar historiales ni jobs ajenos.
