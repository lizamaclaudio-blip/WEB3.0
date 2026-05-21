# PW3 Airport Activity + SayIntentions Notes

## Estado actual (PW3 Airport Activity 01)
- La seccion de Actividad del Aeropuerto en HUB Center usa datos internos de Patagonia Wings (Neon).
- Fuente principal actual: `training_dispatch_reservations`.
- Partidas y arribos se calculan por `origin_ident` y `destination_ident`.

## Relacion futura con SayIntentions
- `getWX` puede enriquecer ATIS/METAR/TAF, pista activa y frecuencias.
- `getVATSIM` puede aportar capa externa de trafico online.
- `flight.json` describe el vuelo activo local (no lista todo el aeropuerto).
- No prometer listado global completo de trafico SayIntentions hasta validar endpoints oficiales.

## Arquitectura recomendada
- Capa 1: actividad interna Patagonia Wings (reservas/estados propios).
- Capa 2: contexto externo (SayIntentions/VATSIM) como informacion complementaria.
- Ambas capas deben mantenerse separadas para evitar mezclar datos oficiales internos con contexto externo.

