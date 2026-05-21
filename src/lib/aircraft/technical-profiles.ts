/**
 * Aircraft Technical Profiles - Extended capacity and performance data
 * Extends airline/catalog.json with SimBrief and operational parameters
 */

import { AIRLINE_AIRCRAFT, type AirlineAircraft } from "@/lib/airline/aircraft";

export type AircraftTechnicalProfile = {
  aircraftCode: string;
  simbriefCode: string;
  displayName: string;
  category: string;

  // Capacity
  passengerCapacity: number;
  crewRequired: number;
  maxCargoKg: number;
  maxPayloadKg: number;
  baggagePerPassengerKg: number;
  maxBaggageKg: number;

  // Payload limits for SimBrief safety
  standardPassengerWeightKg: number; // 84kg includes carry-on
  operationalMtowBufferKg: number; // Safety margin below MTOW
  maxPassengerFlightCargoKg: number; // Max commercial cargo in passenger flight (usually 0)

  // Fuel & Performance
  fuelCapacityKg: number;
  reserveFuelKg: number;
  avgFuelBurnKgHour: number;
  avgCruiseKt: number;
  maxRangeNm: number;
  minRunwayFt?: number;

  // Operations
  cargoCompatible: boolean;
  passengerCompatible: boolean;
  trainingCompatible: boolean;

  // Economy defaults
  economy: {
    baseTicketYieldUsdPerNm: number;
    ticketBaseFareUsd: number;
    cargoRateUsdPerKgNm: number;
    cargoBaseFeeUsd: number;
    baggageFeeUsdPerKg: number;
    airportFeeClass: string;
    maintenanceReserveUsdPerHour: number;
    wearReserveUsdPerLanding: number;
  };

  // SimBrief defaults
  simbrief: {
    aircraftType: string;
    units: "KGS" | "LBS";
    defaultCruiseProfile?: string;
    defaultPassengers?: number;
    defaultCargoKg?: number;
  };

  source: "manufacturer" | "icao_doc" | "va_operational_estimate";
};

