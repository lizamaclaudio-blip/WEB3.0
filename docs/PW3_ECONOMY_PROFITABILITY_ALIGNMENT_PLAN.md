# PW3 Economy Profitability Alignment Plan

## Objetivo
Asegurar que **ningún vuelo/ruta/aeronave** tenga utilidad negativa. La utilidad mínima debe ser positiva en:
1. Economía estimada antes del OFP
2. Economía planificada después de cargar OFP SimBrief  
3. Economía final post-ACARS (excepto vuelos fallidos/cancelados)

## Estado Actual
- `economy/catalog.json` - tasas por categoría de ruta
- `calculator.ts` - fórmulas de revenue/cost
- `validation.ts` - validaciones económicas
- Rutas passenger/cargo con economía por aeronave
- SimBrief OFP integrado

## Problema Detectado
El modelo actual permite utilidades negativas cuando:
- Costos de combustible superan ingresos en rutas cortas
- Tarifas base no cubren costos fijos (airport fees, crew)
- Load factor bajo reduce revenue passenger

## Solución: Profitability Floor

### Regla Central
```
utilityUsd = totalRevenueUsd - totalCostUsd

if utilityUsd < targetProfitUsd:
  profitabilityAdjustmentUsd = targetProfitUsd - utilityUsd
  totalRevenueUsd += profitabilityAdjustmentUsd
  utilityUsd = targetProfitUsd
```

### Target Profit
```
targetProfitUsd = max(
  minimumProfitUsd,           // mínimo absoluto ($25)
  totalCostUsd * minimumProfitMarginPct  // % sobre costos (8%)
)
```

### Ajustes de Rentabilidad (razones transparentes)
1. `MINIMUM_ROUTE_FARE` - tarifa mínima operacional
2. `REGIONAL_SUBSIDY` - subsidio rutas aisladas
3. `CARGO_CONTRACT_PREMIUM` - prima contrato logístico
4. `OPERATIONAL_CONTRACT_FEE` - contrato vuelo oficial
5. `POST_FLIGHT_MINIMUM_MARGIN` - margen post-ACARS

## Parámetros Nuevos (catalog.json)
```json
{
  "minimumProfitUsd": 25,
  "minimumProfitMarginPct": 0.08,
  "remoteRegionalMinimumMarginPct": 0.12,
  "cargoMinimumMarginPct": 0.15,
  "charterMinimumMarginPct": 0.18,
  "regionalSubsidyEnabled": true,
  "cargoContractPremiumEnabled": true
}
```

## Archivos a Modificar
1. `src/lib/economy/catalog.json` - agregar parámetros
2. `src/lib/economy/types.ts` - tipos para ajustes
3. `src/lib/economy/calculator.ts` - implementar floor
4. `src/lib/economy/validation.ts` - validar utilidad >= 0
5. `src/components/dispatch/` - UI mostrar ajustes

## Qué NO se Toca
- ACARS updater/installer
- ACARS desktop claim/finalize
- Wallet mensual / Ledger mensual
- HUD / globals.css / auth/login
- Costos reales (fuel, fees, maintenance) - se mantienen
