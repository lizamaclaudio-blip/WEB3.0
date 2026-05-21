"use client";

export type AvailableAircraft = {
  id: string;
  registration: string;
  model_code: string;
  display_name: string;
  variant_code: string | null;
  seats: number | null;
  cargo_kg: number | null;
  practical_range_nm: number | null;
  reserve_factor: number;
  range_available_nm: number | null;
};

type AircraftSelectionStepProps = {
  aircraft: AvailableAircraft[];
  selectedAircraftId: string;
  onSelectAircraftId: (value: string) => void;
  requiredDistanceNm: number | null;
};

export function AircraftSelectionStep({ aircraft, selectedAircraftId, onSelectAircraftId, requiredDistanceNm }: AircraftSelectionStepProps) {
  const filtered = aircraft.filter((item) => {
    if (requiredDistanceNm == null) return true;
    if (item.range_available_nm == null) return true;
    return item.range_available_nm >= requiredDistanceNm;
  });

  if (!aircraft.length) {
    return <p className="text-sm text-amber-700">No hay aeronaves disponibles en tu ubicación actual.</p>;
  }

  return (
    <div className="space-y-3">
      <select
        value={selectedAircraftId}
        onChange={(event) => onSelectAircraftId(event.target.value)}
        className="w-full rounded-xl border border-sky-100 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-300"
      >
        <option value="">Selecciona aeronave</option>
        {aircraft.map((item) => {
          const blocked = requiredDistanceNm != null && item.range_available_nm != null && item.range_available_nm < requiredDistanceNm;
          return (
            <option key={item.id} value={item.id} disabled={blocked}>
              {blocked ? "[Autonomía insuficiente] " : ""}
              {item.registration} · {item.model_code} · Alcance {item.range_available_nm?.toFixed(0) ?? "N/D"} NM
            </option>
          );
        })}
      </select>

      <div className="grid gap-2 md:grid-cols-2">
        {filtered.map((item) => (
          <article key={item.id} className="rounded-xl border border-sky-100 bg-sky-50 p-3 text-xs text-slate-700">
            <p className="font-semibold text-slate-900">{item.registration} — {item.model_code} — {item.display_name}</p>
            <p>Modelo: {item.model_code}</p>
            <p>Variante: {item.variant_code || "No registrado"}</p>
            <p>Asientos: {item.seats ?? "N/D"}</p>
            <p>Carga: {item.cargo_kg ?? "N/D"} kg</p>
            <p>Autonomía práctica: {item.practical_range_nm ?? "N/D"} NM</p>
            <p>Alcance operativo: {item.range_available_nm ?? "N/D"} NM</p>
          </article>
        ))}
      </div>
    </div>
  );
}
