# PW3 WEB01 Neon Public APIs — TypeScript hotfix

Corrige errores de TypeScript detectados despues del primer parche Neon APIs publicas.

## Archivos incluidos

- package.json
- src/lib/db/client.ts
- src/lib/db/queries/public-stats.ts
- src/app/api/airports/search/route.ts
- src/app/api/hubs/route.ts

## Cambios

- Agrega `@types/pg` como devDependency.
- Elimina import no usado en `public-stats.ts`.
- Tipa filas de `.map()` en rutas API.
- Tipa `existingColumns()` como `Promise<Set<string>>`.
- Quita directiva ESLint no usada en `client.ts`.

## Despues de copiar

Ejecutar:

```powershell
npm install
npm run lint
npx tsc --noEmit
npm run build
```

No toca diseño, ACARS ni base de datos.
