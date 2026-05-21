# PW3 Aircraft Capacity + SimBrief KG/NM + Economy Plan

## Estado Actual

### Archivos Existentes

| Archivo | Descripción |
|---------|-------------|
| `src/lib/airline/aircraft.ts` | Tipos base de aeronaves (passengerCapacity, cargoCapacityKg, rangeNm) |
| `src/lib/airline/catalog.json` | Catálogo de 34 aeronaves activas con capacidades |
| `src/lib/economy/catalog.ts` | Perfiles económicos por categoría de aeronave |
| `src/lib/economy/calculator.ts` | Cálculo de economía estimada por ruta |
| `src/lib/economy/types.ts` | Tipos TypeScript para economía |
| `src/lib/simbrief/aircraft-map.ts` | Mapeo aeronaves Patagonia ↔ SimBrief |
| `src/lib/simbrief/ofp.ts` | Parser de OFP SimBrief con normalización KG |
| `src/components/dispatch/DispatchRoomClient.tsx` | UI de despacho con SimBrief |

### Datos Actuales por Aeronave (ejemplo C208)
```json
{
  "code": "C208",
  "name": "Cessna Grand Caravan",
  "category": "cargo_turboprop",
  "rangeNm": 900,
  "passengerCapacity": 12,
  "cargoCapacityKg": 1600,
  "supportsPassenger": true,
  "supportsCargo": true
}
```

### Faltante para SimBrief Integration
1. **fuelCapacityKg** - No existe en catálogo actual
2. **avgFuelBurnKgHour** - No existe
3. **avgCruiseKt** - No existe  
4. **baggagePerPassengerKg** - No existe
5. **simbrief.units** - No configurado explícito
6. **cargoScenarios** - No existen
7. **economySnapshot en payload** - No existe

## Estrategia de Migración

### Fase 1: Extender Catálogo Técnico
- Crear `src/lib/aircraft/technical-profiles.ts` con datos técnicos faltantes
- No modificar `catalog.json` (evitar breaking changes)
- Extender vía TypeScript con merge de datos

### Fase 2: SimBrief Prefill Mejorado
- Agregar `units=KGS` a URL de prefill
- Calcular `passengers` según capacidad aeronave y ruta
- Para cargo: `passengers=0`, `cargo=scenario.kg`

### Fase 3: Cargo Scenarios
- Crear `src/lib/dispatch/cargo-scenarios.ts`
- 9 escenarios: FOOD, MEDICAL, SPARE_PARTS, MAIL, HUMANITARIAN, FISHERY, REMOTE_COMMUNITY, INDUSTRIAL, AVIATION_PARTS

### Fase 4: Economía Planificada
- Extender `FlightEconomyEstimate` con campos OFP
- Recalcular usando datos reales del OFP
- Incluir `economySnapshot` en payload ACARS

### Fase 5: Payload v1 Actualizado
- Agregar `aircraftProfile` completo
- Agregar `simbrief` con datos OFP
- Agregar `economySnapshot`
- Agregar `cargoScenario` si aplica

## Qué NO se Toca
- ACARS updater/installer
- ACARS desktop claim/finalize
- Wallet mensual / Ledger mensual
- HUD / globals.css / auth/login
- Seeds destructivos
- Estructura DB Neon (solo lectura)

## Aeronaves a Cubrir (34 activas)
Ver `src/lib/airline/catalog.json` - todas las que tienen `"active": true`

Principales:
- C172, C182, C206, C208
- BE58, B350, TBM9
- DHC6, ATR72
- E170, E175, E190, E195
- B737, A320
- C17, AN12 (cargo)
- etc.
