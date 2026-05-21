# PW3 - Rescate de estilos y reversa segura

Fecha: 2026-05-17
Base usada: `data.zip` compartido por Claudio en este chat.

## Objetivo

Revertir de forma segura el parche anterior de alineacion que pudo afectar vistas internas del Crew Center, especialmente Oficina y Entrenamiento.

## Archivos restaurados

- `src/app/globals.css`
- `src/components/site/PublicHeader.tsx`
- `src/components/site/LandingHeroImage.tsx`
- `src/components/site/LandingPublicOverview.tsx`

## Motivo tecnico

El parche anterior agrego reglas globales sobre clases compartidas como:

- `.pw-sur-header`
- `.pw-sur-header-inner`
- `.pw-sur-counters`
- `.pw-sur-brand`
- `.pw-sur-nav`

Esas clases no son exclusivas de la landing publica. Tambien pueden impactar el dashboard interno y las vistas tipo SUR Air. Por seguridad se restaura exactamente la version contenida en el `data.zip` original antes de continuar.

## Reglas obligatorias para siguientes parches

1. No tocar clases globales compartidas sin revisar todas las pantallas que las usan.
2. No cambiar iconos si no fue solicitado.
3. No modificar ACARS, Supabase, APIs, economia, ledger, salary, finalize ni flujos operativos en este bloque.
4. No reemplazar archivos completos salvo que sean los mismos archivos base revisados.
5. Evitar mojibake: no usar caracteres corruptos ni copiar texto con codificacion dudosa.
6. Mantener la estructura SUR Air ya aprobada.
7. Landing publica `/` no debe mostrar modulos internos del piloto.
8. Dashboard interno `/dashboard` mantiene tabs y flujo privado.

## Validacion recomendada despues de copiar

```powershell
npm run build
```

Si estan disponibles:

```powershell
npx tsc --noEmit
npm run lint
```

## Nota

Este paquete es una reversa de seguridad. No intenta redisenar Oficina ni Entrenamiento. Primero estabiliza la base para evitar seguir pisando cambios.
