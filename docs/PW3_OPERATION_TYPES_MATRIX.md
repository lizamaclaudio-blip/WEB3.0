# PW3 Operation Types Matrix

## Diccionario Oficial
- `Entrenamiento libre`: práctica referencial. No mueve piloto ni aeronave, no economía comercial, no ranking oficial.
- `Ruta oficial`: operación regulada de Patagonia Wings.
- `Charter`: operación oficial solicitada.
- `Carga`: operación oficial de carga.
- `Traslado de aeronave`: mover una aeronave real de la flota.
- `Reposicionamiento del piloto`: mover solo al piloto.

## Matriz de Tipos de Vuelo

| code | label | score_mode | mueve piloto | mueve aeronave | economía | ranking | progresión | lock aeronave real | ruta | aeronave | payload | simbrief | expira (min) |
|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `TRAINING_FREE` | Entrenamiento libre | `REFERENCE_ONLY` | no | no | no | no | no | no | no | sí | no | no | 15 |
| `SCHOOL_OFFICIAL_ROUTE` | Ruta oficial | `SCHOOL_OFFICIAL` | sí | sí | no | sí | sí | sí | sí | sí | no | sí | 15 |
| `COMMERCIAL_OFFICIAL_ROUTE` | Ruta oficial | `OFFICIAL` | sí | sí | sí | sí | sí | sí | sí | sí | sí | sí | 15 |
| `CHARTER_OFFICIAL` | Charter | `OFFICIAL` | sí | sí | sí | sí | sí | sí | no | sí | sí | sí | 15 |
| `CARGO_OFFICIAL` | Carga | `OFFICIAL` | sí | sí | sí | sí | sí | sí | sí | sí | sí | sí | 15 |
| `AIRCRAFT_TRANSFER` | Traslado de aeronave | `MISSION_OFFICIAL` | sí | sí | no | sí | sí | sí | no | sí | no | sí | 15 |
| `PILOT_REPOSITION` | Reposicionamiento del piloto | `NONE` | sí | no | no | no | no | no | no | no | no | no | null |
| `EVENT_TOUR` | Evento / Tour | `EVENT_OFFICIAL` | no | no | no | sí | no | no | sí | sí | no | sí | 15 |

## Reglas por Tipo
- `TRAINING_FREE`: reservación temporal referencial; no toca posición real ni estado oficial.
- `SCHOOL_OFFICIAL_ROUTE`: oficial escuela; cuenta para progresión, sin economía comercial.
- `COMMERCIAL_OFFICIAL_ROUTE`: oficial comercial completa.
- `CHARTER_OFFICIAL` y `CARGO_OFFICIAL`: oficiales bajo permisos de rango.
- `AIRCRAFT_TRANSFER`: misión para mover aeronave real.
- `PILOT_REPOSITION`: mueve solo piloto (sin lock de aeronave).

## Reglas por Rango (Base)
- `CADET`: entrenamiento libre + rutas oficiales de escuela. Comercial/charter/carga bloqueado.
- `SECOND_OFFICER`: entrenamiento libre + escuela; comercial según política vigente de negocio.
- `FIRST_OFFICER` y superiores: rutas comerciales oficiales habilitadas (sujetas a permisos/flags).

## Regla Anti-Trampa
- El servidor (Neon) es la fuente de verdad para:
  - permisos de rango,
  - tipo de operación,
  - locks de aeronave,
  - expiración de reserva,
  - transición de estado.
- El cliente solo propone; el backend valida y decide.

## ACARS como Caja Negra
- ACARS permanece desacoplado de esta migración.
- Esta capa solo prepara estado y payload para claim seguro.

## Terminología
- Se prohíbe usar términos alternativos no oficiales para esta operación aérea.
- El término oficial es `Traslado de aeronave`.
