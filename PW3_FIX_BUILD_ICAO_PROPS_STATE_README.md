# PW3 fix build ICAO badge + dispatch lint

Corrige los errores reportados:

- HubCenterTab.tsx y OfficeTab.tsx usan props legacy `code` / `showCode` en IcaoFlagBadge.
- IcaoFlagBadge ahora acepta `icao`, `ident` y también `code` como alias legacy.
- IcaoFlagBadge conserva tarjeta negra, texto blanco y bandera real desde flagcdn.
- DispatchPageShell elimina setState síncrono dentro de useEffect para cumplir React lint.
- No toca ACARS.
- No toca Neon data.
- No ejecuta db-master/import.

Después de copiar:

```powershell
npm run lint
npx tsc --noEmit
npm run build
```
