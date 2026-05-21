# PW3 fix dispatch global flag badges

Corrige el despacho para usar `IcaoFlagBadge` global con bandera real (`flagcdn.com`) en vez de badges locales tipo `CL SCPF` o `N/D`.

Archivos incluidos:

- `src/components/dispatch/DispatchPageShell.tsx`
- `src/components/dispatch/DispatchPageShell.module.css`
- `src/components/ui/IcaoFlagBadge.tsx`

Luego ejecutar:

```powershell
npm run lint
npx tsc --noEmit
npm run build
```

No toca ACARS, Neon, db-master ni import-airports.
