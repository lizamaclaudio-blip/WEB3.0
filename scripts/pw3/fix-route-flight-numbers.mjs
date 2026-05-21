#!/usr/bin/env node
/**
 * Script idempotente para corregir route_code en rutas oficiales
 * Uso: PW3_CONFIRM_DB_WRITE=YES node scripts/pw3/fix-route-flight-numbers.mjs
 */

import { dbQuery, dbTransaction } from "../../src/lib/db/client.ts";

const DRY_RUN = !process.env.PW3_CONFIRM_DB_WRITE || process.env.PW3_CONFIRM_DB_WRITE !== "YES";
const START_NUMBER = 600; // Empezar numeración desde PWG600 para evitar colisiones

console.log("=== FIX ROUTE FLIGHT NUMBERS ===");
console.log(`Mode: ${DRY_RUN ? "DRY RUN (preview only)" : "LIVE WRITE"}`);
console.log(`Required: PW3_CONFIRM_DB_WRITE=YES to actually write changes\n`);

async function audit() {
  // 1. Obtener rutas que necesitan corrección
  const needFix = await dbQuery(`
    SELECT id, route_code, origin_icao, destination_icao, category
    FROM public.network_routes
    WHERE is_active = true
      AND (
        route_code IS NULL 
        OR route_code = ''
        OR route_code !~ '^PWG[0-9]{3,4}$'
      )
    ORDER BY origin_icao, destination_icao
  `);

  console.log(`Rutas que necesitan corrección: ${needFix.rows.length}`);
  
  if (needFix.rows.length === 0) {
    console.log("✅ No hay rutas para corregir");
    return;
  }

  // 2. Obtener route_codes existentes válidos
  const existing = await dbQuery(`
    SELECT route_code 
    FROM public.network_routes 
    WHERE is_active = true 
      AND route_code ~ '^PWG[0-9]{3,4}$'
  `);
  
  const existingNumbers = new Set(
    existing.rows.map(r => parseInt(r.route_code.replace('PWG', ''), 10))
  );
  
  console.log(`Route codes válidos existentes: ${existingNumbers.size}`);

  // 3. Generar nuevos números
  let nextNum = START_NUMBER;
  function getNextNumber() {
    while (existingNumbers.has(nextNum)) {
      nextNum++;
    }
    existingNumbers.add(nextNum);
    return nextNum;
  }

  // 4. Preparar cambios
  const changes = [];
  for (const route of needFix.rows) {
    const num = getNextNumber();
    const newCode = `PWG${num}`;
    changes.push({
      id: route.id,
      oldCode: route.route_code,
      newCode,
      origin: route.origin_icao,
      dest: route.destination_icao,
      category: route.category
    });
  }

  // 5. Mostrar preview
  console.log("\n=== CAMBIOS PROPUESTOS ===");
  changes.forEach(c => {
    const status = c.oldCode ? `"${c.oldCode}"` : "NULL";
    console.log(`  ${c.origin} → ${c.dest} (${c.category}): ${status} → ${c.newCode}`);
  });

  // 6. Ejecutar si es modo live
  if (DRY_RUN) {
    console.log("\n⚠️  DRY RUN - No se escribieron cambios");
    console.log("Para ejecutar: PW3_CONFIRM_DB_WRITE=YES node scripts/pw3/fix-route-flight-numbers.mjs");
    return;
  }

  console.log("\n📝 Aplicando cambios...");
  
  let updated = 0;
  for (const change of changes) {
    try {
      await dbQuery(`
        UPDATE public.network_routes 
        SET route_code = $1, updated_at = now()
        WHERE id = $2::uuid
      `, [change.newCode, change.id]);
      
      console.log(`  ✅ ${change.origin} → ${change.dest}: ${change.newCode}`);
      updated++;
    } catch (err) {
      console.error(`  ❌ ${change.origin} → ${change.dest}: ${err.message}`);
    }
  }

  console.log(`\n=== RESULTADO ===`);
  console.log(`Actualizadas: ${updated}/${changes.length}`);
  
  // 7. Verificar duplicados después
  const dups = await dbQuery(`
    SELECT route_code, COUNT(*)
    FROM public.network_routes
    WHERE is_active = true AND route_code IS NOT NULL
    GROUP BY route_code
    HAVING COUNT(*) > 1
  `);
  
  if (dups.rows.length > 0) {
    console.log(`⚠️  Duplicados detectados: ${dups.rows.length}`);
    dups.rows.forEach(r => console.log(`  - ${r.route_code}: ${r.count} rutas`));
  } else {
    console.log("✅ Sin duplicados");
  }
}

audit().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
