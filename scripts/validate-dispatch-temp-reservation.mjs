#!/usr/bin/env node
/**
 * Validador de reserva temporal de despacho
 * Uso: node scripts/validate-dispatch-temp-reservation.mjs
 */

const BASE_URL = process.env.PW3_BASE_URL || "https://www.patagoniaw.com";

console.log("PW3 Dispatch Temporary Reservation Validator");
console.log("============================================");
console.log(`Base URL: ${BASE_URL}`);
console.log();

// Nota: Este validador requiere autenticación.
// Para prueba completa, usar navegador con PWG001 logueado.

console.log("PASOS MANUALES DE VALIDACIÓN:");
console.log();
console.log("1. Login en https://www.patagoniaw.com con PWG001");
console.log("2. Ir a /dispatch/training (o /dispatch/room con mode=official_route)");
console.log("3. Seleccionar:");
console.log("   - Origen: SCTE");
console.log("   - Destino: SCPF");
console.log("   - Aeronave: BE58 / CC-PBA");
console.log("   - Ruta: seleccionar una disponible");
console.log("4. Click 'Reservar por 15 minutos'");
console.log();
console.log("RESULTADOS ESPERADOS:");
console.log("✅ Si funciona: 'Reserva temporal creada' + countdown visible");
console.log("❌ Si falla: Mensaje específico de error (no genérico)");
console.log();
console.log("CÓDIGOS DE ERROR AHORA MAPEADOS:");
console.log("- ACTIVE_RESERVATION_EXISTS: Ya tienes reserva activa");
console.log("- AIRCRAFT_NOT_ALLOWED_FOR_PILOT: Aeronave no disponible");
console.log("- ORIGIN_NOT_FOUND / DESTINATION_NOT_FOUND: Aeropuerto inválido");
console.log("- TRAINING_RESERVATION_FAILED: Error DB (ver logs Vercel)");
console.log();
console.log("VERIFICAR LOGS VERCEL:");
console.log("1. Dashboard → Project → Logs");
console.log("2. Filtrar por: [dispatch] o [training-reservations]");
console.log("3. Buscar líneas con: callsign, aircraft_available, selectedAircraft");
console.log();

process.exit(0);
