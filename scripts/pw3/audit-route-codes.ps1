#!/usr/bin/env pwsh
# Auditor de route_code en Neon (PowerShell)
# Uso: .\scripts\pw3\audit-route-codes.ps1

Write-Host "=== AUDITORIA ROUTE_CODE NEON ===" -ForegroundColor Cyan

# Usar psql si está disponible, sino mostrar queries para ejecutar manualmente
$queries = @"
-- 1. Total rutas activas
SELECT COUNT(*) as total FROM public.network_routes WHERE is_active = true;

-- 2. Rutas con route_code válido PWG###
SELECT COUNT(*) as valid 
FROM public.network_routes 
WHERE is_active = true AND route_code ~ '^PWG[0-9]{3,4}$';

-- 3. Rutas con route_code NULO o VACIO
SELECT id, route_code, origin_icao, destination_icao, category
FROM public.network_routes
WHERE is_active = true
  AND (route_code IS NULL OR route_code = '')
ORDER BY origin_icao, destination_icao;

-- 4. Rutas con route_code INVALIDO (no PWG###)
SELECT id, route_code, origin_icao, destination_icao, category
FROM public.network_routes
WHERE is_active = true
  AND route_code IS NOT NULL 
  AND route_code != ''
  AND route_code !~ '^PWG[0-9]{3,4}$'
ORDER BY origin_icao, destination_icao;

-- 5. Duplicados
SELECT route_code, COUNT(*), 
       string_agg(origin_icao || '->' || destination_icao, ', ') as routes
FROM public.network_routes
WHERE is_active = true AND route_code IS NOT NULL
GROUP BY route_code
HAVING COUNT(*) > 1;

-- 6. Conteo por categoría
SELECT category, COUNT(*) as total,
       COUNT(CASE WHEN route_code ~ '^PWG[0-9]{3,4}$' THEN 1 END) as valid,
       COUNT(CASE WHEN route_code IS NULL OR route_code = '' OR route_code !~ '^PWG[0-9]{3,4}$' THEN 1 END) as invalid
FROM public.network_routes
WHERE is_active = true
GROUP BY category;
"@

Write-Host "`nQueries para ejecutar en Neon SQL Editor:" -ForegroundColor Yellow
Write-Host $queries
Write-Host "`nPara ejecutar directamente con psql:" -ForegroundColor Yellow
Write-Host "psql `$env:DATABASE_URL -f queries.sql" -ForegroundColor Gray

# Verificar si existe DATABASE_URL
if ($env:DATABASE_URL) {
    Write-Host "`n✅ DATABASE_URL encontrado" -ForegroundColor Green
    
    # Intentar ejecutar con psql si existe
    $psql = Get-Command psql -ErrorAction SilentlyContinue
    if ($psql) {
        Write-Host "Ejecutando queries..." -ForegroundColor Cyan
        $output = $queries | psql $env:DATABASE_URL 2>&1
        Write-Host $output
    } else {
        Write-Host "`n⚠️  psql no encontrado. Instalar PostgreSQL client o ejecutar queries manualmente en Neon SQL Editor." -ForegroundColor Yellow
    }
} else {
    Write-Host "`n⚠️  DATABASE_URL no configurado en entorno" -ForegroundColor Yellow
    Write-Host "Configurar: `$env:DATABASE_URL = 'postgres://...'" -ForegroundColor Gray
}
