# PW3 WEB 02 - Registro y login con Neon

## Archivos incluidos

- src/lib/db/client.ts
- src/lib/auth/password.ts
- src/lib/auth/service.ts
- src/lib/session/server.ts
- src/app/api/auth/register/route.ts
- src/app/api/auth/login/route.ts
- src/app/api/auth/logout/route.ts
- src/app/api/auth/me/route.ts
- src/app/register/page.tsx
- src/app/login/page.tsx

## Que hace

- Reemplaza el registro basado en Supabase por API propia sobre Neon PostgreSQL.
- Crea usuario en app_users.
- Guarda credenciales con hash scrypt y salt.
- Llama a pw_create_pilot_profile_for_user para crear perfil piloto.
- Llama a pw_select_initial_training_hub para asignar SCPF, SCTB o SCIE.
- Crea cookie httpOnly pw3_session.
- Login valida correo/contrasena contra Neon.
- Logout elimina sesion.

## Requisitos

DATABASE_URL debe estar configurado en .env.local o en el entorno.

## Validar

npm run lint
npx tsc --noEmit
npm run build

## Probar

- /register
- /login
- /api/auth/me

No toca ACARS, diseno visual aprobado ni base maestra ya cargada.
