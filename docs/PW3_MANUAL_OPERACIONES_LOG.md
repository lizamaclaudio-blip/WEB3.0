# PW3 Manual Operaciones Log

## Preparación local
1. Crear archivo local (no versionado): `.env.local` o `.env.supabase`.
2. Definir:
   - `SUPABASE_DB_URL=postgresql://postgres:***@host:5432/postgres`
3. No subir `.env` a git.

## Orden recomendado de ejecución
1. `npm run pw3:download-airports`
2. `npm run pw3:db-master`
3. `npm run pw3:import-airports`
4. `npm run pw3:db-master` (normaliza + seeds con datos ya importados)
5. `npm run pw3:validate-master`

## Nota operativa
- `pw3:db-master` ejecuta todos los bloques SQL en orden.
- El bloque de normalización (`003`) y los seeds de hubs/rutas dependen de que los CSV ya estén importados.
- Se puede re-ejecutar para refrescar datos de OurAirports.
