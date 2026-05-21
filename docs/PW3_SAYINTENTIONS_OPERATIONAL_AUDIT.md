# PW3 SayIntentions Operational Audit 01

## Alcance del audit
- Este documento define como integrar SayIntentions en Patagonia Wings como fuente futura de contexto operacional.
- No implementa conexion activa ni consumo de API keys en esta etapa.
- No modifica ACARS en este bloque.

## Capacidades relevantes para Patagonia Wings

### 1. `getWX`
Uso futuro en PW3:
- ATIS, METAR, TAF.
- pista activa reportada por ATC.
- viento y contexto meteorologico operativo.
- frecuencias de comunicaciones.

Aplicacion:
- enriquecer Weather Advisor.
- comparar pista sugerida por viento (PW3) vs pista activa ATC (SayIntentions).
- reforzar briefing de despacho.

### 2. `getCommsHistory`
Uso futuro en PW3:
- historial de comunicaciones ATC/piloto.
- evidencia operacional para resumen y auditoria de vuelo.
- validaciones blandas de clearance/comunicaciones.

### 3. `flight.json`
Uso futuro en PW3/ACARS local:
- contexto vivo del vuelo activo.
- aeropuerto actual, origen/destino, ruta, runway planificada, gate/taxi context.

Regla:
- `flight.json` se consume solo en ACARS/local conectado al simulador.
- No se debe leer desde web cloud/Vercel.

### 4. `importVAData`
Uso futuro:
- personalidad Patagonia Wings para dispatcher, copilot, cabin crew y skyops.
- estandar de mensajes y estilo operacional propio.

### 5. `ACARS_IN` / `sayAs`
Uso futuro:
- mensajes operacionales al piloto dentro del ecosistema SayIntentions.
- ejemplo: despacho listo, aviso meteorologico, recomendacion de alterno.

### 6. `getTFRs` y `getVATSIM`
Uso futuro:
- capa informativa externa de entorno/espacio aereo/trafico red.
- no bloquea automaticamente vuelos en primera fase.

## Tráfico y entorno del simulador: posicion oficial
- Patagonia Wings no promete inyeccion propia de trafico.
- SayIntentions puede aportar contexto del entorno/trafico segun sus capacidades oficiales.
- PW3 consumira solo los datos que SayIntentions exponga por API/documentacion oficial.
- Primera integracion: lectura y contexto operacional (no control de trafico).

## Fronteras de responsabilidad
- SayIntentions app: conectado al simulador y proveedor de contexto ATC/operacional.
- Patagonia Wings web: briefing, despacho, visualizacion y reglas internas.
- Patagonia Wings ACARS: integracion final local con simulador y evidencia de vuelo.

## Variables futuras (documentacion, no activadas)
- `SAYINTENTIONS_ENABLED=false`
- `SAYINTENTIONS_API_KEY=`
- `SAYINTENTIONS_VA_API_KEY=`

Seguridad:
- API keys solo server-side o en ACARS/local.
- Nunca exponer secrets en `NEXT_PUBLIC_*`.

## Restricciones actuales
- No usar `setFreq`, `setVar`, `setPause` desde la web por ahora.
- No acoplar `flight.json` a endpoints cloud.
- No declarar capacidad de trafico global completo sin validar endpoint oficial.

