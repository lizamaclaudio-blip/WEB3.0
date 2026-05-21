export type OperationalState = "active" | "warning" | "critical" | "offline";

export interface NavItem {
  id: string;
  label: string;
  href: string;
}

export interface PilotSummary {
  name: string;
  rank: string;
  status: OperationalState;
  totalHours: number;
  nextRank: string;
  progressPercent: number;
  licenses: string[];
}

export interface HeroOperationalStatus {
  pilotStateLabel: string;
  acarsStateLabel: string;
  lastFlightLabel: string;
  nextOperationLabel: string;
}

export interface ActiveFlight {
  route: string;
  aircraft: string;
  status: string;
  hasActiveFlight: boolean;
  ctaLabel: string;
}

export interface EconomySummary {
  pilotBalanceUsd: number;
  accruedSalaryUsd: number;
  nextSettlement: string;
  progressionCostsUsd: number;
}

export interface AcarsStatus {
  version: string;
  connected: boolean;
  lastPirep: string;
  pendingCloseout: boolean;
}

export interface QuickAction {
  id: string;
  label: string;
  description: string;
  tag: string;
  href: string;
}

export interface RecentFlight {
  date: string;
  route: string;
  aircraft: string;
  status: string;
  score: string;
  economicResult: string;
}

export interface OperationalNotice {
  id: string;
  code: string;
  priority: string;
  date: string;
  message: string;
}

export interface OperationalMapData {
  route: string;
  distanceNm: number;
  status: string;
}

export interface NetworkStatusData {
  activeRoutes: number;
  airports: number;
  flightsToday: number;
  activePilots: number;
}

export interface SystemStatusData {
  acars: string;
  simbrief: string;
  economy: string;
  dispatch: string;
}

export interface DispatchOption {
  id: string;
  title: string;
  description: string;
  statA: string;
  statB: string;
  ctaLabel: string;
  href: string;
}

export interface ItineraryRoute {
  code: string;
  route: string;
  cityPair: string;
  aircraft: string;
  status: "Disponible" | "Requiere habilitacion";
  estimatedRevenueUsd: number;
}

export interface CharterEstimate {
  distanceNm: number;
  fuelKg: number;
  revenueUsd: number;
  costUsd: number;
  utilityUsd: number;
  status: string;
}

export interface TrainingModule {
  id: string;
  title: string;
  duration: string;
  suggestedAircraft: string;
  virtualCostUsd: number;
  status: "Disponible" | "Requiere rango" | "Proximamente";
}

export interface FlightHistoryItem {
  date: string;
  route: string;
  aircraft: string;
  type: string;
  status: string;
  score: string;
  economicResult: string;
  detailHref: string;
}

export interface FlightDetail {
  route: string;
  aircraft: string;
  status: string;
  score: string;
  flightTime: string;
  plannedFuelKg: number;
  actualFuelKg: number;
  estimatedUtilityUsd: number;
  actualUtilityUsd: number;
  pilotAccrualUsd: number;
  airlineLedger: string;
  operationalEvents: string[];
}

export interface AcarsSummary {
  version: string;
  status: string;
  lastContact: string;
  hudBridge: string;
  pendingPirep: string;
  compatibility: string[];
}

export interface EconomyOverview {
  pilot: {
    virtualBalanceUsd: number;
    accruedSalaryUsd: number;
    nextSettlement: string;
    progressionCostsUsd: number;
  };
  airline: {
    cashUsd: number;
    monthRevenueUsd: number;
    monthCostsUsd: number;
    monthNetUsd: number;
  };
  movements: string[];
}

export interface FleetAircraft {
  registration: string;
  code: string;
  realName: string;
  status: string;
  requiredRank: string;
  rangeNm: number;
  recommendedUse: string;
}

export interface AcademyModule {
  id: string;
  title: string;
  duration: string;
  status: string;
  virtualCostUsd: number;
}

export interface PilotProfile {
  name: string;
  callsign: string;
  rank: string;
  totalHours: number;
  base: string;
  licenses: string[];
  ratings: string[];
  nextRank: string;
  progressPercent: number;
  integrations: { label: string; status: string }[];
}

export interface SettingsSection {
  title: string;
  items: string[];
}
