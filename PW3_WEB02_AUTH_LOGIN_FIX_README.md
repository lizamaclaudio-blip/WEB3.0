# PW3 WEB02 Auth Login Fix

Corrige la lectura de perfil piloto en `getAuthenticatedPilot()`.

## Causa

En Neon, `pilot_profiles` no tiene columna `user_id`; el perfil usa `id` con el mismo UUID de `app_users.id`.

## Cambio

`src/lib/auth/service.ts`:

```sql
left join public.pilot_profiles p on p.user_id = u.id
```

se reemplaza por:

```sql
left join public.pilot_profiles p on p.id = u.id
```

## Validar

```powershell
npm run lint
npx tsc --noEmit
npm run build
```

Luego probar login con el usuario registrado.
