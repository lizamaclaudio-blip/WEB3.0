# PW3 Dispatch Room Steps 3, 4 and 5

Parche de UI para completar la Sala de Despacho visual.

## Archivos

- `src/components/dispatch/DispatchRoomClient.tsx`
- `src/components/dispatch/DispatchRoom.module.css`

## Cambios

- Paso 1: Origen y destino.
- Paso 2: Tipo de vuelo y aeronave.
- Paso 3: Plan de vuelo con configuracion de ruta, alternativa, nivel de vuelo y destino.
- Paso 4: Peso y combustible con validacion previa para ACARS.
- Paso 5: Despacho finalizado con tabla resumen, botones visuales y SOP.

## Estado

- No crea reserva real en Neon.
- No envia a ACARS todavia.
- No toca ACARS.
- No ejecuta db-master/import.
- No cambia iconos globales.
- No usa assets de SUR Air.

## Validar

```powershell
npm run lint
npx tsc --noEmit
npm run build
```
