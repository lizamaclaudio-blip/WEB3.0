# WEB 4.4 — autenticación del correo y rotación SMTP

Revisión **15 de octubre de 2026**, exclusivamente de lectura. Continúa
[WEB43-VERIFICATION.md](WEB43-VERIFICATION.md). No se modificaron DNS,
contraseñas del proveedor, mensajes ni despliegues desde esta revisión.

## Estado comprobado

Consultas `Resolve-DnsName` a `ns1.vercel-dns.com`, `ns2.vercel-dns.com`,
Cloudflare `1.1.1.1` y Google `8.8.8.8` coinciden:

| Consulta | Resultado observado |
| --- | --- |
| NS de `patagoniaw.com` | `ns1.vercel-dns.com`, `ns2.vercel-dns.com` |
| MX de `patagoniaw.com` | `mx001`–`mx004.cloudus.xion.oxcs.net`, los cuatro con prioridad 10 y TTL 60 |
| TXT SPF del dominio | Un registro `v=spf1 include:spf.cloudus.xion.oxcs.net ~all`, TTL 60 |
| CNAME/TXT `selector1._domainkey.patagoniaw.com` | Sin registro solicitado; respuesta SOA |
| CNAME/TXT `selector2._domainkey.patagoniaw.com` | Sin registro solicitado; respuesta SOA |
| TXT `_dmarc.patagoniaw.com` | Sin registro solicitado; respuesta SOA |

Los TXT `selector1-patagoniaw-com._domainkey.oxcloud.zone` y
`selector2-patagoniaw-com._domainkey.oxcloud.zone` devuelven **NXDOMAIN** en
`1.1.1.1`. El include SPF sí resuelve y delega a `spf.cloudus.oxcs.net`.
Esto comprueba publicación DNS; no comprueba el resultado SPF de un mensaje.
No se realizó una auditoría de todos los emisores posibles del dominio.
No se deduce ausencia de cualquier selector DKIM alternativo: sin la cabecera
real del receptor no conocemos un posible selector diferente.

