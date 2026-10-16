# WEB 5.0 — Recorrido de producto y tráiler futuro

## Material publicado y límites

La demostración integrada dura **36 segundos**. Es un recorrido interactivo de capturas auténticas WPF con datos QA, no un archivo de vídeo, una grabación de acciones ni un vuelo real. Se identifica así al lado del reproductor y en cada captura. No se ha producido ni simulado una pista de audio. No hay controles de audio falsos.

La escena cinematográfica de la portada es arte conceptual, identificado por separado. No representa una cabina observada, una función de la aplicación ni una prueba de vuelo. No se utiliza como sustituto de las capturas WPF del recorrido.

| Tiempo | Escena | Material usado en la demostración | Límite y material pendiente para un tráiler audiovisual |
| --- | --- | --- | --- |
| 00–04 s | Preparación | Captura WPF QA de Inicio, `home` | No hay grabación autorizada de cabina al amanecer. El arte conceptual pertenece a la portada, sin presentarlo como vuelo real. |
| 04–08 s | DESPACHO | Captura WPF QA de DESPACHO, `dispatch` | OFP y mapa de prueba; no se simulan clics de importación ni telemetría en directo. |
| 08–12 s | CARGA Y CABINA | Captura WPF QA de cabina, `cabin` | Las posiciones de pasajeros son ilustrativas. Falta una grabación de la interacción con el módulo. |
| 12–16 s | COPILOTO | Captura WPF QA de COPILOTO, `copilot` | Checklists y contexto de prueba. No se inventan conversaciones, respuestas ni audio del copiloto. |
| 16–20 s | Contexto de vuelo | Captura WPF QA de Monitor en Vivo, `monitor` | Sustituye honestamente la escena de aproximación: no hay vídeo autorizado de aproximación o aterrizaje real disponible. |
| 20–24 s | LANDING LAB | Captura WPF QA de aterrizaje, `landing` | Trazas de sesión sintética. No acredita validación real por aeronave. |
| 24–28 s | CAREER LOCAL | Captura WPF QA verificada, `career` | MVP local, no plataforma online ni usuarios conectados. La interfaz no demuestra validación real en MSFS. |
| 28–32 s | COPILOTO VECTOR COMPLETE | Cierre tipográfico original en HTML/CSS | Una licencia diseñada para agrupar herramientas locales. Sin precio, fecha, checkout ni disponibilidad comercial. |
| 32–36 s | Próximamente | Cierre tipográfico original en HTML/CSS | En desarrollo, sin descarga pública. La lista de interesados existente sigue siendo el destino de las llamadas a la acción de la web. |

Las fuentes y los hashes de las capturas se conservan en los manifiestos de `public/vector/`; el recorrido usa `gallery-data.ts` y no mantiene copias alternativas de esos archivos. Si una captura no existe o falla su carga, muestra un aviso de material pendiente: no la sustituye silenciosamente por otro módulo.

## Comportamiento implementado

- Poster estático y capturas con carga diferida mediante Next Image. No hay reproducción, audio ni descarga de vídeos al cargar la página.
- Reproducción solamente por acción del visitante; pausa, reinicio, línea de tiempo y nueve capítulos seleccionables. Elegir un capítulo o desplazar la línea de tiempo deja el recorrido pausado.
- Pausa automática al ocultar la pestaña, sacar el recorrido de pantalla o cambiar la preferencia del sistema a movimiento reducido. La reproducción no se reanuda sola.
- Con movimiento reducido se eliminan las transiciones visuales; los controles manuales siguen disponibles. El visitante puede iniciar expresamente el recorrido sin transiciones.
- El reloj usa tiempo monotónico con límite de avance por actualización: un bloqueo del hilo o una pestaña en segundo plano no produce saltos de varios capítulos.
- Ampliación de la captura en un diálogo modal nativo. Escape cierra, el foco vuelve al botón de origen y las flechas permiten cambiar de escena.
- Flechas/Home/End para navegar por capítulos a partir del botón enfocado, con un solo capítulo en el orden de Tab. Espacio sobre el área del reproductor para reproducir o pausar y control de rango con teclado nativo. Ningún atajo sustituye las teclas de la línea de tiempo. Escape conserva el cierre nativo del diálogo incluso en las escenas tipográficas finales; el foco vuelve al reproductor si ya no existe el botón de ampliación original.
- Cada captura mantiene su proporción original y se presenta completa. Los controles de ampliación abren la imagen original; no hay instrumentos web decorativos presentados como datos reales.

## Para producir el tráiler audiovisual completo

Se necesitan grabaciones propias o con licencia verificable de cabina, preparación, aproximación y aterrizaje, además de interacciones reales de los módulos. Las secuencias QA deben seguir identificadas y separadas de las pruebas con MSFS. La banda sonora o locución necesita una fuente y licencia documentadas antes de integrarse. Hasta disponer de ese material, la web ofrece la demostración parcial descrita, sin prometer un vídeo con audio inexistente.

## Validación del componente

`tests/web4/cinematic-demo.test.mjs` comprueba los límites de los nueve capítulos, el final a 36 segundos, la conservación de la pausa, la contención de temporizadores retrasados y la vinculación de cada escena a una captura QA con textos ES/EN/FR. La revisión visual y de teclado en el navegador se documenta en el informe general de Web 5.0.
