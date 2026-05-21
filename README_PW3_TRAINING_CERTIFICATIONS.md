# PW3 Training / Certificaciones 01

Este parche crea el modulo visual inicial de Entrenamiento para Patagonia Wings 3.0.

## Incluye

- Listado de certificaciones por tipo de aeronave, no por matricula.
- Pagina de checkride por aeronave: `/training/certifications/[aircraftCode]`.
- Listado de habilitaciones operacionales.
- Listado de examenes teoricos.
- Politica de reintentos: 7 dias, 15 dias, 30 dias y reinicio de contador.
- Costos virtuales preparados para economia/wallet, sin cobro real todavia.

## Archivos

- `src/lib/training/catalog.ts`
- `src/components/dashboard/sur/tabs/TrainingTab.tsx`
- `src/app/training/certifications/[aircraftCode]/page.tsx`
- `src/app/globals.css`

## Validar

```powershell
npm run lint
npx tsc --noEmit
npm run build
```

## No toca

- ACARS
- Neon SQL
- Economia/wallet real
- Scoring
- Reservas
- db-master/import-airports
