#!/usr/bin/env node
/**
 * Auditor de route_code en Neon
 * Uso: node scripts/pw3/audit-route-codes.mjs
 */

import { dbQuery } from "../../src/lib/db/client.ts";

async function audit() {
  console.log("=== AUDITORIA ROUTE_CODE NEON ===\n");

  // 1. Total rutas activas
  const total = await dbQuery(`SELECT COUNT(*) as total FROM public.network_routes WHERE is_active = true`);
  console.log(`Total rutas activas: ${total.rows[0].total}`);

  // 2. Rutas con route_code válido PWG###
  const valid = await dbQuery(`
    SELECT COUNT(*) as valid 
    FROM public.network_routes 
    WHERE is_active = true AND route_code ~ '^PWG[0-9]{3,4}$'
  `);
  console.log(`Rutas con route_code válido: ${valid.rows[0].valid}`);

  // 3. Rutas con route_code NULO o VACIO
  const nullEmpty = await dbQuery(`
    SELECT id, route_code, origin_icao, destination_icao, category
    FROM public.network_routes
    WHERE is_active = true
      AND (route_code IS NULL OR route_code = '')
    ORDER BY origin_icao, destination_icao
  `);
  console.log(`\nRutas con route_code NULO/VACIO: ${nullEmpty.rows.length}`);
  if (nullEmpty.rows.length > 0) {
    nullEmpty.rows.forEach(r => console.log(`  - ${r.origin_icao} → ${r.destination_icao} (cat: ${r.category})`));
  }

  // 4. Rutas con route_code INVALIDO (no PWG###)
  const invalid = await dbQuery(`
    SELECT id, route_code, origin_icao, destination_icao, category
    FROM public.network_routes
    WHERE is_active = true
      AND route_code IS NOT NULL 
      AND route_code != ''
      AND route_code !~ '^PWG[0-9]{3,4}$'
    ORDER BY origin_icao, destination_icao
  `);
  console.log(`\nRutas con route_code INVALIDO: ${invalid.rows.length}`);
  if (invalid.rows.length > 0) {
    invalid.rows.forEach(r => console.log(`  - ${r.origin_icao} → ${r.destination_icao}: "${r.route_code}" (cat: ${r.category})`));
  }

  // 5. Duplicados
  const dups = await dbQuery(`
    SELECT route_code, COUNT(*), array_agg(origin_icao || '->' || destination_icao) as routes
    FROM public.network_routes
    WHERE is_active = true AND route_code IS NOT NULL
    GROUP BY route_code
    HAVING COUNT(*) > 1
  `);
  console.log(`\nRoute codes duplicados: ${dups.rows.length}`);
  if (dups.rows.length > 0) {
    dups.rows.forEach(r => console.log(`  - "${r.route_code}": ${r.count} rutas (${r.routes.join(', ')})`));
  }

  // 6. Resumen
  const validCount = parseInt(valid.rows[0].valid);
  const nullCount = nullEmpty.rows.length;
  const invalidCount = invalid.rows.length;
  const totalCount = parseInt(total.rows[0].total);
  const needFix = nullCount + invalidCount;

  console.log("\n=== RESUMEN ===");
  console.log(`Total rutas: ${totalCount}`);
  console.log(`Válidas: ${validCount} (${Math.round(validCount/totalCount*100)}%)`);
  console.log(`Necesitan corrección: ${needFix}`);
  console.log(`  - Nulas/vacías: ${nullCount}`);
  console.log(`  - Inválidas: ${invalidCount}`);
  console.log(`Duplicados: ${dups.rows.length}`);

  if (needFix > 0) {
    console.log("\n⚠️  Se requiere ejecutar fix-route-flight-numbers.mjs");
    process.exit(1);
  } else {
    console.log("\n✅ Todas las rutas tienen route_code válido");
    process.exit(0);
  }
}

audit().catch(err => {
  console.error("Error:", err.message);
  process.exit(1);
});
