# PW3 WEB 07D - Despacho estilo SUR/PW integrado

## Archivos incluidos

- `src/components/dispatch/DispatchPageShell.tsx`
- `src/components/dispatch/DispatchPageShell.module.css`
- `src/components/dashboard/sur/tabs/DispatchTab.tsx`
- `src/app/dispatch/page.tsx`

## Qué corrige

- Reemplaza el bloque gris oscuro por una interfaz clara, blanca/azul, integrada al diseño aprobado del dashboard.
- Mantiene el tab `Despachos` existente y sus iconos.
- Mantiene `/dispatch` reutilizando el mismo flujo.
- Usa acordeones/desplegables con orden tipo aerolínea virtual:
  1. Reservar Vuelos Especiales
  2. Entrenamiento / Charter
  3. Eventos / Tours
  4. Traslados
  5. Vuelos Ejecutivos
  6. Reservar Vuelos Regulares
  7. Aeronaves disponibles en ubicación/HUB
  8. Ruta disponible
  9. Meteorología
  10. Advertencias
  11. Resumen de despacho

## Endpoints usados

- `/api/auth/me`
- `/api/fleet/available`
- `/api/routes/available`
- `/api/airport-metar`

## Reglas preservadas

- No toca ACARS.
- No ejecuta db-master ni import-airports.
- No cambia iconos ni tabs.
- No usa Supabase ni mocks.
- No introduce mojibake.
- No copia assets de SUR Air.

## Después de copiar

Ejecutar:

```powershell
npm run lint
npx tsc --noEmit
npm run build
```

Luego revisar:

- `http://localhost:3000/dashboard` tab Despachos
- `http://localhost:3000/dispatch`
