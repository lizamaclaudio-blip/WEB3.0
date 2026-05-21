/**
 * Cargo Scenarios for Patagonia Wings Dispatch
 * Defines cargo types, weights, and constraints for cargo flights
 */

export type CargoScenarioCode =
  | "FOOD_SUPPLIES"
  | "MEDICAL_SUPPLIES"
  | "SPARE_PARTS"
  | "MAIL_PARCELS"
  | "HUMANITARIAN"
  | "FISHERY_SUPPLIES"
  | "REMOTE_COMMUNITY"
  | "INDUSTRIAL_TOOLS"
  | "AVIATION_PARTS";

export type CargoScenario = {
  code: CargoScenarioCode;
  title: string;
  description: string;
  cargoKgMin: number;
  cargoKgMax: number;
  priority: "low" | "normal" | "high" | "urgent";
  allowedAircraftCategories: string[];
  revenueMultiplier: number;
  requiredPax: 0; // Always 0 for cargo
  ui: {
    icon: string;
    color: string;
    badge: string;
  };
};

// Cargo scenarios catalog
export const CARGO_SCENARIOS: Record<CargoScenarioCode, CargoScenario> = {
  FOOD_SUPPLIES: {
    code: "FOOD_SUPPLIES",
    title: "Abastecimiento de Alimentos",
    description: "Transporte de provisiones alimenticias para comunidades remotas o instalaciones remotas",
    cargoKgMin: 200,
    cargoKgMax: 1500,
    priority: "normal",
    allowedAircraftCategories: [
      "cargo_turboprop",
      "turboprop_single",
      "turboprop_twin",
      "regional_turboprop",
      "freighter",
    ],
    revenueMultiplier: 1.0,
    requiredPax: 0,
    ui: {
      icon: "🥘",
      color: "#8B4513",
      badge: "Alimentos",
    },
  },

  MEDICAL_SUPPLIES: {
    code: "MEDICAL_SUPPLIES",
    title: "Insumos Médicos",
    description: "Medicamentos, equipos médicos y suministros hospitalarios",
    cargoKgMin: 100,
    cargoKgMax: 2000,
    priority: "high",
    allowedAircraftCategories: [
      "cargo_turboprop",
      "turboprop_single",
      "turboprop_twin",
      "regional_turboprop",
      "regional_jet",
      "freighter",
    ],
    revenueMultiplier: 1.3,
    requiredPax: 0,
    ui: {
      icon: "🏥",
      color: "#DC143C",
      badge: "Médico",
    },
  },

  SPARE_PARTS: {
    code: "SPARE_PARTS",
    title: "Repuestos Industriales",
    description: "Piezas de repuesto para maquinaria industrial y equipos",
    cargoKgMin: 150,
    cargoKgMax: 5000,
    priority: "normal",
    allowedAircraftCategories: [
      "cargo_turboprop",
      "turboprop_twin",
      "regional_turboprop",
      "regional_jet",
      "freighter",
    ],
    revenueMultiplier: 1.1,
    requiredPax: 0,
    ui: {
      icon: "🔧",
      color: "#4682B4",
      badge: "Repuestos",
    },
  },

  MAIL_PARCELS: {
    code: "MAIL_PARCELS",
    title: "Correo y Encomiendas",
    description: "Servicio postal y paquetería para zonas remotas",
    cargoKgMin: 50,
    cargoKgMax: 1000,
    priority: "normal",
    allowedAircraftCategories: [
      "cargo_turboprop",
      "turboprop_single",
      "turboprop_twin",
      "regional_turboprop",
    ],
    revenueMultiplier: 0.9,
    requiredPax: 0,
    ui: {
      icon: "📦",
      color: "#DAA520",
      badge: "Correo",
    },
  },

  HUMANITARIAN: {
    code: "HUMANITARIAN",
    title: "Ayuda Humanitaria",
    description: "Suministros de emergencia, refugio y asistencia humanitaria",
    cargoKgMin: 300,
    cargoKgMax: 8000,
    priority: "urgent",
    allowedAircraftCategories: [
      "cargo_turboprop",
      "turboprop_twin",
      "regional_turboprop",
      "regional_jet",
      "freighter",
      "wide_body",
    ],
    revenueMultiplier: 0.7, // Lower rate for humanitarian
    requiredPax: 0,
    ui: {
      icon: "🆘",
      color: "#FF6347",
      badge: "Humanitario",
    },
  },

  FISHERY_SUPPLIES: {
    code: "FISHERY_SUPPLIES",
    title: "Insumos Pesqueros",
    description: "Equipos y provisiones para la industria pesquera y salmonera",
    cargoKgMin: 250,
    cargoKgMax: 3000,
    priority: "normal",
    allowedAircraftCategories: [
      "cargo_turboprop",
      "turboprop_twin",
      "regional_turboprop",
      "freighter",
    ],
    revenueMultiplier: 1.0,
    requiredPax: 0,
    ui: {
      icon: "🎣",
      color: "#20B2AA",
      badge: "Pesquero",
    },
  },

  REMOTE_COMMUNITY: {
    code: "REMOTE_COMMUNITY",
    title: "Abastecimiento Comunidad Remota",
    description: "Suministros generales para comunidades aisladas sin acceso terrestre",
    cargoKgMin: 400,
    cargoKgMax: 2500,
    priority: "high",
    allowedAircraftCategories: [
      "cargo_turboprop",
      "turboprop_single",
      "turboprop_twin",
      "regional_turboprop",
    ],
    revenueMultiplier: 1.15,
    requiredPax: 0,
    ui: {
      icon: "🏔️",
      color: "#556B2F",
      badge: "Comunidad",
    },
  },

  INDUSTRIAL_TOOLS: {
    code: "INDUSTRIAL_TOOLS",
    title: "Herramientas Industriales",
    description: "Maquinaria, herramientas y equipos para proyectos industriales y mineros",
    cargoKgMin: 200,
    cargoKgMax: 6000,
    priority: "normal",
    allowedAircraftCategories: [
      "cargo_turboprop",
      "turboprop_twin",
      "regional_turboprop",
      "regional_jet",
      "freighter",
    ],
    revenueMultiplier: 1.2,
    requiredPax: 0,
    ui: {
      icon: "⚙️",
      color: "#696969",
      badge: "Industrial",
    },
  },

  AVIATION_PARTS: {
    code: "AVIATION_PARTS",
    title: "Repuestos Aeronáuticos",
    description: "Piezas y componentes para mantenimiento de aeronaves",
    cargoKgMin: 50,
    cargoKgMax: 1500,
    priority: "high",
    allowedAircraftCategories: [
      "cargo_turboprop",
      "turboprop_single",
      "turboprop_twin",
      "regional_turboprop",
      "regional_jet",
    ],
    revenueMultiplier: 1.4,
    requiredPax: 0,
    ui: {
      icon: "✈️",
      color: "#4169E1",
      badge: "Aero",
    },
  },
};

