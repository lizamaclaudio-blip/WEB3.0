# PW3 Profile/Data pages + Active Reservation Guard

## Incluye

- `/mi-perfil`
- `/mis-datos`
- Menú piloto conectado a esas páginas.
- Endpoint `GET /api/dispatch/active-reservation`.
- Endpoint `POST /api/dispatch/active-reservation/cancel`.
- Compatibilidad `GET /api/reservations/active` usando sesión cookie actual.
- Banner global de reserva activa en Crew Center, Mi perfil y Mis datos.
- Bloqueo visual de nuevos despachos si existe una reserva/vuelo activo en Neon.
- Bloqueo server-side para impedir crear otra reserva temporal si ya existe una activa.

## Estados que bloquean

- `TEMP_RESERVED`
- `ACARS_READY`
- `ACARS_CLAIMED`
- `RESERVED`
- `DISPATCHED`
- `IN_FLIGHT`
- `LANDED`
- `PENDING_EVALUATION`
- `EVALUATED`

## Estados que no bloquean

- `EXPIRED`
- `CANCELLED`
- `COMPLETED`
- `NO_EVALUABLE`
- `INVALID`

## Validaciones recomendadas

```powershell
npm run lint
npx tsc --noEmit
npm run build
```

## No tocado

- ACARS
- SQL/Neon migrations
- economia
- scoring
- imports de aeropuertos
