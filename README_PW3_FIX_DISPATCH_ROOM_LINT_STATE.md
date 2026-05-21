# PW3 Fix Dispatch Room lint state

Corrige los errores de ESLint en `DispatchRoomClient.tsx` causados por llamadas `setState` sincronas dentro de `useEffect`.

Cambios:
- Inicializa modo/aeronave desde la URL sin `setState` en `useEffect`.
- Deriva la ruta del plan de vuelo sin usar `setRouteText` automatico dentro de `useEffect`.
- Mantiene la posibilidad de editar manualmente la ruta.
- Limpia warning no bloqueante de variable `original` sin uso en script legacy.

Validar:

```powershell
npm run lint
npx tsc --noEmit
npm run build
```

No toca ACARS, Neon, db-master ni import-airports.
