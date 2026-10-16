# WEB 5.0 — Recursos y procedencia

La portada usa una ilustración aeronáutica conceptual original, creada con la herramienta integrada de generación de imágenes de OpenAI. No es una captura de MSFS, una prueba de vuelo ni una representación de telemetría. La web la identifica como arte conceptual. No se copiaron recursos, marcas ni textos de las seis referencias estudiadas.

Archivo servido: `public/vector/web50/hero-aviation.webp` (122.530 bytes). El original PNG permanece en el directorio de imágenes generadas de esta sesión; una copia de trabajo se conserva en `artifacts/web50-review/hero-original.png`, fuera de Git. Se convirtió a WebP con Sharp; no se modificó semánticamente la escena. El prompt final fue:

> Use case: ads-marketing. Asset type: original photographic cinematic aviation website hero background, very wide landscape 16:9. Create a premium editorial aviation scene at blue hour just before sunrise above the dramatic snow covered Andes of Patagonia and a soft ocean of clouds. One beautifully proportioned unbranded white twin turboprop business aircraft, seen from front three-quarter side in flight on the right half of the frame, subtle warm cabin window lights and a delicate golden sunrise rim light on its wings. Deep midnight navy and blue-black left half of the frame with clean natural negative space suitable for a large white headline, never add any text. Elegant, believable aeronautical proportions, realistic wings, two engines and propellers, tasteful cyan reflected dawn highlights, distant warm peach horizon, atmospheric depth. Professional aviation campaign photography aesthetic, refined color grading, quiet aspiration and sense of journey. No logos, liveries, watermarks, words, UI, screens, telemetry, instruments or fake flight data. This is explicitly conceptual aviation artwork for marketing, not a simulator or software screenshot. Compose aircraft away from the left 48 percent and keep it wholly in frame with generous sky; lower third distant mountains and clouds. Avoid busy star fields, neon science fiction, unrealistic glowing contrails, unnecessary extra aircraft or people.

Las cinco capturas añadidas son material del proyecto autorizado por su propietario. Se seleccionaron del recorrido WPF QA `m28-qa-tour/203356-1920x1080`; conservan sus píxeles completos, proporciones y rótulos de datos sintéticos. La compresión WebP no transforma controles ni datos. No se publicaron las capturas de editores que mostraban rutas privadas del perfil de Windows.

| Recurso | Captura original | Tamaño real | Lo que demuestra |
| --- | --- | --- | --- |
| Academy | `08c-copiloto-academy-1920x1080.png` | 1920×1061 | Academy integrada en COPILOTO; no el editor completo |
| Performance | `05b-performance-plan-1920x1080.png` | 1920×1061 | Preparación y referencias manuales en QA |
| Studio | `03c-carga-layout-studio-1920x1080.png` | 1920×1061 | Layout aplicado en CARGA Y CABINA; no controles del editor |
| Career Local | `01k-career-inicio-1920x1080.png` | 1920×1061 | Piloto y operación local sintéticos |
| ACARS Local | `19d-acars-pirep-1920x1080.png` | 1600×829 | PIREP y eventos sintéticos locales |

Las capturas nuevas suman 538.798 bytes. El manifiesto `public/vector/web50/provenance.json` conserva dimensiones, origen, SHA-256 de cada original y archivo servido, evidencia QA e idioma original inglés. Las leyendas se traducen ES/EN/FR sin alterar la interfaz capturada. Las pruebas comprueban esos hashes, tamaños y estados. Los manifiestos anteriores y sus fuentes se conservan.

No se incorporó música, vídeo, fuente tipográfica ni dependencia nueva. Continúan las fuentes y recursos previamente documentados del proyecto. La futura banda sonora y las grabaciones auténticas necesitan procedencia y permiso verificables antes de integrarse.
