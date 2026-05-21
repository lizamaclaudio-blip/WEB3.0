"use client";

import { DispatchStatusBadge } from "@/components/dispatch/DispatchStatusBadge";

type DispatchSummaryStepProps = {
  pilot: { callsign: string; rank: string; status: string };
  operationLabel: string;
  origin: string;
  destination: string;
  distanceNm: number | null;
  aircraft: string;
  metarStation: string;
  warnings: string[];
  ready: boolean;
};

export function DispatchSummaryStep({ pilot, operationLabel, origin, destination, distanceNm, aircraft, metarStation, warnings, ready }: DispatchSummaryStepProps) {
  return (
    <div className="space-y-3">
      <div className="grid gap-2 md:grid-cols-2">
        <p className="text-sm text-slate-700">Piloto: <strong>{pilot.callsign}</strong></p>
        <p className="text-sm text-slate-700">Rango: <strong>{pilot.rank}</strong></p>
        <p className="text-sm text-slate-700">Estado: <strong>{pilot.status}</strong></p>
        <p className="text-sm text-slate-700">Operación: <strong>{operationLabel}</strong></p>
        <p className="text-sm text-slate-700">Origen: <strong>{origin}</strong></p>
        <p className="text-sm text-slate-700">Destino: <strong>{destination}</strong></p>
        <p className="text-sm text-slate-700">Distancia: <strong>{distanceNm != null ? `${distanceNm.toFixed(1)} NM` : "Por calcular"}</strong></p>
        <p className="text-sm text-slate-700">Aeronave: <strong>{aircraft || "No seleccionada"}</strong></p>
        <p className="text-sm text-slate-700">METAR usado: <strong>{metarStation || "No disponible"}</strong></p>
      </div>

      <div className="flex items-center gap-2">
        <DispatchStatusBadge tone={ready ? "ready" : "blocked"} label={ready ? "Listo" : "Bloqueado"} />
        {!ready ? <span className="text-xs text-amber-700">Faltan datos operacionales para confirmar.</span> : null}
      </div>

      {warnings.length ? (
        <div className="rounded-xl border border-amber-300/40 bg-amber-50 p-3 text-xs text-amber-800">
          {warnings.map((warning) => (
            <p key={warning}>- {warning}</p>
          ))}
        </div>
      ) : null}

      <button
        type="button"
        disabled
        className="inline-flex w-full items-center justify-center rounded-xl bg-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 opacity-70"
      >
        Confirmar ruta oficial (pendiente integración transaccional)
      </button>
    </div>
  );
}
