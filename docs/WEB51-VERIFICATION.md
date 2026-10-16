# WEB 5.1 — Community Launch: verificación

**Cierre actualizado:** [estado final, identidad y límites reales](WEB51-FINAL-CLOSURE.md).
Este documento conserva la evidencia de la base `b9bc48c`; la revisión posterior
incluye 77 tests y una prueba Workers completa. No equivale a comunidad abierta.

16 de octubre de 2026. Rama exclusiva: `codex/patagonia-wings-web4`.
Implementación `2daa376`; Preview funcional inicial:
https://web-30-8a8wbzulb-lizamaclaudio-blips-projects.vercel.app/.
La corrección final de indexación y cierre se publica en la misma rama. El
[Preview de rama](https://web-30-git-codex-patagonia-52d73e-lizamaclaudio-blips-projects.vercel.app/)
apunta a la última revisión; la URL inmutable final y SHA se entregan al usuario.
El titular decidió conservar el Preview por ahora. Producción permanece sin
desplegar: Vercel sigue en Hobby y no se contrató un plan comercial. La futura
publicación necesitará además configuración exclusiva de producción, que no
hereda automáticamente los secretos de los formularios del Preview.

## Web 5.0 conservado y terminado

Implementación independiente `6ef705e`, cierre documental `92abefe`.
[Preview Web 5.0](https://web-30-abqlo5jpb-lizamaclaudio-blips-projects.vercel.app/).
Se conservaron el hero cinematográfico original, narrativa antes/durante/después,
galería ampliable y recorrido de 36 segundos controlado por el visitante.
Las 19 capturas WPF tienen procedencia documentada; cinco muestran Academy,
Performance, Aircraft Studio, Career Local y ACARS Local más recientes.
Las capturas QA y el arte conceptual se distinguen de telemetría y vuelos reales.
No se modificó ni ejecutó una nueva versión del programa WPF.

Detalles: [verificación Web 5.0](WEB50-VERIFICATION.md),
[recursos](WEB50-ASSETS.md), [guion](WEB50-STORYBOARD.md).

## Web 5.1 entregado

- Navegación de prelanzamiento, tres ediciones TAKEOFF/HORIZON/COMMANDER sin
  precios, noticias enlazables y `/descubre` para compartir capturas, beneficios
  y el formulario existente. La distribución por edición se presenta como propuesta;
  Commander es la completa. Sin checkout, prueba gratuita ni emisión de licencias.
- Founders 10: aviso de futura apertura con nombre/alias, email, idioma y país
  opcional. Consentimiento de aviso independiente de novedades, sin casillas
  premarcadas. Deduplicación, renovación explícita tras baja y verificación mediante
  identidad comunitaria confirmada. No es participación ni reserva de licencia.
- Roadmap de 16 etapas en base de datos, ampliable y editable por moderación,
  traducciones ES/EN/FR y fecha de lanzamiento nula. QA se representa como pruebas,
  nunca como compatibilidad comercial o con MSFS real acreditada.
- Community Lab: propuestas pendientes de moderación, categorías, filtros,
  búsqueda, estados, respuestas, votos retirables y reportes. Panel privado para
  aprobación, ocultación, destacados, fusión de duplicados y roadmap. No se
  fabricaron propuestas, autores, votos, ganadores o progreso.
- Preparación documental de licencias firmadas, equipos, derechos, upgrades y
  Creator. Contrato actualizado de Claude pendiente antes de endpoints definitivos.

## Seguridad y persistencia

Migraciones aplicadas y versionadas con sus versiones remotas reales:

1. `20261016034257_web51_community_prelaunch.sql`
2. `20261016034842_web51_founders_consent_renewal.sql`

Las propuestas públicas no contienen emails ni identificadores de autores/votantes.
Autores, votos, moderadores, reportes, auditoría, límites y avisos se mantienen en
un esquema privado con RLS y sin acceso de `anon`/`authenticated`. Los RPC de
escritura solo admiten el servidor. Sesiones verificadas contra Supabase Auth y
`auth.sessions`; no se confía en IDs del JSON ni `user_metadata`. Cookie de acceso
HttpOnly, Secure, SameSite=Lax, prefijo `__Host-` y caducidad máxima de una hora.
Origin, tipo/tamaño JSON, validación y límites persistentes preceden las escrituras.
Votos únicos y fusiones usan restricciones y bloqueos; enlaces fusionados anteriores
resuelven el destino y permiten retirar el voto sin duplicarlo.

Solo se preparó autenticación de cuentas ya verificadas en variables **Preview de
esta rama**. El alta está explícitamente desactivada hasta comprobar la entrega
de Supabase Auth. No se creó un administrador implícito ni se sembraron moderadores.
La sesión real del titular y entrega de correo de alta siguen pendientes. Las pruebas
Auth de rutas usan respuestas simuladas; las pruebas de autorización SQL sí se
ejecutaron en Postgres con usuarios/sesiones sintéticos y rollback.

Los avisos Founders nuevos quedan pendientes de verificación; no se anuncia un email
enviado. El consentimiento opcional de novedades reutiliza el sistema anterior,
su confirmación, baja y controles idempotentes. No se envió correo en esta etapa.
SMTP, DKIM/rotación, cron desactivado y retirada de `pg_net` se conservaron.

Los asesores siguen señalando dos vistas antiguas con privilegios del propietario
(`pw_v_airline_hubs`, `pw_v_public_stats`), seis funciones antiguas con search_path
mutable y `unaccent` en public. Se revisaron definiciones/permisos sin leer filas:
ambas vistas admiten lectura anon/auth; una expone catálogo de hubs, incluyendo
`notes`, y otra agregados. No contienen emails en su proyección, pero su alcance
debe revisarse antes de publicar. No se alteraron dependencias históricas fuera
del alcance Web 5.1. Esto no constituye una certificación de toda la base heredada.

## Validaciones ejecutadas

- Build Next.js y TypeScript: correctos. ESLint del código nuevo/modificado: correcto.
- **72 pruebas Node**: formularios, privacidad, correo/reintentos, locales, galería,
  demo y nuevas rutas comunitarias, sesión, moderación y Founders.
- **103 comprobaciones HTTP locales**: páginas ES/EN/FR, metadatos, formularios,
  errores, acceso privado y rutas de prelanzamiento. Local carece deliberadamente
  de configuración privada; el 503 de escritura local es el comportamiento esperado.
- `docs/supabase/web51-community.integration.sql`: integración real con rollback,
  RLS, permisos, sesiones expiradas/no verificadas, publicación, reportes, votos
  idempotentes, fusión A→B→C, retirada por ID antiguo, auditoría, roadmap,
  consentimientos Founders/newsletter y renovación. No equivale a estrés concurrente.
- Preview remoto: envío real del formulario Founders desde navegador y lectura
  en Postgres confirmaron un único aviso QA pendiente, sin consentimiento de
  novedades ni nuevos correos. Se retiró solo ese aviso sintético mediante su
  dirección reservada, alias y fecha exactos; se conserva como QA retirado, sin
  borrar datos. La cola quedó vacía y los siete correos enviados históricos no
  cambiaron. Roadmap devolvió 200; administración sin sesión, 401.
- Cinco suites anteriores de acceso y correo repetidas después de las migraciones:
  RLS heredado (68 aserciones), programador desactivado (42), solicitudes,
  confirmación/baja y reintentos. Todas correctas; sin SMTP ni HTTP del programador.
- 58 archivos cliente inspeccionados: ningún marcador de secretos privados.
  No se añadió dependencia. Quince archivos de instaladores históricos preservados
  en `private-assets/acars`, con SHA256 idéntico, fuera de la carpeta pública.
- Revisión visual de escritorio, portátil, tablet y móvil. Menú móvil y cambio
  de idioma preservan la ruta. Ediciones, Founders, roadmap, comunidad, novedades,
  página compartible y home inspeccionados sin desbordamiento horizontal observado.

Capturas de revisión local y Preview en `artifacts/web51-review/` (ignoradas en Git):
`editions-desktop.jpg`, `founders-desktop.jpg`, `roadmap-desktop.jpg`,
`share-desktop.jpg`, `editions-mobile-fr.jpg`, `founders-mobile-fr.jpg`,
`news-laptop-en.jpg`, y las capturas finales con prefijo `preview-`.

## SEO, rendimiento y publicación

Canonical `https://www.patagoniaw.com`, hreflang ES/EN/FR, Open Graph y tarjetas X.
Sitemap preparado para producción: 36 rutas localizadas más propuestas aprobadas; ninguna
cuenta, administración, API o propuesta oculta. Preview: sitemap vacío, robots
disallow y headers noindex. La prueba remota detectó que el entorno de Vercel
no distinguía correctamente la fase durante la generación de robots. Se corrigió con una
puerta explícita: solo `VECTOR_SITE_MODE=public` junto a `VERCEL_ENV=production`
habilitan indexación. Variables ausentes bloquean robots, sitemap y metadatos;
no se habilitó esa puerta. Datos estructurados Website/SoftwareApplication
sin ofertas, precios, calificaciones o descargas inventadas. Dominio actual
comprobado solo lectura: HTTP→HTTPS→www. No se cambió DNS ni Search Console.

Imágenes optimizadas y carga diferida, animación pausada fuera de vista y
preferencia de movimiento reducido. Las mediciones locales no acreditan Core
Web Vitals de campo ni una puntuación Lighthouse; deben medirse en producción
autorizada con tráfico real. No se afirma indexación por Google.

[Preparación para publicación y acciones manuales](WEB51-PUBLISH-READINESS.md).
[Costos, comparación Vercel/Cloudflare y requisitos legales](WEB51-COSTS-SEO-LEGAL.md).
[Contrato comercial pendiente y licencias](WEB51-LICENSING-PREPARATION.md).

La publicación queda aplazada por decisión del titular; falta resolver el plan comercial de Vercel,
comprobar correo/sesión Auth, designar moderación y completar avisos legales.
No se desplegó producción ni se cambiaron DNS, credenciales, pagos, correos masivos o WPF.
