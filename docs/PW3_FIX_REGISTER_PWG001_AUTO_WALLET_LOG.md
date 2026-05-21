# PW3 Fix Registro PWG001 + Auto Wallet

Fecha: 2026-05-21

## Objetivo
- Corregir registro de Claudio a `PWG001`, `ACTIVE`, `CADET`.
- Aplicar wallet inicial automatica (USD virtual 25.000) con ledger idempotente.
- Bloquear doble registro por correo (case-insensitive).

## Auditoria inicial (antes)
- `lizamaclaudio@gmail.com` existia como:
  - callsign: `PWG002`
  - rank_code: `CADET`
  - pilot_status: `PENDING_APPROVAL`
- Wallet para `PWG001/PWG002`: no encontrada.

## Acciones aplicadas
1. Script de correccion puntual:
   - `scripts/pw3/fix-claudio-registration-state.mjs`
   - Ejecutado con `PW3_CONFIRM_DB_WRITE=YES`.
   - Resultado:
     - callsign final: `PWG001`
     - pilot_status final: `ACTIVE`
     - rank_code final: `CADET`
     - grant inicial aplicado: `pilot_initial_grant:<user_id>`

2. Guard de registro por correo:
   - SQL: `docs/sql/PW3_AUTH_REGISTRATION_GUARDS_001.sql`
   - Script aplicador: `scripts/pw3/apply-auth-registration-guards-to-neon.mjs`
   - Ejecutado con `PW3_CONFIRM_DB_WRITE=YES`.
   - Resultado:
     - indice `app_users_email_lower_unique` creado/verificado.
     - sin duplicados previos detectados.

3. Flujo de registro corregido:
   - `src/lib/auth/service.ts`
   - `src/app/register/page.tsx`
   - Cambios:
     - email normalizado y validado por lookup `lower(email)` antes de crear.
     - mensaje controlado para duplicado:
       - `Este correo ya esta registrado. Inicia sesion o recupera tu contrasena.`
     - asignacion del primer `PWG` disponible (reutiliza huecos).
     - `pilot_status='ACTIVE'`, `rank_code='CADET'`.
     - wallet inicial + ledger `pilot_initial_grant` idempotente en registro.

## Pruebas funcionales
- Registro con correo existente `lizamaclaudio@gmail.com`:
  - HTTP `409`, bloqueado.
- Registro con correo nuevo de prueba:
  - HTTP `200`, creado con `ACTIVE`, `CADET`.
  - callsign asignado: primer disponible (`PWG002` despues de ocupar `PWG001`).
  - wallet inicial: `25000.00`.
  - ledger initial grant: 1 registro.
- Segundo intento con el mismo correo nuevo:
  - HTTP `409`, bloqueado.
- Prueba mayusculas/minusculas (`LiZaMaClAuDiO@GMAIL.COM`):
  - HTTP `409`, bloqueado.

## No tocado
- `globals.css`
- diseno visual global
- ACARS desktop
- finalize
- Oficina / Entrenamiento / Certificaciones
- wallet pago vuelo a vuelo
