# PW3 Dispatch Embedded Flow

Corrige la experiencia visual del despacho para que al presionar **Reservar** en Entrenamiento, Ruta oficial o Charter el flujo se abra dentro del mismo tab **Despachos** del dashboard, manteniendo:

- header superior de Patagonia Wings,
- banner principal,
- tabs HUB Center / Despachos / Oficina / Entrenamiento / Flota / Pilotos,
- card de “Despacho de vuelos”.

## Archivos modificados

- `src/components/dashboard/sur/tabs/DispatchTab.tsx` se mantiene apuntando a `DispatchPageShell`.
- `src/components/dispatch/DispatchPageShell.tsx`
  - agrega estado interno para abrir la sala de despacho embebida,
  - reemplaza navegación dura a `/dispatch/room` por render interno,
  - conserva href como fallback para página directa.
- `src/components/dispatch/DispatchRoomClient.tsx`
  - agrega props `embedded` y `onBack`,
  - oculta topbar/header externo cuando se usa dentro del dashboard,
  - mantiene `/dispatch/room` como página independiente.
- `src/components/dispatch/DispatchPageShell.module.css`
  - agrega estilos para aviso de flujo activo.
- `src/components/dispatch/DispatchRoom.module.css`
  - agrega layout embebido dentro del dashboard.

## Validar

```powershell
npm run lint
npx tsc --noEmit
npm run build
```

## Prueba manual

1. Ir a `/dashboard`.
2. Abrir tab **Despachos**.
3. Abrir operaciones disponibles.
4. Presionar **Reservar** en Ruta oficial, Entrenamiento o Charter.
5. Confirmar que el flujo se abre debajo de **Despacho de vuelos**, sin cambiar de página visual.

No toca ACARS, Neon SQL, endpoints, iconos ni reglas de reserva.