Los MX/SPF coinciden con la [documentación oficial OX Cloud US](https://confluence-public.open-xchange.com/spaces/OASC/pages/51777224/OX+Cloud+OX+brand+Mail+integration),
actualizada el 24 de agosto de 2026. Se conservan los registros web y de correo
existentes; no hace falta cambiar los nameservers ni duplicar SPF.

## DKIM preparado, pendiente del proveedor y autorización DNS

OX documenta estos dos selectores y sus destinos para el dominio. Registros/OX
debe generar las claves y habilitar firma por dominio; las claves privadas
permanecen en sus servidores. La firma de marca de respaldo puede ser válida y
no estar alineada con `patagoniaw.com`. [Instrucciones oficiales OX](https://confluence-public.open-xchange.com/spaces/OASC/pages/359793853/OX+Cloud+DKIM+incl.+per+maildomain),
actualizadas el 9 de julio de 2026.

| Tipo | Nombre relativo en la zona `patagoniaw.com` | Destino exacto previsto | TTL propuesto |
| --- | --- | --- | --- |
| CNAME | `selector1._domainkey` | `selector1-patagoniaw-com._domainkey.oxcloud.zone` | 3600 |
| CNAME | `selector2._domainkey` | `selector2-patagoniaw-com._domainkey.oxcloud.zone` | 3600 |

Esta tabla está **preparada, no publicada**. Registros debe confirmar que esos
destinos corresponden al servicio contratado y activar sus claves. Si entrega
valores específicos diferentes, se revisan antes de publicar. No se inventa un
TXT `p=` ni se usa una clave de otro dominio.

La zona autoritativa está en **Vercel**, aunque el dominio/correo se compró en
Registros. El proveedor activa la firma; el titular autoriza añadir los CNAME
en Vercel. La autorización anterior cubría exclusivamente cuatro MX y un SPF;
no cubre estos registros. El [borrador para soporte](WEB44-DKIM-SUPPORT-DRAFT.md)
queda sin enviar.

## DMARC preparado, sin aplicar

Propuesta inicial exacta para revisión, una vez operativo DKIM:

| Tipo | Nombre relativo | Valor | TTL propuesto |
| --- | --- | --- | --- |
| TXT | `_dmarc` | `v=DMARC1; p=none; adkim=r; aspf=r` | 3600 |

Esta política no pide cuarentena/rechazo ni solicita informes. No se presenta
como un sistema de monitorización: falta elegir y autorizar un buzón/procesador
de reportes `rua`. No se inventa un destinatario ni se activa un servicio de
pago. El paso a enforcement exige evaluar todos los flujos legítimos.
[DMARC vigente, RFC 9989](https://www.rfc-editor.org/rfc/rfc9989.html).

## Rotación SMTP segura preparada

1. Pausar cualquier programador y deshabilitar el correo en las variables de
   Preview de esta rama. Generar un Preview con el envío desactivado antes de
   cambiar la contraseña: un fallo de autenticación SMTP finaliza el trabajo.
2. El titular cambia la contraseña de la cuenta en Registros/App Suite, dentro
   de su sesión. No la comparte por chat ni en un archivo local.
3. Introduce el nuevo valor directamente en la variable secreta
   `VECTOR_SMTP_PASSWORD` de Vercel, **Preview**, rama
   `codex/patagonia-wings-web4`. Mantenerla del lado servidor, sin prefijo
   `NEXT_PUBLIC_`. No observar/capturar el campo durante la entrada.
4. Generar un nuevo Preview: la configuración anterior no se actualiza dentro
   de un despliegue ya creado. Mantener el host `smtp.us.appsuite.cloud`, puerto
   `465`, TLS validado y allowlist de pruebas del buzón autorizado.
5. Comprobar TLS y autenticación mediante el POST privado `/api/vector/mail/verify`,
   que no envía correo. Reactivar el envío solo tras ese éxito y desplegar de
   nuevo; cualquier prueba de entrega deliberada debe usar exclusivamente el
   buzón autorizado. Registrar solo estado/código saneado,
   nunca contraseña, configuración completa ni cuerpo SMTP de autenticación.
6. Confirmar que el proveedor revocó la contraseña anterior. No conservarla
   como fallback. No rotar los secretos HMAC de enlaces/worker al cambiar la
   contraseña del buzón; son credenciales independientes.

La rotación permanece **pendiente de ejecución del titular**. Este documento
no afirma que haya cambiado la contraseña ni que un Preview use el nuevo valor.

## Verificación posterior a la activación

1. Consultar ambos CNAME autoritativos y por dos resolutores públicos. Consultar
   TXT a través de ambos selectores y comprobar claves DKIM no vacías. Releer
   el único SPF y el nuevo `_dmarc`.
2. Enviar un mensaje nuevo, identificado como QA, solo a un buzón autorizado;
   no reenviar confirmaciones/bienvenidas ya aceptadas. Si el servicio entrega
   correo interno sin evaluación de Internet, ese mensaje no prueba el recorrido
   externo: no declarar autenticación externa verificada.
3. En el mensaje recibido, revisar `DKIM-Signature` (`d=patagoniaw.com`, selector
   publicado) y el `Authentication-Results` añadido por el receptor confiable.
   Registrar `spf`, `dkim`, `dmarc`, sus dominios y fecha, sin cuerpos, direcciones
   personales ni enlaces/tokens. Exigir `dkim=pass` alineado; comprobar SPF con
   el MAIL FROM real y DMARC con `header.from=patagoniaw.com`.
4. Una firma presente no demuestra `dkim=pass`. Un `spf=pass` sin alineación no
   basta para DMARC; una de SPF/DKIM debe pasar y estar alineada. Una cabecera
   inyectada por el emisor no constituye evidencia del receptor.
   [Authentication-Results, RFC 8601](https://www.rfc-editor.org/rfc/rfc8601).

Se revisó en App Suite la fuente de la **bienvenida QA de WEB 4.3 ya recibida**,
sin enviar correo nuevo ni guardar el `.eml`. Evidencia saneada del receptor
de App Suite: `spf=pass`, `dkim=pass`, `dmarc=none`;
`Received-SPF: Pass`. La firma usa `d=oxsus-vadesecure.net` y
`s=dkim-202410-rsa2048`: pasa DKIM del proveedor, pero no está alineada con
`From: patagoniaw.com`.

Esta es una línea base real de WEB 4.3, no una validación posterior a activar
DKIM propio. No se guardaron cabeceras completas, cuerpos, direcciones de
destinatarios ni enlaces/tokens. La prueba de firma alineada y `dmarc=pass`
queda pendiente de proveedor, autorización de DNS y mensaje recibido posterior.
