# Web 4.2 — segunda pasada comercial

Se conserva Next.js y la infraestructura existente. El hero explica preparación
del OFP, asistencia contextual y revisión del aterrizaje; COPILOTO, DESPACHO y
LANDING LAB tienen jerarquía, accesos y ejemplos propios. En móvil se reduce la
repetición de texto para mostrar antes la aplicación. El menú se compacta también
entre 801 y 1000 px. Metadatos y tarjeta social alineados en ES/EN/FR.

## Evidencia WPF

Revisión de M27.2, M28 y continuidad M29, exclusivamente de lectura. M29 sigue
parcial: sistema visual común, OPERACIONES y CONFIGURACIÓN renovados. M28 añade
inicio coordinado, continuidad de sesión y asociación del OFP por posición/edad;
no compara aún la aeronave del plan. Estas limitaciones permanecen identificadas.

Se incorporan cinco capturas verificadas del tour QA M28/M29: inicio, despacho,
operaciones, copiloto y configuración. Son interfaz inglesa, 1616×868 nativos,
sin retoque, sin conexión a fuentes reales, con bandas QA y procedencia pública
en public/vector/m29/provenance.json. WebP: 606.848 bytes en conjunto. Se conserva
la atribución OpenStreetMap visible. Regeneración: VECTOR_QA_TOUR_ROOT y
scripts/web42-assets.mjs.

LANDING LAB identifica el análisis DIARIO → ATERRIZAJE M27.2, sin inventar un
módulo WPF adicional. Se mantiene la captura limpia de Web 4.1: las más recientes
del diario contienen una ruta privada. Los valores son QA, la compresión es
relativa y la validación real por aeronave sigue pendiente.

## Validación

- Build Next.js y TypeScript correctos.
- 10/10 pruebas; procedencia, idioma y dimensiones decodificadas de las imágenes
  comprobados, incluidos hashes de los nuevos recursos.
- 52/52 comprobaciones HTTP de páginas, recursos y respuestas de API.
- ESLint: 0 errores; 37 advertencias heredadas.
- 54 vistas: 18 páginas ES/EN/FR a 1920×1080, 768×1024 y 375×812, sin
  desbordamiento horizontal ni imágenes rotas cargadas.
- Acceso a Landing Lab, 14 capturas ampliables, teclado Home/End/flechas/Escape,
  foco restaurado, menú a 833 px y cambio de idioma conservando página comprobados.
- Consola local sin errores/advertencias capturados. Capturas de revisión y
  evidencia JSON en artifacts/web4-review/web42-* (locales).

## Formularios

Durante esta revisión el formulario mantiene el bloqueo seguro: no hay acceso
Supabase verificado en esta sesión. La API de configuración de Vercel devuelve
403; su panel web sí es accesible. Las pruebas de almacenamiento son simuladas,
no prueban persistencia real ni RLS instalado. El usuario ha indicado que activó
Supabase; falta confirmar dónde y disponer de esa conexión para migrar, auditar
permisos efectivos y comprobar envío → fila persistida → confirmación.

Se prepara docs/supabase/vector-inquiries.audit.sql, de solo lectura, que incluye
permisos efectivos de tablas/RPC para anon, authenticated y service_role. No se
ejecutó SQL, no se modificaron variables remotas y no se enviaron correos.

Rama: codex/patagonia-wings-web4. Sin cambios WPF, merge a main, publicación en
producción, DNS ni pagos. URL final de Preview y estado remoto en la entrega.
