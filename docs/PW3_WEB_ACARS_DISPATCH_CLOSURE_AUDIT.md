# PW3 Web + ACARS Dispatch Closure Audit

## Snapshot Inicial

- **Fecha**: 2026-05-21
- **Commit Web inicial**: `a76ae44`
- **Usuario prueba**: PWG001
- **Ruta prueba**: PWG695 SCTE→SCIE
- **Aeronave**: C208 · CC-PCD o CC-PGA
- **Estado OFP SimBrief**: Cargado correctamente (post-hotfix)

## Error Actual

> "Selecciona una ruta oficial válida para el despacho."

Aparece al presionar "Reservar por 15 minutos" en el paso final, aunque:
- Ruta oficial PWG695 está seleccionada
- OFP SimBrief está cargado
- Aeronave C208 CC-PCD está seleccionada

## Archivos a Revisar

### Web Frontend
- `src/components/dispatch/DispatchRoomClient.tsx` - Flujo completo de despacho
- `src/components/dispatch/DispatchPageShell.tsx` - Contenedor y estado
- `src/lib/dispatch/training-reservations.ts` - Lógica de reserva

### Web Backend
- `src/app/api/dispatch/training-reservations/route.ts` - API de reserva
- `src/app/api/dispatch/training-reservations/send-to-acars/route.ts` - API send-to-acars
- `src/lib/dispatch/neon-ops.ts` - Operaciones DB

### ACARS (si requiere cambios)
- `ApiService.cs` - Contrato de API
- `AcarsContracts.cs` - Definición de contratos
- `AcarsContext.cs` - Contexto de datos

## Archivos QUE NO SE TOCARÁN

- ACARS updater/installer
- ACARS autoupdate
- HUD
- globals.css
- wallet mensual
- ledger mensual
- auth/login
- economía final post-ACARS
- rutas origen/destino/distancia
- landing
- diseño general UI

## Estado de Fixes Anteriores (NO PISAR)

| Fix | Estado | Archivos |
|-----|--------|----------|
| SimBrief genera OFP | ✅ Preservar | `DispatchRoomClient.tsx` |
| Carga OFP | ✅ Preservar | `ofp.ts`, `latest/route.ts` |
| Ruta no solo destino | ✅ Preservar | `ofp.ts` |
| Flight number PWG### | ✅ Preservar | `flight-number.ts` |
| Aircraft C208 normalizado | ✅ Preservar | `aircraft-map.ts` |
| Fuel LBS→KG | ✅ Preservar | `ofp.ts` |
| Payload/pax/cargo desde OFP | ✅ Preservar | `ofp.ts` |
| Pax flight no impone pax SimBrief | ✅ Preservar | `DispatchRoomClient.tsx` |
| Cargo flight usa pax=0 | ✅ Preservar | `DispatchRoomClient.tsx` |
| Reserva temporal reservationId | ✅ Preservar | `training-reservations.ts` |
| send-to-acars pw3-dispatch-v1 | ✅ Preservar | `send-to-acars/route.ts` |
| Profitability floor | ✅ Preservar | `calculator.ts` |

## Hipótesis del Error

1. **routeId se pierde** al cargar OFP SimBrief (selectedRoute se pierde en estado)
2. **selectedRouteId** no se pasa correctamente a `canCreateReservation`
3. **Backend** no resuelve routeId por routeCode/origin/destination cuando falta
4. **Validación** frontend muestra mensaje genérico cuando el problema es routeId

## Plan de Acción

1. ✅ Investigar pérdida de routeId en frontend
2. ✅ Actualizar backend para resolver route por código/ORI/DST
3. ✅ Agregar logging detallado para debugging
4. ⏳ Verificar reservation devuelve reservationId + dispatchToken
5. ⏳ Verificar send-to-acars payload
6. ⏳ Revisar ACARS contract si es necesario
7. ⏳ Validadores
8. ✅ Build + Deploy (en progreso)

## Fixes Aplicados

### Fix 1: Mejorada resolución de rutas en backend

Archivo: `src/lib/dispatch/training-reservations.ts`

Cambios:
- Ahora intenta 3 estrategias de resolución en orden:
  1. UUID lookup si routeId es UUID válido
  2. Route code lookup (usa routeId como fallback si no es UUID)
  3. Endpoint lookup (origen/destino) como último recurso
- Agregado logging detallado para cada intento
- Mensajes de error específicos incluyen detalles de qué se intentó

### Fix 2: Mejores mensajes de error

Archivo: `src/app/api/dispatch/training-reservations/route.ts`

Cambios:
- Error response ahora usa mensaje específico de `details.message` si está disponible
- Permite que el backend devuelva mensajes descriptivos como:
  "No se encontró ruta para SCTE → SCIE. Verifica que la ruta esté activa."

### Fix 3: Mejor logging en frontend

Archivo: `src/components/dispatch/DispatchRoomClient.tsx`

Cambios:
- Console.log ahora incluye: selectedRouteId, selectedRouteInternalId, routeCode
- Ayuda a diagnosticar si el problema está en frontend o backend

## Definición de Hecho (DoD)

- [x] Backend resuelve routeId por routeCode/origin/destination si único
- [ ] routeId se preserva durante todo el flujo
- [ ] Reserva temporal crea/devuelve reservationId
- [ ] Reserva temporal crea/devuelve dispatchToken
- [ ] "Enviar a ACARS" habilitado después de reserva
- [ ] send-to-acars devuelve payload pw3-dispatch-v1
- [ ] ACARS puede hacer claim del dispatch
- [ ] Prueba productiva PWG001→PWG695→C208→OFP→Reserva→ACARS exitosa

## 2026-05-21 - ACARS Direct Schema Fix

Error productivo detectado:

`ACARS_DISPATCH_INSERT_FAILED` por columna `route_code` faltante en `public.training_dispatch_reservations`.

Fix aplicado:

- Migracion idempotente `20260521_training_dispatch_reservations_acars_direct_columns.sql`.
- Columnas direct dispatch agregadas: `route_code`, `payload_version`, `dispatch_payload`, `acars_payload`, `acars_state`.
- `send-to-acars` guarda payload completo `pw3-dispatch-v1` en columnas nuevas y conserva `prepared_acars_payload` para compatibilidad con claim/finalize.
- Error de schema faltante ahora devuelve `ACARS_SCHEMA_MISSING_COLUMN` con `missingColumn`, tabla y nombre de migracion.
