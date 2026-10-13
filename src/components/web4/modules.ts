import type { GlyphName } from "./Glyph";

export const modules: { id: GlyphName; image: string; es: [string, string]; en: [string, string] }[] = [
  { id: "monitor", image: "monitor", es: ["Monitor en vivo", "Instrumentos, motores y combustible. La información observada del simulador, con su origen a la vista."], en: ["Live monitor", "Instruments, engines and fuel. Observed simulator information with its source clearly identified."] },
  { id: "dispatch", image: "dispatch", es: ["Despacho", "Del OFP a la operación: ruta, pesos, combustible planificado y contexto meteorológico en una mesa de preparación."], en: ["Dispatch", "From flight plan to operation: route, weights, planned fuel and weather context in a focused preparation workspace."] },
  { id: "cabin", image: "cabin", es: ["Carga y cabina", "La preparación también ocurre dentro del avión. Cabina por aeronave, seguimiento de embarque y servicios GSX."], en: ["Load & cabin", "Preparation happens inside the aircraft too. Aircraft cabin layouts, boarding progress and GSX services."] },
  { id: "operations", image: "operations", es: ["Operaciones", "Fases de vuelo, eventos y tareas relevantes para mantener el contexto desde la preparación hasta el estacionamiento."], en: ["Operations", "Flight phases, events and relevant tasks keep the context from preparation to parking."] },
  { id: "copilot", image: "copilot", es: ["Copiloto", "Checklists, avisos y asistencia contextual. Un espacio para acompañar el flujo de trabajo del piloto virtual."], en: ["Copilot", "Checklists, alerts and contextual assistance. A workspace to accompany the virtual pilot’s workflow."] },
  { id: "journal", image: "journal", es: ["Diario", "Una línea de tiempo para revisar lo ocurrido en la sesión y entender cada etapa del vuelo."], en: ["Journal", "A timeline to review what happened during the session and understand each stage of flight."] },
];