// Get cargo scenario by code
export function getCargoScenario(code: string): CargoScenario | null {
  const upperCode = code.trim().toUpperCase() as CargoScenarioCode;
  return CARGO_SCENARIOS[upperCode] ?? null;
}

// Get all cargo scenarios
export function getAllCargoScenarios(): CargoScenario[] {
  return Object.values(CARGO_SCENARIOS);
}

// Get scenarios compatible with aircraft category
export function getScenariosForAircraftCategory(category: string): CargoScenario[] {
  return Object.values(CARGO_SCENARIOS).filter((scenario) =>
    scenario.allowedAircraftCategories.includes(category),
  );
}

// Calculate cargo amount for scenario within aircraft limits
export function calculateCargoForScenario(
  scenarioCode: string,
  aircraftMaxCargoKg: number,
): { cargoKg: number; valid: boolean; reason?: string } {
  const scenario = getCargoScenario(scenarioCode);
  if (!scenario) {
    return { cargoKg: 0, valid: false, reason: "Scenario not found" };
  }

  // Cap cargo at aircraft limit and scenario max
  const maxCargo = Math.min(scenario.cargoKgMax, aircraftMaxCargoKg);
  const minCargo = scenario.cargoKgMin;

  if (aircraftMaxCargoKg < minCargo) {
    return {
      cargoKg: 0,
      valid: false,
      reason: `Aircraft cargo capacity ${aircraftMaxCargoKg}kg below scenario minimum ${minCargo}kg`,
    };
  }

  // Generate cargo amount (between min and capped max, biased toward mid range)
  const range = maxCargo - minCargo;
  const randomFactor = 0.4 + Math.random() * 0.5; // 40-90% of range
  const cargoKg = Math.round(minCargo + range * randomFactor);

  return { cargoKg, valid: true };
}

// Validate cargo flight constraints
export function validateCargoFlight(
  scenarioCode: string,
  aircraftCode: string,
  aircraftCategory: string,
  cargoKg: number,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const scenario = getCargoScenario(scenarioCode);

  if (!scenario) {
    errors.push(`Invalid cargo scenario: ${scenarioCode}`);
    return { valid: false, errors };
  }

  // Check aircraft category compatibility
  if (!scenario.allowedAircraftCategories.includes(aircraftCategory)) {
    errors.push(
      `Aircraft category ${aircraftCategory} not allowed for ${scenario.title}. Allowed: ${scenario.allowedAircraftCategories.join(", ")}`,
    );
  }

  // Check cargo weight limits
  if (cargoKg < scenario.cargoKgMin) {
    errors.push(
      `Cargo ${cargoKg}kg below minimum ${scenario.cargoKgMin}kg for ${scenario.title}`,
    );
  }
  if (cargoKg > scenario.cargoKgMax) {
    errors.push(
      `Cargo ${cargoKg}kg exceeds maximum ${scenario.cargoKgMax}kg for ${scenario.title}`,
    );
  }

  return { valid: errors.length === 0, errors };
}

// Build SimBrief remarks for cargo scenario
export function buildCargoRemarks(scenarioCode: string, cargoKg: number): string {
  const scenario = getCargoScenario(scenarioCode);
  if (!scenario) return "";

  return `PW Cargo: ${scenario.title} — ${cargoKg}kg`;
}

// Default export
export default CARGO_SCENARIOS;
