# Patagonia Wings 3.0 — reglas y parche de alineación

## Regla base preservada
- No tocar la web antigua.
- No tocar ACARS.
- No tocar Supabase ni SQL.
- No tocar endpoints ni APIs operativas.
- No pisar el dashboard/Crew Center tipo SUR Air ya aceptado.
- Landing pública `/` separada del dashboard interno `/dashboard`.
- La landing no debe mostrar tabs internos: HUB Center, Despachos, Oficina, Entrenamiento, Flota ni Pilotos como módulo operativo.
- Usar identidad Patagonia Wings: azul, negro, blanco, logo e imágenes heredadas.
- Cada entrega debe venir en ZIP con rutas completas para copiar y pegar.

## Archivos modificados en este parche
1. `src/components/site/PublicHeader.tsx`
   - Alinea el header público con el mismo sistema visual del Crew Center.
   - Usa wrapper de logo estable para evitar salto/descuadre.
   - Mantiene navegación pública y botones Crear cuenta / Acceso pilotos.

2. `src/components/site/LandingHeroImage.tsx`
   - Reemplaza mezcla de Tailwind suelto por clases estables.
   - Fija altura responsive y `object-fit: cover` para evitar desalineación de imagen.
   - Mantiene `public/branding/hero-banner.png`.

3. `src/components/site/LandingPublicOverview.tsx`
   - Agrega sección pública `#integraciones` para que los links del menú SimBrief/Navigraph no apunten a un ancla inexistente.
   - No agrega módulos internos.

4. `src/app/globals.css`
   - Agrega bloque final `PW3 landing/header alignment patch`.
   - Corrige ancho/alto del logo, alineación de header, navegación y botones.
   - Corrige counters públicos con `auto-fit`, evitando grilla de 6 columnas cuando hay 5 métricas.
   - Corrige frame del banner para que no se deforme ni quede desalineado.

## Validación realizada aquí
- Se revisó el ZIP recibido `data.zip` completo a nivel de estructura.
- Se confirmó que contiene `src/app`, `src/components`, `src/lib`, `public/branding`, `docs`, `scripts` y `supabase`.
- No se modificaron archivos de dashboard interno.
- No se modificaron archivos de ACARS.
- No se modificaron archivos SQL/Supabase.

## Pendiente local obligatorio
Ejecutar en tu carpeta `web-3.0` después de copiar los archivos:

```powershell
npm run build
```

Si tienes script de TypeScript/lint:

```powershell
npx tsc --noEmit
npm run lint
```
