# PW3 Office Ranks & Requirements

## Objetivo

Habilitar en la pestaña **Oficina** una matriz visual de rangos, requisitos, certificaciones, habilitaciones, teóricos y aeronaves por rango, conectada a Neon.

## Fuente de datos

El endpoint nuevo `GET /api/office/ranks` lee:

- `pilot_ranks`
- `rank_aircraft_permissions`
- `aircraft_models`
- `aircraft_performance_profiles`
- `pilot_profiles`

La UI no inventa permisos operativos; usa los permisos/modelos disponibles en Neon y aplica listas base de certificaciones, habilitaciones y teóricos para mostrar la progresión inicial.

## Reglas visuales

- La oficina muestra todos los rangos en acordeones.
- El rango actual queda abierto.
- Cada rango muestra requisitos de horas, PIREPs, certificaciones, habilitaciones y teóricos.
- Cada rango muestra aeronaves por tipo/modelo, no por matrícula.
- Flota y despacho se mantienen separados: Oficina muestra carrera; Despacho valida operación real.

## Archivos

- `src/lib/office/rank-career.ts`
- `src/app/api/office/ranks/route.ts`
- `src/components/dashboard/sur/tabs/OfficeTab.tsx`
- `src/app/globals.css`
