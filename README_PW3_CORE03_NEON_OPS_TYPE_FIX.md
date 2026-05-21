# PW3 WEB CORE 03 Hotfix — neon-ops RankPolicy type fix

Corrige el error TypeScript:

```txt
Type 'RankOperationPermissions | null' is not assignable to type 'RankPolicy | null'.
Types of property 'display_name' are incompatible.
```

## Archivo reemplazado

```txt
src/lib/dispatch/neon-ops.ts
```

## Cambio

`getRankPolicy()` ahora normaliza `display_name` con fallback a `rank_code`, porque `getRankOperationPermissions()` puede devolver `display_name: null`.

## Validar

```powershell
npm run lint
npx tsc --noEmit
npm run build
```

No toca ACARS, diseño, Neon data, SQL, db-master ni import-airports.
