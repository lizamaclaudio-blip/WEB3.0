# PW3 E5 ACARS Finalize Schema

Version: `pw3-acars-finalize-v1`

## Required fields
- payloadVersion
- reservationId
- pilotCallsign
- aircraftCode
- operationType
- flightType (`training|itinerary|charter|cargo`)
- origin
- destination
- finalStatus (`completed|cancelled|aborted|diverted|crashed`)

## Rules
- Cargo: `passengerCount` must be 0.
- Cargo: `ticketRevenueUsd` must be 0.
- `completed` requires landing/completion time.
- `crashed|aborted|cancelled` produce no positive accrual.
- Invalid schema returns 400 with clear errors.

## Idempotency
- Finalize lock key: `acars_finalize:<reservationId>`.
- Ledger keys:
  - `flight_economy:<reservationId>:airline_revenue`
  - `flight_economy:<reservationId>:airline_cost`
  - `flight_economy:<reservationId>:maintenance_reserve`
  - `flight_economy:<reservationId>:pilot_accrual`