// Technical profiles for active fleet
// Sources: Manufacturer specs, ICAO docs, operational estimates for VA
const TECHNICAL_PROFILES: Record<string, AircraftTechnicalProfile> = {
  // Single Engine Piston
  C172: {
    aircraftCode: "C172",
    simbriefCode: "C172",
    displayName: "Cessna 172 Skyhawk",
    category: "single_engine",
    passengerCapacity: 3, // 4 total - 1 pilot
    crewRequired: 1,
    maxCargoKg: 120,
    maxPayloadKg: 360,
    baggagePerPassengerKg: 20,
    maxBaggageKg: 60,
    standardPassengerWeightKg: 84,
    operationalMtowBufferKg: 50,
    maxPassengerFlightCargoKg: 0,
    fuelCapacityKg: 144, // 56 gal * 6lb/gal / 2.2
    reserveFuelKg: 45,
    avgFuelBurnKgHour: 28,
    avgCruiseKt: 110,
    maxRangeNm: 640,
    minRunwayFt: 1500,
    cargoCompatible: false,
    passengerCompatible: true,
    trainingCompatible: true,
    economy: {
      baseTicketYieldUsdPerNm: 0.15,
      ticketBaseFareUsd: 35,
      cargoRateUsdPerKgNm: 0,
      cargoBaseFeeUsd: 0,
      baggageFeeUsdPerKg: 1.0,
      airportFeeClass: "small_regional",
      maintenanceReserveUsdPerHour: 45,
      wearReserveUsdPerLanding: 8,
    },
    simbrief: {
      aircraftType: "C172",
      units: "KGS",
      defaultPassengers: 2,
      defaultCargoKg: 0,
    },
    source: "manufacturer",
  },

  // Piston Twin
  BE58: {
    aircraftCode: "BE58",
    simbriefCode: "BE58",
    displayName: "Beechcraft Baron 58",
    category: "piston_twin",
    passengerCapacity: 5, // 6 total - 1 pilot
    crewRequired: 1,
    maxCargoKg: 220,
    maxPayloadKg: 680,
    baggagePerPassengerKg: 20,
    maxBaggageKg: 100,
    standardPassengerWeightKg: 84,
    operationalMtowBufferKg: 100,
    maxPassengerFlightCargoKg: 0,
    fuelCapacityKg: 320, // ~140 gal
    reserveFuelKg: 90,
    avgFuelBurnKgHour: 75,
    avgCruiseKt: 185,
    maxRangeNm: 950,
    minRunwayFt: 2000,
    cargoCompatible: false,
    passengerCompatible: true,
    trainingCompatible: true,
    economy: {
      baseTicketYieldUsdPerNm: 0.22,
      ticketBaseFareUsd: 55,
      cargoRateUsdPerKgNm: 0,
      cargoBaseFeeUsd: 0,
      baggageFeeUsdPerKg: 1.2,
      airportFeeClass: "regional",
      maintenanceReserveUsdPerHour: 85,
      wearReserveUsdPerLanding: 15,
    },
    simbrief: {
      aircraftType: "BE58",
      units: "KGS",
      defaultPassengers: 3,
      defaultCargoKg: 0,
    },
    source: "manufacturer",
  },

  // Turboprop Single - C208 Grand Caravan
  C208: {
    aircraftCode: "C208",
    simbriefCode: "C208",
    displayName: "Cessna Grand Caravan",
    category: "cargo_turboprop",
    passengerCapacity: 11, // 12 total - 1 pilot
    crewRequired: 1,
    maxCargoKg: 1600,
    maxPayloadKg: 1860,
    baggagePerPassengerKg: 20,
    maxBaggageKg: 220,
    standardPassengerWeightKg: 84,
    operationalMtowBufferKg: 150,
    maxPassengerFlightCargoKg: 0,
    fuelCapacityKg: 1134, // 335 gal
    reserveFuelKg: 200,
    avgFuelBurnKgHour: 170,
    avgCruiseKt: 170,
    maxRangeNm: 900,
    minRunwayFt: 2000,
    cargoCompatible: true,
    passengerCompatible: true,
    trainingCompatible: true,
    economy: {
      baseTicketYieldUsdPerNm: 0.28,
      ticketBaseFareUsd: 75,
      cargoRateUsdPerKgNm: 0.0035,
      cargoBaseFeeUsd: 180,
      baggageFeeUsdPerKg: 1.5,
      airportFeeClass: "regional",
      maintenanceReserveUsdPerHour: 120,
      wearReserveUsdPerLanding: 25,
    },
    simbrief: {
      aircraftType: "C208",
      units: "KGS",
      defaultPassengers: 6,
      defaultCargoKg: 300, // Conservative for cargo flights; passenger flights use baggage calculation
    },
    source: "manufacturer",
  },

  // Turboprop Single - TBM 930
  TBM9: {
    aircraftCode: "TBM9",
    simbriefCode: "TBM9",
    displayName: "Daher TBM 930",
    category: "turboprop_single",
    passengerCapacity: 5, // 6 total - 1 pilot
    crewRequired: 1,
    maxCargoKg: 180,
    maxPayloadKg: 620,
    baggagePerPassengerKg: 20,
    maxBaggageKg: 100,
    standardPassengerWeightKg: 84,
    operationalMtowBufferKg: 150,
    maxPassengerFlightCargoKg: 0,
    fuelCapacityKg: 408, // 292 gal
    reserveFuelKg: 100,
    avgFuelBurnKgHour: 115,
    avgCruiseKt: 320,
    maxRangeNm: 1300,
    minRunwayFt: 2500,
    cargoCompatible: false,
    passengerCompatible: true,
    trainingCompatible: false,
    economy: {
      baseTicketYieldUsdPerNm: 0.35,
      ticketBaseFareUsd: 95,
      cargoRateUsdPerKgNm: 0,
      cargoBaseFeeUsd: 0,
      baggageFeeUsdPerKg: 1.8,
      airportFeeClass: "regional",
      maintenanceReserveUsdPerHour: 180,
      wearReserveUsdPerLanding: 35,
    },
    simbrief: {
      aircraftType: "TBM9",
      units: "KGS",
      defaultPassengers: 4,
      defaultCargoKg: 0,
    },
    source: "manufacturer",
  },

  // Turboprop Twin - King Air 350
  B350: {
    aircraftCode: "B350",
    simbriefCode: "BE90", // SimBrief uses BE90 for King Air family
    displayName: "Beechcraft King Air 350",
    category: "turboprop_twin",
    passengerCapacity: 10, // 11 total - 1 pilot
    crewRequired: 1,
    maxCargoKg: 520,
    maxPayloadKg: 1100,
    baggagePerPassengerKg: 20,
    maxBaggageKg: 200,
    standardPassengerWeightKg: 84,
    operationalMtowBufferKg: 200,
    maxPassengerFlightCargoKg: 0,
    fuelCapacityKg: 1670, // 490 gal
    reserveFuelKg: 250,
    avgFuelBurnKgHour: 200,
    avgCruiseKt: 310,
    maxRangeNm: 1500,
    minRunwayFt: 3500,
    cargoCompatible: true,
    passengerCompatible: true,
    trainingCompatible: true,
    economy: {
      baseTicketYieldUsdPerNm: 0.32,
      ticketBaseFareUsd: 85,
      cargoRateUsdPerKgNm: 0.003,
      cargoBaseFeeUsd: 200,
      baggageFeeUsdPerKg: 1.6,
      airportFeeClass: "regional",
      maintenanceReserveUsdPerHour: 150,
      wearReserveUsdPerLanding: 30,
    },
    simbrief: {
      aircraftType: "BE90",
      units: "KGS",
      defaultPassengers: 6,
      defaultCargoKg: 200,
    },
    source: "manufacturer",
  },

  // Turboprop Twin - Twin Otter
  DHC6: {
    aircraftCode: "DHC6",
    simbriefCode: "DHC6",
    displayName: "De Havilland DHC-6 Twin Otter",
    category: "turboprop_twin",
    passengerCapacity: 19, // 20 total - 1 pilot
    crewRequired: 1,
    maxCargoKg: 1900,
    maxPayloadKg: 2100,
    baggagePerPassengerKg: 20,
    maxBaggageKg: 380,
    standardPassengerWeightKg: 84,
    operationalMtowBufferKg: 250,
    maxPassengerFlightCargoKg: 0,
    fuelCapacityKg: 1040, // 305 gal
    reserveFuelKg: 180,
    avgFuelBurnKgHour: 185,
    avgCruiseKt: 160,
    maxRangeNm: 800,
    minRunwayFt: 1200,
    cargoCompatible: true,
    passengerCompatible: true,
    trainingCompatible: true,
    economy: {
      baseTicketYieldUsdPerNm: 0.25,
      ticketBaseFareUsd: 65,
      cargoRateUsdPerKgNm: 0.003,
      cargoBaseFeeUsd: 220,
      baggageFeeUsdPerKg: 1.4,
      airportFeeClass: "regional",
      maintenanceReserveUsdPerHour: 135,
      wearReserveUsdPerLanding: 28,
    },
    simbrief: {
      aircraftType: "DHC6",
      units: "KGS",
      defaultPassengers: 12,
      defaultCargoKg: 600,
    },
    source: "manufacturer",
  },

  // Regional Turboprop - ATR 72
  AT76: {
    aircraftCode: "AT76",
    simbriefCode: "AT76",
    displayName: "ATR 72-600",
    category: "regional_turboprop",
    passengerCapacity: 70, // With 2 crew
    crewRequired: 2,
    maxCargoKg: 5000,
    maxPayloadKg: 7500,
    baggagePerPassengerKg: 20,
    maxBaggageKg: 1400,
    standardPassengerWeightKg: 84,
    operationalMtowBufferKg: 500,
    maxPassengerFlightCargoKg: 0,
    fuelCapacityKg: 5000, // ~1650 gal
    reserveFuelKg: 600,
    avgFuelBurnKgHour: 550,
    avgCruiseKt: 280,
    maxRangeNm: 825,
    minRunwayFt: 4500,
    cargoCompatible: true,
    passengerCompatible: true,
    trainingCompatible: false,
    economy: {
      baseTicketYieldUsdPerNm: 0.18,
      ticketBaseFareUsd: 55,
      cargoRateUsdPerKgNm: 0.0028,
      cargoBaseFeeUsd: 350,
      baggageFeeUsdPerKg: 1.2,
      airportFeeClass: "regional",
      maintenanceReserveUsdPerHour: 280,
      wearReserveUsdPerLanding: 55,
    },
    simbrief: {
      aircraftType: "AT76",
      units: "KGS",
      defaultPassengers: 50,
      defaultCargoKg: 1000,
    },
    source: "manufacturer",
  },

  // Regional Jet - E170
  E170: {
    aircraftCode: "E170",
    simbriefCode: "E170",
    displayName: "Embraer E170",
    category: "regional_jet",
    passengerCapacity: 74, // 76 - 2 crew
    crewRequired: 2,
    maxCargoKg: 6500,
    maxPayloadKg: 9800,
    baggagePerPassengerKg: 20,
    maxBaggageKg: 1480,
    standardPassengerWeightKg: 84,
    operationalMtowBufferKg: 600,
    maxPassengerFlightCargoKg: 0,
    fuelCapacityKg: 7200, // ~2200 gal
    reserveFuelKg: 800,
    avgFuelBurnKgHour: 750,
    avgCruiseKt: 430,
    maxRangeNm: 2100,
    minRunwayFt: 5000,
    cargoCompatible: true,
    passengerCompatible: true,
    trainingCompatible: false,
    economy: {
      baseTicketYieldUsdPerNm: 0.15,
      ticketBaseFareUsd: 65,
      cargoRateUsdPerKgNm: 0.0025,
      cargoBaseFeeUsd: 450,
      baggageFeeUsdPerKg: 1.0,
      airportFeeClass: "regional",
      maintenanceReserveUsdPerHour: 380,
      wearReserveUsdPerLanding: 85,
    },
    simbrief: {
      aircraftType: "E170",
      units: "KGS",
      defaultPassengers: 55,
      defaultCargoKg: 1200,
    },
    source: "manufacturer",
  },

  // Regional Jet - E175
  E175: {
    aircraftCode: "E175",
    simbriefCode: "E175",
    displayName: "Embraer E175",
    category: "regional_jet",
    passengerCapacity: 80, // 88 - 2 crew
    crewRequired: 2,
    maxCargoKg: 7000,
    maxPayloadKg: 10600,
    baggagePerPassengerKg: 20,
    maxBaggageKg: 1600,
    standardPassengerWeightKg: 84,
    operationalMtowBufferKg: 700,
    maxPassengerFlightCargoKg: 0,
    fuelCapacityKg: 7800,
    reserveFuelKg: 850,
    avgFuelBurnKgHour: 820,
    avgCruiseKt: 440,
    maxRangeNm: 2200,
    minRunwayFt: 5500,
    cargoCompatible: true,
    passengerCompatible: true,
    trainingCompatible: false,
    economy: {
      baseTicketYieldUsdPerNm: 0.16,
      ticketBaseFareUsd: 70,
      cargoRateUsdPerKgNm: 0.0025,
      cargoBaseFeeUsd: 480,
      baggageFeeUsdPerKg: 1.0,
      airportFeeClass: "regional",
      maintenanceReserveUsdPerHour: 420,
      wearReserveUsdPerLanding: 95,
    },
    simbrief: {
      aircraftType: "E175",
      units: "KGS",
      defaultPassengers: 60,
      defaultCargoKg: 1300,
    },
    source: "manufacturer",
  },

  // Narrow Body - B737
  B738: {
    aircraftCode: "B738",
    simbriefCode: "B738",
    displayName: "Boeing 737-800",
    category: "narrow_body",
    passengerCapacity: 162, // 189 - crew
    crewRequired: 2,
    maxCargoKg: 20000,
    maxPayloadKg: 23000,
    baggagePerPassengerKg: 20,
    maxBaggageKg: 3240,
    standardPassengerWeightKg: 84,
    operationalMtowBufferKg: 1000,
    maxPassengerFlightCargoKg: 0,
    fuelCapacityKg: 21000, // ~6800 gal
    reserveFuelKg: 2000,
    avgFuelBurnKgHour: 2400,
    avgCruiseKt: 450,
    maxRangeNm: 3000,
    minRunwayFt: 8000,
    cargoCompatible: true,
    passengerCompatible: true,
    trainingCompatible: false,
    economy: {
      baseTicketYieldUsdPerNm: 0.12,
      ticketBaseFareUsd: 85,
      cargoRateUsdPerKgNm: 0.002,
      cargoBaseFeeUsd: 800,
      baggageFeeUsdPerKg: 0.8,
      airportFeeClass: "international",
      maintenanceReserveUsdPerHour: 850,
      wearReserveUsdPerLanding: 180,
    },
    simbrief: {
      aircraftType: "B738",
      units: "KGS",
      defaultPassengers: 120,
      defaultCargoKg: 3000,
    },
    source: "manufacturer",
  },

  // Cargo Freighter - C17
  C17: {
    aircraftCode: "C17",
    simbriefCode: "C17",
    displayName: "Boeing C-17 Globemaster III",
    category: "freighter",
    passengerCapacity: 0,
    crewRequired: 2,
    maxCargoKg: 77500,
    maxPayloadKg: 77500,
    baggagePerPassengerKg: 0,
    maxBaggageKg: 0,
    standardPassengerWeightKg: 0,
    operationalMtowBufferKg: 2000,
    maxPassengerFlightCargoKg: 0,
    fuelCapacityKg: 73000,
    reserveFuelKg: 8000,
    avgFuelBurnKgHour: 9000,
    avgCruiseKt: 450,
    maxRangeNm: 4400,
    minRunwayFt: 3500,
    cargoCompatible: true,
    passengerCompatible: false,
    trainingCompatible: false,
    economy: {
      baseTicketYieldUsdPerNm: 0,
      ticketBaseFareUsd: 0,
      cargoRateUsdPerKgNm: 0.0012,
      cargoBaseFeeUsd: 2500,
      baggageFeeUsdPerKg: 0,
      airportFeeClass: "cargo_hub",
      maintenanceReserveUsdPerHour: 2500,
      wearReserveUsdPerLanding: 450,
    },
    simbrief: {
      aircraftType: "C17",
      units: "KGS",
      defaultPassengers: 0,
      defaultCargoKg: 40000,
    },
    source: "va_operational_estimate",
  },
};

