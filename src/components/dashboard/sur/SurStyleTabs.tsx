"use client";

import { useState } from "react";
import type { CrewCenterData } from "@/components/dashboard/sur/DashboardClient";
import { DispatchTab } from "@/components/dashboard/sur/tabs/DispatchTab";
import { FleetTab } from "@/components/dashboard/sur/tabs/FleetTab";
import { HubCenterTab } from "@/components/dashboard/sur/tabs/HubCenterTab";
import { OfficeTab } from "@/components/dashboard/sur/tabs/OfficeTab";
import { PilotsTab } from "@/components/dashboard/sur/tabs/PilotsTab";
import { RegularFlightsTab } from "@/components/dashboard/sur/tabs/RegularFlightsTab";
import { TrainingTab } from "@/components/dashboard/sur/tabs/TrainingTab";

type TabId = "hub" | "dispatch" | "routes" | "office" | "training" | "fleet" | "pilots";

const tabs: { id: TabId; label: string; icon: TabId }[] = [
  { id: "hub", label: "HUB Center", icon: "hub" },
  { id: "dispatch", label: "Despachos", icon: "dispatch" },
  { id: "routes", label: "Vuelos Regulares", icon: "routes" },
  { id: "office", label: "Oficina", icon: "office" },
  { id: "training", label: "Entrenamiento", icon: "training" },
  { id: "fleet", label: "Flota", icon: "fleet" },
  { id: "pilots", label: "Pilotos", icon: "pilots" },
];

const tabIcons: Record<TabId, string> = {
  hub: String.fromCodePoint(0x1f4fa),
  dispatch: String.fromCodePoint(0x1f6eb),
  routes: String.fromCodePoint(0x1f6eb),
  office: String.fromCodePoint(0x1f9fe),
  training: String.fromCodePoint(0x2699) + "\uFE0F",
  fleet: String.fromCodePoint(0x2708) + "\uFE0F",
  pilots: String.fromCodePoint(0x1f465),
};

const tabHeroTitles: Record<TabId, string> = {
  hub: "HUB Center",
  dispatch: "Despacho de vuelos",
  routes: "Vuelos Regulares",
  office: "Oficina",
  training: "Entrenamiento",
  fleet: "Flota",
  pilots: "Pilotos",
};

export function SurStyleTabs({ data }: { data?: CrewCenterData }) {
  const [activeTab, setActiveTab] = useState<TabId>("dispatch");

  return (
    <section className="pw-sur-tabs-wrap">
      <div className="pw-sur-tabs" role="tablist" aria-label="Secciones Crew Center">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`pw-sur-tab-button ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span aria-hidden="true" className="pw-tab-icon">{tabIcons[tab.icon]}</span> {tab.label}
          </button>
        ))}
      </div>
      <div className="pw-sur-tab-content">
        <section className="pw-sur-tab-hero" aria-label={`Sección ${tabHeroTitles[activeTab]}`}>
          <div className="pw-sur-tab-hero-icon" aria-hidden="true">{tabIcons[activeTab]}</div>
          <h2>{tabHeroTitles[activeTab]}</h2>
        </section>
        {activeTab === "hub" && <HubCenterTab data={data} />}
        {activeTab === "dispatch" && <DispatchTab />}
        {activeTab === "routes" && <RegularFlightsTab />}
        {activeTab === "office" && <OfficeTab recentPireps={data?.recentPireps ?? []} movements={data?.movements ?? []} />}
        {activeTab === "training" && <TrainingTab permissions={data?.permissions ?? null} />}
        {activeTab === "fleet" && <FleetTab fleet={data?.fleet ?? []} />}
        {activeTab === "pilots" && <PilotsTab currentPilot={data?.pilot} pilots={data?.pilots ?? []} />}
      </div>
    </section>
  );
}
