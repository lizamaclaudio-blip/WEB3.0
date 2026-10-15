# Borrador para Registros — sin enviar

**Asunto:** Activar DKIM por dominio del correo contratado — patagoniaw.com

Hola:

Nuestro correo profesional de `patagoniaw.com` está activo en OX Cloud US;
utilizamos `smtp.us.appsuite.cloud:465`. Los MX y SPF ya están publicados y
recibimos los mensajes de prueba. El DNS autoritativo está en Vercel.

Solicitamos confirmar y habilitar la firma DKIM por dominio. Los destinos
documentados actualmente devuelven NXDOMAIN:

- `selector1-patagoniaw-com._domainkey.oxcloud.zone`
- `selector2-patagoniaw-com._domainkey.oxcloud.zone`

Según la documentación oficial, prepararíamos:

| Nombre | Tipo | Destino |
| --- | --- | --- |
| `selector1._domainkey.patagoniaw.com` | CNAME | `selector1-patagoniaw-com._domainkey.oxcloud.zone` |
| `selector2._domainkey.patagoniaw.com` | CNAME | `selector2-patagoniaw-com._domainkey.oxcloud.zone` |

Por favor confirmen los valores exactos para este servicio y generen/activen las
claves de ambos selectores en el proveedor, indicando si la publicación de los
CNAME debe preceder a la activación. Necesitamos que las nuevas firmas estén
alineadas con `patagoniaw.com`. Mantendremos la zona en Vercel.

No incluyan contraseñas ni claves privadas en la respuesta; solo los registros
DNS públicos y el estado de activación. No solicitamos cambiar MX, SPF,
nameservers, hosting ni contratar servicios adicionales.

Referencia: [DKIM oficial OX Cloud](https://confluence-public.open-xchange.com/spaces/OASC/pages/359793853/OX+Cloud+DKIM+incl.+per+maildomain).

Gracias.

---

Documento preparado para revisión del titular. No se ha enviado este mensaje
ni se ha abierto un ticket. Enviarlo requiere instrucción explícita del usuario.
