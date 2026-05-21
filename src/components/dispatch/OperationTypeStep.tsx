"use client";

import { DispatchStatusBadge } from "@/components/dispatch/DispatchStatusBadge";

export type OperationId =
  | "training"
  | "itinerary"
  | "charter"
  | "aircraft_transfer"
  | "cargo";

type OperationTypeStepProps = {
  rankCode: string;
  selected: OperationId;
  onSelect: (value: OperationId) => void;
};

type OperationOption = {
  id: OperationId;
  label: string;
  description: string;
};

const OPTIONS: OperationOption[] = [
  {
    id: "training",
    label: "Entrenamiento libre",
    description: "Práctica referencial. No mueve piloto ni aeronave oficial.",
  },
  {
    id: "itinerary",
    label: "Ruta oficial",
    description: "Ruta oficial de aerolínea desde tu ubicación actual.",
  },
  {
    id: "charter",
    label: "Charter",
    description: "Operación global bajo solicitud.",
  },
  {
    id: "aircraft_transfer",
    label: "Traslado de aeronave",
    description: "Misión especial para mover aeronaves reales de la flota.",
  },
  { id: "cargo", label: "Carga", description: "Operación orientada a carga." },
];

function isAllowed(rankCode: string, operation: OperationId) {
  const rank = rankCode.toUpperCase();
  if (rank === "CADET")
    return operation === "training" || operation === "itinerary";
  if (rank === "SECOND_OFFICER")
    return operation !== "itinerary" && operation !== "cargo";
  return true;
}

export function OperationTypeStep({
  rankCode,
  selected,
  onSelect,
}: OperationTypeStepProps) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {OPTIONS.map((option) => {
        const allowed = isAllowed(rankCode, option.id);
        const active = option.id === selected;
        return (
          <button
            key={option.id}
            type="button"
            disabled={!allowed}
            onClick={() => onSelect(option.id)}
            className={`rounded-xl border p-4 text-left transition ${active ? "border-sky-300 bg-sky-50" : "border-sky-100 bg-white"} ${!allowed ? "cursor-not-allowed opacity-60" : "hover:border-sky-300"}`}
          >
            <div className="flex items-center justify-between gap-2">
              <strong className="text-sm text-slate-900">{option.label}</strong>
              <DispatchStatusBadge
                tone={allowed ? "ready" : "blocked"}
                label={allowed ? "Disponible" : "Bloqueada"}
              />
            </div>
            <p className="mt-2 text-xs text-slate-600">{option.description}</p>
            {!allowed ? (
              <p className="mt-2 text-xs text-rose-600">
                {rankCode.toUpperCase() === "CADET"
                  ? "Tu rango CADET solo permite rutas oficiales de escuela. Las rutas comerciales se habilitarán en rangos superiores."
                  : `Tu rango ${rankCode.toUpperCase()} no habilita esta operación oficial.`}
              </p>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