// Get technical profile for aircraft
export function getAircraftTechnicalProfile(code: string): AircraftTechnicalProfile | null {
  const normalized = code.trim().toUpperCase();
  return TECHNICAL_PROFILES[normalized] ?? null;
}

// Get all technical profiles
export function getAllTechnicalProfiles(): AircraftTechnicalProfile[] {
  return Object.values(TECHNICAL_PROFILES);
}

// Get merged aircraft + technical profile
export function getFullAircraftProfile(code: string) {
  const base = AIRLINE_AIRCRAFT.find((a) => a.code === code.trim().toUpperCase());
  const tech = getAircraftTechnicalProfile(code);
  if (!base) return null;
  return {
    ...base,
    technical: tech,
  };
}

// Validate payload against aircraft limits
export function validatePayloadAgainstAircraft(
  aircraftCode: string,
  passengerCount: number,
  cargoKg: number,
): { valid: boolean; errors: string[] } {
  const tech = getAircraftTechnicalProfile(aircraftCode);
  if (!tech) return { valid: false, errors: ["Aircraft not found in technical profiles"] };

  const errors: string[] = [];

  // Check passenger capacity
  if (passengerCount > tech.passengerCapacity) {
    errors.push(`Passenger count ${passengerCount} exceeds capacity ${tech.passengerCapacity}`);
  }

  // Check cargo capacity
  if (cargoKg > tech.maxCargoKg) {
    errors.push(`Cargo ${cargoKg}kg exceeds max ${tech.maxCargoKg}kg`);
  }

  // Check total payload
  const baggageKg = passengerCount * tech.baggagePerPassengerKg;
  const totalPayload = baggageKg + cargoKg;
  if (totalPayload > tech.maxPayloadKg) {
    errors.push(`Total payload ${totalPayload}kg exceeds max ${tech.maxPayloadKg}kg`);
  }

  return { valid: errors.length === 0, errors };
}

// Calculate estimated fuel for route
export function estimateFuelForRoute(
  aircraftCode: string,
  distanceNm: number,
  includeReserve = true,
): { blockFuelKg: number; tripFuelKg: number; reserveFuelKg: number } {
  const tech = getAircraftTechnicalProfile(aircraftCode);
  if (!tech) return { blockFuelKg: 0, tripFuelKg: 0, reserveFuelKg: 0 };

  // Time = distance / speed
  const flightHours = distanceNm / tech.avgCruiseKt;

  // Trip fuel
  const tripFuelKg = Math.round(flightHours * tech.avgFuelBurnKgHour);

  // Reserve fuel (holding + alternate)
  const reserveFuelKg = includeReserve ? tech.reserveFuelKg : 0;

  // Block fuel = trip + reserve + taxi (estimated 5% of trip)
  const taxiFuelKg = Math.round(tripFuelKg * 0.05);
  const blockFuelKg = tripFuelKg + reserveFuelKg + taxiFuelKg;

  // Cap at fuel capacity
  return {
    blockFuelKg: Math.min(blockFuelKg, tech.fuelCapacityKg),
    tripFuelKg,
    reserveFuelKg,
  };
}

// Default export
export default TECHNICAL_PROFILES;
