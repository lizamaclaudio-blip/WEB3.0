# HOTFIX: ACARS 7.1.1 Bucle de Autoupdate Resuelto

**Fecha:** 2026-05-21  
**Versión afectada:** ACARS 7.1.1 (instalada)  
**Estado:** RESUELTO ✓

---

## Problema

ACARS 7.1.1 instalado mostraba actualización disponible aunque:
- Versión instalada: 7.1.1 (2026.5.21.3)
- Versión remota: 7.1.1 (2026.5.21.3)

Esto provocaba un bucle infinito descargando el mismo instalador.

---

## Causa Raíz

Los manifests en Web 3.0 tenían:
1. **Versión incorrecta:** 7.1.0 en lugar de 7.1.1
2. **URLs de Supabase:** En lugar de www.patagoniaw.com
3. **forceUpdate=true:** Forzaba descarga independientemente de versión
4. **mandatory=true:** Marcaba como obligatoria una "actualización" a la misma versión

ACARS 7.1.1 instalado leía estos manifests, veía:
- Versión remota 7.1.0 < Versión instalada 7.1.1 → No debería actualizar
- PERO forceUpdate=true forzaba la descarga

Esto creaba el bucle: descargar 7.1.1 → instalar → reiniciar → leer manifest erróneo → descargar otra vez.

---

## Solución Aplicada

### 1. Corregir Manifests Web 3.0

**acars-update.json:**
```json
{
  "version": "7.1.1",
  "latestVersion": "7.1.1",
  "mandatory": false,
  "required": false,
  "forceUpdate": false,
  "downloadUrl": "https://www.patagoniaw.com/downloads/acars/PatagoniaWingsACARSSetup.exe"
}
```

**autoupdater.xml:**
```xml
<item>
  <version>7.1.1</version>
  <url>https://www.patagoniaw.com/downloads/acars/PatagoniaWingsACARSSetup.exe</url>
  <mandatory>false</mandatory>
</item>
```

**channel.json:**
```json
{
  "version": "7.1.1",
  "latestVersion": "7.1.1",
  "forceUpdate": false,
  "mandatory": false,
  "required": false
}
```

### 2. Commit y Push

```bash
git add public/downloads/acars/acars-update.json
git add public/downloads/acars/autoupdater.xml
git add public/downloads/acars/channel.json
git commit -m "hotfix(web): ACARS 7.1.1 corregir bucle autoupdate"
git push origin main
```

---

## Resultado Esperado

### Para usuarios con ACARS 7.1.1 instalado:
- **ANTES:** Bucle infinito de descargas
- **DESPUÉS:** "No hay actualizaciones disponibles"

### Para usuarios con ACARS < 7.1.1:
- Se ofrecerá actualización a 7.1.1 correctamente
- Una vez en 7.1.1, no habrá más bucles

---

## Validación Post-Deploy

Después del deploy Vercel, verificar:

```bash
# Verificar versión en manifest
curl https://www.patagoniaw.com/downloads/acars/acars-update.json | jq '.version'
# Debe mostrar: "7.1.1"

# Verificar forceUpdate
curl https://www.patagoniaw.com/downloads/acars/acars-update.json | jq '.forceUpdate'
# Debe mostrar: false

# Verificar URLs
curl https://www.patagoniaw.com/downloads/acars/acars-update.json | jq '.downloadUrl'
# Debe mostrar URL de www.patagoniaw.com, NO de supabase
```

---

## Lecciones Aprendidas

1. **Sincronización:** Al subir nueva versión, actualizar TODOS los manifests simultáneamente
2. **URLs consistentes:** No mezclar URLs de Supabase con Web en los mismos manifests
3. **forceUpdate:** Usar con precaución; solo para casos de emergencia real
4. **Testing:** Validar autoupdate en VM antes de publicar

---

## NOTA: Código ACARS NO Modificado

Esta solución es **hotfix remoto** (manifests Web). El código de ACARS 7.1.1 no fue modificado porque:
- La lógica de comparación de versiones es correcta
- El problema era configuración de manifests, no código
- Evita necesidad de publicar 7.1.2 solo por configuración

Si en el futuro se requiere hacer el código más robusto contra manifests mal configurados, se podría agregar:
```csharp
// Solo forzar si hay diferencia real de versión
var updateAvailable = (hasNewVisibleVersion || hasNewRevision) && !alreadyAtLatest;
// Ignorar forceUpdate si ya estamos en la última versión
if (alreadyAtLatest && forceUpdate) {
    WriteLog("Update skipped: installed version is already current.");
    updateAvailable = false;
}
```

---

**Fin del Hotfix**
