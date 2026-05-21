"use client";

type WeatherBriefingStepProps = {
  originIdent: string;
  metar: {
    station_ident?: string;
    is_nearest_station?: boolean;
    distance_nm?: number;
    message?: string | null;
    raw_metar?: string | null;
    raw?: string | null;
    observedAt?: string | null;
  } | null;
  loading: boolean;
};

function zulu(value?: string | null) {
  if (!value) return "sin hora";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hour = String(date.getUTCHours()).padStart(2, "0");
  const minute = String(date.getUTCMinutes()).padStart(2, "0");
  return `${day} ${hour}:${minute}Z`;
}

export function WeatherBriefingStep({ originIdent, metar, loading }: WeatherBriefingStepProps) {
  if (loading) return <p className="text-sm text-slate-600">Consultando METAR...</p>;
  if (!metar) return <p className="text-sm text-amber-700">METAR no disponible.</p>;

  const station = metar.station_ident || originIdent;
  const title = metar.is_nearest_station ? `METAR cercano ${station}` : `METAR real ${station}`;

  return (
    <div className="space-y-2 rounded-xl border border-sky-100 bg-sky-50 p-3 text-xs text-slate-700">
      <p className="font-semibold text-slate-900">{title}</p>
      {metar.message ? <p>{metar.message}</p> : null}
      {metar.is_nearest_station && typeof metar.distance_nm === "number" ? <p>Distancia estación: {metar.distance_nm.toFixed(1)} NM</p> : null}
      <p>Observación: {zulu(metar.observedAt)}</p>
      <p className="break-words font-mono text-[11px] text-slate-700">{metar.raw_metar || metar.raw || "METAR no disponible"}</p>
    </div>
  );
}
