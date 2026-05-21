# PW3 — Parche controlado Oficina + Entrenamiento

Fecha: 2026-05-17
Base usada: `data.zip` compartido por Claudio en este chat.
Objetivo: alinear y estilizar exclusivamente las pestañas internas **Oficina** y **Entrenamiento** del Crew Center.

## Archivos tocados

- `src/components/dashboard/sur/tabs/OfficeTab.tsx`
  - Se reordena la información en tarjetas, grillas y tablas contenidas.
  - Se evita salida visual en texto plano/pegado.
  - Se muestra credencial operacional, licencias, habilitaciones, aeronaves habilitadas, últimos PIREPs y economía del piloto.

- `src/components/dashboard/sur/tabs/TrainingTab.tsx`
  - Se ordena la vista en bloques tipo tarjeta.
  - Las tablas quedan dentro de contenedores con scroll horizontal seguro.
  - Se mejora legibilidad de certificaciones, habilitaciones, exámenes y política de intentos.

- `src/components/dashboard/sur/tabs/OfficeTrainingTabs.module.css`
  - CSS nuevo, aislado por módulo.
  - No modifica `globals.css`.
  - No pisa estilos globales compartidos.

- `src/components/dashboard/sur/SurStyleTabs.tsx`
  - Único cambio: pasar `data` a `OfficeTab` para poder mostrar rango, horas, permisos, economía y flota.
  - No se cambiaron iconos, nombres de tabs ni estructura general.

## Qué NO se tocó

- No se tocó `globals.css`.
- No se tocaron iconos.
- No se tocó landing pública.
- No se tocó dashboard HUB, Despachos, Flota ni Pilotos.
- No se tocó ACARS.
- No se tocó Supabase.
- No se tocaron APIs, economía, ledger, salary ni finalize.
- No se tocaron migraciones SQL.

## Validación realizada

- Revisión de sintaxis visual de los archivos modificados.
- Revisión anti-mojibake sobre archivos del parche: sin `Ã`, `Â` ni caracteres corruptos.

## Validación pendiente en proyecto local

Ejecutar:

```powershell
npm run build
```

Opcional:

```powershell
npx tsc --noEmit
npm run lint
```

## Nota de aplicación

Copiar el contenido del ZIP sobre la raíz del proyecto. El parche incluye solo archivos modificados y un CSS nuevo scoped para reducir riesgo de pisar otras páginas.
