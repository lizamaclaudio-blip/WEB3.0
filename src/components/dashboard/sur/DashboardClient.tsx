"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmedFlightCallout } from "@/components/dashboard/sur/ConfirmedFlightCallout";
import { MainOperationsBanner } from "@/components/dashboard/sur/MainOperationsBanner";
import { PilotCounters } from "@/components/dashboard/sur/PilotCounters";
import { SurStyleTabs } from "@/components/dashboard/sur/SurStyleTabs";
import { CrewHeader } from "@/components/layout/CrewHeader";
import type { CrewCenterPayload } from "@/lib/crew/server-data";

export type CrewCenterData = CrewCenterPayload;

type MeResponse = {
  ok: boolean;
  user?: { id: string; email: string; display_name: string | null };
  pilot?: {
    callsign: string | null;
    pilot_status: string | null;
    base_airport_id: string | null;
    current_airport_id: string | null;
  };
  current_airport?: {
    ident: string | null;
    name: string | null;
    city: string | null;
  };
};

export function DashboardClient() {
  const router = useRouter();
  const [data, setData] = useState<CrewCenterData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingApproval, setPendingApproval] = useState(false);
  const [airportLabel, setAirportLabel] = useState<string>("No registrado");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const meResponse = await fetch("/api/auth/me", {
          credentials: "include",
          cache: "no-store",
        });

        if (meResponse.status === 401) {
          router.replace("/login");
          return;
        }

        const me = (await meResponse.json()) as MeResponse;
        if (!meResponse.ok || !me.ok) {
          router.replace("/login");
          return;
        }

        const status = String(me.pilot?.pilot_status ?? "").toUpperCase();
        if (!cancelled) {
          setPendingApproval(status === "PENDING_APPROVAL");
          const currentIdent = me.current_airport?.ident?.trim() || "";
          const currentName = me.current_airport?.name?.trim() || "";
          const currentCity = me.current_airport?.city?.trim() || "";
          const hasCurrentId = Boolean(me.pilot?.current_airport_id);
          const hasBaseId = Boolean(me.pilot?.base_airport_id);

          if (currentIdent && (currentName || currentCity)) {
            setAirportLabel(`${currentIdent} — ${currentName || "Aeropuerto"} / ${currentCity || "No registrado"}`);
          } else if (currentIdent) {
            setAirportLabel(`${currentIdent} — Aeropuerto asignado`);
          } else if (hasCurrentId || hasBaseId) {
            setAirportLabel("Aeropuerto asignado");
          } else {
            setAirportLabel("Aeropuerto no configurado");
          }
        }

        const response = await fetch("/api/dashboard/crew-center", {
          credentials: "include",
          cache: "no-store",
        });

        if (response.status === 401) {
          throw new Error("Sesion valida, pero Crew Center no disponible temporalmente.");
        }

        const json = (await response.json()) as CrewCenterData;
        if (!response.ok) throw new Error((json as unknown as { error?: string }).error ?? "No se pudo cargar el Crew Center.");
        if (!cancelled) setData(json);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "No se pudo cargar el Crew Center.");
          setData(null);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!data) {
    return (
      <main className="min-h-screen bg-[#f8fafc] text-slate-900">
        <CrewHeader />
        <section className="pw-sur-page-header">
          <div className="pw-sur-container">
            <p className="pw-sur-eyebrow">Patagonia Wings 3.0 Crew Center</p>
            <h1>Cargando Crew Center...</h1>
            <p>{error || "Validando sesion y datos operacionales."}</p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f8fafc] text-slate-900">
      <CrewHeader pilot={data.pilot} />

        <section className="pw-sur-page-header">
          <div className="pw-sur-container">
            <p className="pw-sur-eyebrow">Patagonia Wings 3.0 Crew Center</p>
            <h1>Hola {data.pilot.name.split(" ")[0] || "Piloto"}!</h1>
            <p>Bienvenido al centro operacional de Patagonia Wings.</p>
            {pendingApproval && <p>Cuenta pendiente de aprobacion</p>}
          </div>
        </section>

      <PilotCounters counters={data.counters} />

      <div className="pw-sur-container py-8">
        <ConfirmedFlightCallout reservedFlight={data.activeReservation ?? data.reservedFlight ?? null} />
        <MainOperationsBanner data={data} />
        <SurStyleTabs data={data} />
      </div>
    </main>
  );
}
