# PW3 Economy — Initial Wallet & Expenses Changelog

## Bloque E3.5 — Capital inicial piloto + costos personales

### Monto inicial definido
- **USD virtual 25.000** por piloto
- Campo en catálogo: `initialPilotWalletGrantUsd: 25000`
- Nombre contable: `pilot_initial_grant`
- Ledger: `type=adjustment`, `category=pilot_initial_grant`, `direction=credit`
- `idempotency_key`: `pilot_initial_grant:<pilot_id>` o `pilot_initial_grant:<callsign>`

### Precios definitivos — Catálogo E3.5

| Código | Tipo | Monto USD |
|---|---|---|
| THEORY_BASIC | training_fee | 1.200 |
| THEORY_ADVANCED | training_fee | 2.500 |
| THEORY_RANK_EXAM | training_fee | 3.500 |
| FAILED_RETRY | checkride_fee | 850 |
| CHECKRIDE_INITIAL | checkride_fee | 4.500 |
| CHECKRIDE_LIGHT | checkride_fee | 5.500 |
| CHECKRIDE_TURBOPROP | checkride_fee | 8.500 |
| CHECKRIDE_REGIONAL_JET | checkride_fee | 14.000 |
| CHECKRIDE_NARROW_BODY | checkride_fee | 22.000 |
| CHECKRIDE_WIDE_BODY | checkride_fee | 35.000 |
| TYPE_RATING | rank_progression_fee | 18.000 |
| RECURRENT_RENEWAL | certification_fee | 6.500 |
| SPECIAL_CARGO_CERT | certification_fee | 9.500 |
| INTERNATIONAL_CERT | certification_fee | 15.000 |
| PILOT_TRANSFER_HUB_TO_HUB | pilot_transfer_fee | 1.200 |
| PILOT_TRANSFER_REGIONAL | pilot_transfer_fee | 2.500 |
| PILOT_TRANSFER_NATIONAL | pilot_transfer_fee | 5.000 |
| PILOT_TRANSFER_NON_HUB_RECOVERY | pilot_transfer_fee | 7.500 |
| PILOT_TRANSFER_INTERNATIONAL | pilot_transfer_fee | 12.000 |
| AIRCRAFT_ABANDONED_NON_HUB | operational_penalty | 10.000 |
| ADMIN_CANCELLATION_FEE | operational_penalty | 2.000 |
| PRIORITY_REPOSITION_REQUEST | operational_penalty | 8.000 |

### Regla de balance piloto nuevo
- Puede pagar: THEORY_BASIC (1.200) + CHECKRIDE_INITIAL (4.500) + PILOT_TRANSFER_HUB_TO_HUB (1.200) = **6.900** → sobran **18.100**
- NO puede pagar sin volar: TYPE_RATING (18.000) + CHECKRIDE_WIDE_BODY (35.000) requieren progresión

### Motor económico por aeronave
- `calculateRouteEconomyByAircraft(route)` devuelve un estimate por cada aeronave compatible
- UI `RegularFlightsView`: chips seleccionables, economía cambia al hacer clic
- Chip recomendado resaltado en azul; chip seleccionado en negro
- Texto: "Economia estimada con C208" / "Economia estimada con B350"

### Archivos tocados
- `src/lib/economy/catalog.json` — precios + initialPilotWalletGrantUsd
- `src/lib/economy/catalog.ts` — tipo + getInitialPilotWalletGrant()
- `src/lib/economy/types.ts` — EconomyLedgerType + ProgressionExpenseCatalogItem
- `src/lib/economy/calculator.ts` — calculateRouteEconomyByAircraft + RouteEconomyByAircraftItem
- `src/components/airline/RegularFlightsView.tsx` — chips interactivos por aeronave
- `src/components/airline/RegularFlightsView.module.css` — aircraftChip/Selected/Recommended
- `scripts/pw3/economy-model.mjs` — buildEconomyEstimatesByAircraft
- `scripts/pw3/validate-economy.mjs` — validaciones por aeronave + initial grant
- `scripts/pw3/export-economy-excel.mjs` — hojas Pax/Carga por aeronave + Wallet inicial
- `scripts/pw3/apply-pilot-initial-wallet-and-expenses.mjs` — script aplicador

### NO tocado
- globals.css ✓
- landing ✓
- Oficina ✓
- Entrenamiento (formato visual) ✓
- Certificaciones ✓
- ACARS ✓
- finalize ✓
- pago wallet vuelo a vuelo ✓
