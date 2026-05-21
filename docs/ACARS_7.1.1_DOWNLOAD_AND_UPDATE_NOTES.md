# ACARS 7.1.1 - Notas de Descarga y Actualizacion

**Version:** 7.1.1  
**Fecha:** 2026-05-21  
**URL Descarga:** https://www.patagoniaw.com/downloads/acars/PatagoniaWingsACARSSetup.exe

---

## Cambio de Sistema de Autoupdate

### Antes (hasta version 7.1.0)
ACARS utilizaba Supabase Storage para consultar actualizaciones disponibles.

```
URL antigua: https://qoradagitvccyabfkgkw.supabase.co/storage/v1/object/public/acars-releases/
```

### Ahora (desde version 7.1.1)
ACARS consulta actualizaciones directamente desde Patagonia Wings Web.

```
URL nueva: https://www.patagoniaw.com/downloads/acars/
```

---

## Para Usuarios con ACARS Antiguo (7.0.x o 7.1.0)

### Problema
Si tienes una version anterior de ACARS instalada (7.0.x o 7.1.0), es posible que el autoupdate automatico **no funcione** si tu version aun apunta al manifest antiguo de Supabase.

### Solucion
1. **Descarga manual:** Ve a https://www.patagoniaw.com/downloads/
2. **Descarga** el instalador PatagoniaWingsACARSSetup.exe (version 7.1.1)
3. **Ejecuta** el instalador (actualizara tu version existente)
4. **Listo:** Desde ahora, tu ACARS 7.1.1 consultara actualizaciones desde www.patagoniaw.com

### Una sola vez
Esta instalacion manual solo es necesaria **una vez**. Las versiones futuras se actualizaran automaticamente desde el nuevo servidor.

---

## Para Nuevos Usuarios

1. Descarga desde: https://www.patagoniaw.com/downloads/acars/PatagoniaWingsACARSSetup.exe
2. Ejecuta el instalador
3. Inicia sesion con tu cuenta de Patagonia Wings
4. Comienza a volar

---

## Verificacion de Version

Para confirmar que tienes ACARS 7.1.1:

1. Abre Patagonia Wings ACARS
2. Mira la esquina inferior derecha de la ventana de login
3. Debe mostrar: **Version 7.1.1**

O tambien:
- Ve a Configuracion → Acerca de
- Debe indicar: **7.1.1 (2026.5.21.3)**

---

## Que NO Cambia

- Tu cuenta de piloto sigue funcionando igual
- Tus PIREPs y vuelos anteriores estan guardados
- Tu wallet, economia y ledger no se ven afectados
- El proceso de claim/finalize de vuelos sigue igual
- El HUD en MSFS funciona igual

---

## Soporte

Si tienes problemas con la instalacion:
- Email: soporte@patagoniaw.com
- Discord: Canal #soporte-acars
- Web: https://www.patagoniaw.com/support

---

## Historial

- **2026-05-21:** Publicacion ACARS 7.1.1 sin dependencia Supabase
