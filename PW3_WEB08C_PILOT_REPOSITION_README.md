# PW3 WEB 08C - Reposicionamiento del piloto en HUB Center

Este parche agrega un panel estilo HUB Center para diferenciar claramente:

- Reposicionamiento del piloto: mueve solo la ubicacion del piloto y tendra costo futuro.
- Traslado/Ferry de aeronave: mueve una aeronave real de la flota y puede generar recompensa.
- Entrenamiento libre: no mueve piloto ni aeronave.

## Archivos incluidos

- `src/components/dashboard/sur/PilotRepositioningPanel.tsx`
- `src/components/dashboard/sur/PilotRepositioningPanel.module.css`
- `scripts/pw3/apply-pilot-reposition-panel.mjs`

## Como aplicar

1. Copia los archivos en sus rutas.
2. Ejecuta:

```powershell
node scripts/pw3/apply-pilot-reposition-panel.mjs
```

3. Valida:

```powershell
npm run lint
npx tsc --noEmit
npm run build
```

## Donde aparece

El script intenta insertar el panel en:

`src/components/dashboard/sur/tabs/HubCenterTab.tsx`

Idealmente debajo de la tarjeta del aeropuerto y antes de Actividad del Aeropuerto.

## Nota importante

Este bloque NO ejecuta cobros reales ni mueve al piloto aun. Deja el panel visible y preparado para conectar wallet/economia en un bloque posterior.

No toca ACARS, no ejecuta db-master, no ejecuta import-airports, no cambia iconos, no usa Supabase y no hace push.
