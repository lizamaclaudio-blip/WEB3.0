import "server-only";
import { dbQuery } from "@/lib/db/client";

export async function seedEconomyDbSnapshot() {
  const [account, aircraft, routes, expenses] = await Promise.all([
    dbQuery(`select count(*)::int as count from public.pw3_airline_economy_accounts where airline_code='PW3'`),
    dbQuery(`select count(*)::int as count from public.pw3_aircraft_economy_profiles where active=true`),
    dbQuery(`select count(*)::int as count from public.pw3_route_economy_profiles where active=true`),
    dbQuery(`select count(*)::int as count from public.pw3_pilot_expense_catalog where active=true`),
  ]);

  return {
    account: Number(account.rows[0]?.count ?? 0),
    aircraft: Number(aircraft.rows[0]?.count ?? 0),
    routes: Number(routes.rows[0]?.count ?? 0),
    expenses: Number(expenses.rows[0]?.count ?? 0),
  };
}
