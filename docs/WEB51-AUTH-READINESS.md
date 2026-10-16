# Web 5.1 — identidad y verificación de correo

La aplicación admite acceso de cuentas Supabase Auth ya verificadas. El alta
pública continúa **desactivada**. No se ha acreditado un ciclo real de alta,
recepción, confirmación y sesión comunitaria ni se ha designado moderador.

La consulta pública de Auth confirmó `external.email=true`,
`mailer_autoconfirm=false`, `disable_signup=false`. Esto acredita la exigencia de
verificación del proveedor, no su entrega. El flag de la web permanece en false.
El proveedor permite altas globales: el flag bloquea la ruta de esta web, no
modifica por sí solo Supabase Auth. Revisar cuotas/antispam y otros clientes
antes de modificar esa configuración global.
El panel `/auth/smtp` pidió iniciar sesión; no se pudo comprobar en él un SMTP
personalizado, sus cuotas ni las URL autorizadas. No se modificó ese panel.

## Preparado en código

- Contraseñas solo para Auth respaldado; cookies HttpOnly/Secure, sesión validada
  contra proveedor y base. Ningún token/refresh token se devuelve al cliente.
- Alta requiere consentimiento, límites persistentes, configuración segura,
  proveedor con verificación obligatoria y un origen HTTPS fijo de confirmación.
- `VECTOR_COMMUNITY_CONFIRM_ORIGIN` no admite credenciales, ruta, query o fragmento.
  El servidor elige `/comunidad/cuenta`, `/en/comunidad/cuenta` o
  `/fr/comunidad/cuenta`; no acepta un redirect propuesto por el navegador.
- `supabase/auth/confirm-signup.html` prepara el mensaje ES/EN/FR según el idioma
  validado del registro. Usa el enlace generado por Supabase. **No se instaló la
  plantilla en el proveedor ni se envió un correo de prueba nuevo.**
- Después de confirmar en Supabase, el usuario inicia sesión en la cuenta web.
  La cuenta comunitaria no concede administración, licencia ni participación.

## Qué falta exactamente para habilitarlo

1. Acceso del titular a Supabase → Authentication → Email/SMTP. Verificar SMTP
   personalizado y permiso/cuotas del buzón para correo de identidad. El SMTP
   transaccional de formularios es otro transporte: no se cambia ni se presume
   que configura Auth. El transporte por defecto de Supabase restringe destinos
   y volumen y no acredita un registro público viable.
2. Elegir el origen de prueba real. Configurar allí `VECTOR_COMMUNITY_CONFIRM_ORIGIN`
   y autorizar las tres URL anteriores en Auth → URL Configuration; revisar Site
   URL para evitar el retorno al sitio antiguo. No usar comodines amplios.
3. Revisar/instalar la plantilla y asunto `COPILOTO VECTOR · Confirma tu correo /
   Confirm your email / Confirmez votre adresse`. No copiar enlaces personales a
   logs, informes ni chats. No desactivar confirmación para superar un fallo SMTP.
4. Probar con una dirección del titular: registro, llegada a Entrada/Spam, enlace,
   confirmación efectiva, login, cookie y logout. No probar con terceros ni marcar
   entrega solo porque el proveedor respondió 200.
5. Solo tras esa evidencia, habilitar `VECTOR_COMMUNITY_REGISTRATION_ENABLED=true`
   en el entorno elegido. Confirmar propuestas pendientes/votos retirables con
   dos cuentas de prueba autorizadas y denegación de administración.
6. Designar expresamente una cuenta verificada como moderadora mediante operación
   privada auditada. No hay primer usuario administrador ni privilegios públicos.

Founders guarda avisos pendientes y verifica/baja el propósito desde la cuenta.
Hasta abrir una identidad verificada, los nuevos visitantes pueden guardar interés
pero no completar esa confirmación. Esto no abre el sorteo ni activa novedades.

[SMTP y restricciones oficiales](https://supabase.com/docs/guides/auth/auth-smtp),
[redirects](https://supabase.com/docs/guides/auth/redirect-urls),
[plantillas](https://supabase.com/docs/guides/auth/auth-email-templates).
