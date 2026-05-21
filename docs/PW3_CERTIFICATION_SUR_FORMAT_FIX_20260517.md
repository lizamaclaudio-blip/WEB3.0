# PW3 Certification SUR Format Fix — 2026-05-17

## Base usada

- Base oficial actual: `scripts.zip` entregado por Claudio despues de corregir manualmente Oficina y Entrenamiento.
- Regla aplicada: no pisar diseno aprobado, no tocar CSS global, no tocar iconos globales, no tocar dashboard, ACARS, Supabase, APIs ni economia.

## Problema corregido

La ruta `/training/certifications/[aircraftCode]` renderizaba sin formato porque el archivo usaba clases globales `pw-checkride-*` que no tenian estilos definidos en la base actual. Por eso la pagina aparecia como texto plano y rompia el formato tipo SUR Air.

## Archivos tocados

1. `src/app/training/certifications/[aircraftCode]/page.tsx`
   - Se mantiene el flujo existente de autenticacion, piloto, reserva activa y catalogo de certificaciones.
   - Se reemplaza el marcado visual roto por estructura de tarjetas SUR-style: cabecera, resumen, acerca del checkride, ruta, criterios, plan, clima, requisitos, mapa, solicitud y regla de reintentos.
   - No se cambia la logica de negocio ni los datos de `catalog.ts`.

2. `src/app/training/certifications/[aircraftCode]/CertificationCheckridePage.module.css`
   - CSS aislado por modulo solo para esta pagina.
   - No modifica `src/app/globals.css`.
   - Replica el formato SUR Air: tarjetas blancas, headers negros, badges, grillas compactas, lista numerada, ruta y mapa.

## Archivos NO tocados

- `src/app/globals.css`
- `src/components/dashboard/sur/tabs/OfficeTab.tsx`
- `src/components/dashboard/sur/tabs/TrainingTab.tsx`
- `src/components/dashboard/sur/tabs/OfficeTrainingTabs.module.css`
- `src/components/dashboard/sur/SurStyleTabs.tsx`
- Dashboard / landing / flota / pilotos / despacho
- ACARS
- Supabase
- APIs
- Economia / ledger / salary / finalize

## Validacion realizada

- Se inspecciono la base real `scripts.zip` antes de tocar archivos.
- Se verifico que las clases `pw-checkride-*` no estaban definidas en `globals.css` ni en otros archivos.
- Se agrego CSS local por modulo para no afectar paginas existentes.
- Se reviso que no exista caracter de reemplazo/mojibake en los archivos nuevos.

## Validacion pendiente local

Ejecutar en Windows, usando tus `node_modules` de la base actual:

```powershell
npm run build
```

En este entorno no pude completar `npm run build` porque los `node_modules` del ZIP incluyen SWC de Windows (`@next/swc-win32-x64-msvc`) y el contenedor Linux intenta descargar `@next/swc-linux-x64-gnu`, pero no tiene acceso correcto al registry. Eso no modifica el parche; la validacion final debe hacerse en tu equipo Windows.
