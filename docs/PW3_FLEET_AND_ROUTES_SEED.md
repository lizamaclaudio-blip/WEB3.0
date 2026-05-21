# PW3 Fleet and Routes Seed 015

## Objetivo

Este bloque carga la flota inicial completa de Patagonia Wings 3.0 y una red base de rutas oficiales, escuela, regionales, Patagonia, carga y oceánicas.

## Regla operacional

- **Flota / Hangar** muestra el inventario completo de la aerolínea.
- **Despacho** filtra por ubicación operacional, rango, ruta, estado de aeronave y compatibilidad.
- No se debe usar la lista completa de flota para validar un despacho.

## Modelos incluidos

### Escuela / livianos
- C172 — Cessna 172 Skyhawk
- BE58 — Beechcraft Baron 58
- C208 — Cessna Grand Caravan
- TBM9 — Daher TBM 930

### Turboprop / regional
- B350 — Beechcraft King Air 350
- AT76 — ATR 72-600

### Jet narrowbody
- A20N — Airbus A320neo
- A319 — Airbus A319
- A320 — Airbus A320
- B736 — Boeing 737-600
- B737 — Boeing 737-700/800
- B739 — Boeing 737-900
- MD88 — McDonnell Douglas MD-88

### Widebody
- B78X — Boeing 787-10 Dreamliner

## Matrículas iniciales cargadas

Se conservan las aeronaves existentes si ya estaban en Neon:

- CC-PBA — BE58
- CC-PCA — C172
- CC-PCB — C172
- CC-PCC — C172

Se agregan matrículas base:

- CC-PCD — C208
- CC-PCE — C208
- CC-PTB — TBM9
- CC-PKA — B350
- CC-PKB — B350
- CC-PAT — AT76
- CC-PAU — AT76
- CC-PNA — A20N
- CC-PNB — A20N
- CC-PAC — A319
- CC-PAD — A319
- CC-PAA — A320
- CC-PAB — A320
- CC-PBC — B736
- CC-PBD — B736
- CC-PBE — B737
- CC-PBF — B737
- CC-PBG — B739
- CC-PBH — B739
- CC-PMD — MD88
- CC-PME — MD88
- CC-PWX — B78X
- CC-PWY — B78X

## Rutas base

Incluye rutas de escuela desde SCPF, rutas regionales nacionales, Patagonia/sur, carga y tramo oceánico SCEL/SCIP.

El SQL solo inserta rutas si ambos aeropuertos existen en `airports`. Si falta un aeropuerto, esa ruta no se crea y no rompe la migración.

## Cómo aplicar

Desde la raíz de `web-3.0`:

```powershell
node scripts/pw3/run-pw3-sql-015.mjs
```

Para validar sin aplicar nuevamente:

```powershell
node scripts/pw3/run-pw3-sql-015.mjs --validate-only
```

## Validaciones web

Después de copiar los archivos:

```powershell
npm run lint
npx tsc --noEmit
npm run build
```

## Pendiente futuro

- Ampliar rutas internacionales Sudamérica.
- Crear rutas/eventos/tours.
- Carga avanzada por hub.
- Integración de rutas con SimBrief/OFP.
- Recompensas de traslado de aeronave.
