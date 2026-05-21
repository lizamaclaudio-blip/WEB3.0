# PW3 Fleet + Routes 015 Fix

Este hotfix corrige dos errores detectados al aplicar el bloque 015:

1. `aircraft_models.family_id` era `NOT NULL` en Neon y el SQL anterior intentaba insertar modelos sin `family_id`.
2. La validación referenciaba `network_routes.operation_type` directamente, pero la columna podía no existir si el seed fallaba antes.

## Aplicar

Copiar los archivos sobre `web-3.0` y ejecutar:

```powershell
node scripts/pw3/run-pw3-sql-015.mjs
```

Validar sin aplicar de nuevo:

```powershell
node scripts/pw3/run-pw3-sql-015.mjs --validate-only
```

## Qué cambió

- El seeder 015 ahora es JS robusto e introspecta el schema real de Neon.
- Si `family_id` existe, reutiliza un `family_id` existente para no violar NOT NULL.
- La validación usa `to_jsonb(...)` para no fallar con columnas opcionales.
- No ejecuta `db-master` ni `import-airports`.
- No toca ACARS.
