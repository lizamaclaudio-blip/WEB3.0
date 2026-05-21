import { redirect } from "next/navigation";
import { DashboardClient } from "@/components/dashboard/sur/DashboardClient";
import { getAuthenticatedPilot } from "@/lib/auth/service";
import { getSessionTokenFromCookies } from "@/lib/session/server";

export default async function DashboardPage() {
  const token = await getSessionTokenFromCookies();
  const user = await getAuthenticatedPilot(token);

  if (!user) {
    redirect("/login");
  }

  console.info(`[auth] dashboard session ok user=${user.userId} callsign=${user.callsign ?? "N/A"}`);
  return <DashboardClient />;
}
