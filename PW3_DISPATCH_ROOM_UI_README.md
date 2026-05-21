# PW3 Dispatch Room UI Patch

Este parche separa el despacho rápido del dashboard de la sala de despacho completa.

## Cambios

- `src/components/dispatch/DispatchPageShell.tsx`
  - El bloque Entrenamiento / Charter queda como tabla compacta tipo aerolínea virtual.
  - Ya no aparecen los selectores de origen/destino dentro del acordeón de entrenamiento.
  - Al presionar `Reservar`, se abre `/dispatch/room` con el modo y aeronave seleccionada.
  - Todas las tarjetas/acordeones inician cerradas.

- `src/app/dispatch/room/page.tsx`
  - Nueva página tipo sala de despacho.

- `src/components/dispatch/DispatchRoomClient.tsx`
  - UI de sala de despacho con pasos: Búsqueda, Tipo de vuelo y aeronave, Plan de vuelo, Peso y combustible, Imprimir.
  - Paneles de Origen y Destino.
  - Barra lateral de piloto.
  - Preparada para reserva temporal de 15 minutos.

- `src/components/dispatch/DispatchRoom.module.css`
  - Estilos propios de la sala de despacho, inspirados en flujo operacional tipo aerolínea virtual.

- `src/components/dispatch/DispatchPageShell.module.css`
  - Helpers menores para badges/links.

## Importante

- No crea aún la reserva real en Neon.
- No bloquea aeronave en servidor todavía.
- No toca ACARS.
- No ejecuta db-master ni import-airports.
- No usa assets ni código de SUR Air.

## Validar

```powershell
npm run lint
npx tsc --noEmit
npm run build
```

## Prueba manual

1. Ir a `/dashboard` > Despachos.
2. Abrir `Entrenamiento / Charter`.
3. Elegir aeronave.
4. Presionar `Reservar`.
5. Debe abrir `/dispatch/room?...`.
6. En la sala, elegir origen/destino y continuar.
