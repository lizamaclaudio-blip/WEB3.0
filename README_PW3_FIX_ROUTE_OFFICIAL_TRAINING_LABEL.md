# PW3 Fix — Ruta oficial sin etiqueta TRAINING visible

Corrige la Sala de Despacho para que en el flujo **Ruta oficial** no aparezca la etiqueta técnica `TRAINING` al piloto.

## Cambios

- En `DispatchRoomClient.tsx` se normaliza la categoría visual de las rutas.
- Las rutas internas `TRAINING`, `SCHOOL`, `CADET`, `ACADEMY`, `STANDARD` o comerciales se muestran visualmente como **Ruta oficial**.
- El flujo Ruta oficial excluye categorías que pertenecen a otros flujos: `CHARTER`, `CARGO`, `TRANSFER`, `AIRCRAFT_TRANSFER`.
- No cambia la lógica interna de Neon: si una ruta es de escuela/cadete, sigue siendo operable según permisos; solo no se muestra como “TRAINING” en la UI.

## No toca

- ACARS
- Neon SQL
- db-master/import
- iconos
- layout global
