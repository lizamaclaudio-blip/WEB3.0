# WEB 5.1 — preparación para publicación

16 de octubre de 2026, hora de Chile. **El titular decidió conservar el Preview
por ahora. Producción no desplegada.** No se contrató un plan comercial.
La entrega sirve para revisar el prelanzamiento; todavía tiene requisitos externos
antes de abrir registro comunitario y publicar.

## Base terminada y alcance de esta entrega

- **Web 5.0 terminado**, commit `6ef705e`,
  [Preview visual](https://web-30-abqlo5jpb-lizamaclaudio-blips-projects.vercel.app/).
  La transformación visual se conserva. El informe de verificación recoge el
  Preview funcional Web 5.1 y el enlace de rama actualizado.
- Backend Web 5.1 implementado y comprobado con pruebas SQL con rollback.
  Esas pruebas no sustituyen una sesión real del titular ni la entrega de correo
  de Supabase Auth. No se enviaron correos en esta etapa.
- Formularios y correo existentes de contacto/novedades conservados. Su SMTP
  funciona por un camino distinto al correo de identidad de **Supabase Auth**;
  no se presume que configurar uno configure el otro.
- **Altas comunitarias explícitamente desactivadas** mediante
  `VECTOR_COMMUNITY_REGISTRATION_ENABLED=false` hasta verificar Auth por correo.
  El acceso de cuentas ya verificadas está preparado para Preview, pero todavía
  no se comprobó el inicio de sesión real del titular.
- No se sembraron moderadores. El panel privado requiere designar expresamente
  una identidad autorizada; tener una cuenta no concede administración.
- Founders 10 ofrece únicamente aviso de futura apertura, pendiente de
  verificación de su flujo. **No hay sorteo formal**, participación válida,
  selección de ganadores ni licencias emitidas.
- Roadmap público con contenidos revisados y administración preparada.
  Los estados QA no equivalen a validación con MSFS real ni disponibilidad comercial.
- Sitemap preparado para **36 rutas localizadas** de producción más propuestas
  aprobadas que correspondan. Preview permanece `noindex`; no se afirma que
  Google haya indexado el sitio.
- Instalador/ACARS históricos conservados byte por byte en
  `private-assets/acars`, fuera de `public`. No hay descarga pública autorizada.

## Requisitos antes de producción

| Acción | Responsable / evidencia requerida |
| --- | --- |
| Revisar Preview Web 5.1 final | Titular: aprobar experiencia, idiomas, estados y restricciones; conservar URL/SHA del despliegue verificado |
| Alojamiento comercial | Autorizar Vercel Pro o resolver elegibilidad con Vercel. Hobby actual limita uso comercial; no basta omitir checkout |
| Correo de identidad | Verificar configuración y entrega de Supabase Auth, remitente y cuotas; configurar redirects del dominio autorizado; probar confirmación y sesión real sin divulgar claves |
| Abrir cuentas comunitarias | Solo después de la prueba anterior, autorizar cambio de la variable de registro y verificar nuevamente alta, confirmación, acceso y baja |
| Administración | Designar una cuenta verificada como moderadora mediante procedimiento privado; probar acceso permitido y denegado, revisión de propuestas, votos/reportes y auditoría |
| Founders 10 | Comprobar confirmación y baja del aviso por propósito. Mantener sorteo cerrado hasta aprobar bases, fechas, países, edad, selección verificable y entrega |
| Privacidad | Confirmar identidad legal del responsable, contacto, retención, proveedores y transferencias; revisar menores y requisitos internacionales. No borrar históricos como parte de esta entrega |
| Dominio e indexación | Confirmar canonical `www`, HTTPS y redirecciones. Configurar Search Console con cuenta del titular; cualquier TXT DNS requiere autorización previa |
| Recuperación y gasto | Revisar consumo real, presupuesto de buzón/dominio, backup y alertas. Las cuotas nominales de un plan no acreditan capacidad libre |
| Publicación | Obtener autorización final expresa para producción; confirmar variables `VERCEL_ENV=production` y `VECTOR_SITE_MODE=public` antes de habilitar indexación, verificar metadatos, headers, sitemap y formularios en el origen publicado antes de promocionarlo |

La [revisión de costos, SEO y legal](WEB51-COSTS-SEO-LEGAL.md) documenta fuentes
oficiales, límites y escenarios. Subtotal de infraestructura estimado: **USD20/mes**
con Vercel Pro y Supabase Free, o **USD45/mes** con Supabase Pro y un Micro;
correo, dominio, impuestos y posibles excesos van aparte. No son precios de VECTOR
ni una factura medida. Cloudflare se evaluó como alternativa; no se migró.

## Lo que permanece desactivado o sujeto a otra autorización

Sin precios públicos, checkout, pagos, prueba gratuita ni descargas del software.
Sin emisión de licencias comerciales o endpoints definitivos de activación:
requieren el contrato actualizado de Claude. Sin concurso formal, campañas
masivas o publicación automática en comunidades externas.

No se modificaron producción, DNS, contraseñas SMTP, planes contratados,
programadores, `pg_net` ni la aplicación WPF. La apertura de la comunidad no
autoriza por sí misma ninguna de esas operaciones.

**Conclusión:** la base está preparada para revisión funcional en Preview.
Publicación y registro abierto siguen condicionados a la validación de identidad,
correo, moderación, requisitos legales, alojamiento comercial y aprobación final.
