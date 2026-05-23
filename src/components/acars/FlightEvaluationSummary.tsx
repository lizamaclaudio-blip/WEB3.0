import Link from "next/link";
import { getFlightEvaluationSummaryData, type EvaluationPenaltyView, type TelemetrySignalView } from "@/lib/acars/summary-data";

function scoreTone(score: number) {
  if (score >= 95) return "text-emerald-700 bg-emerald-50 border-emerald-200";
  if (score >= 85) return "text-sky-700 bg-sky-50 border-sky-200";
  if (score >= 70) return "text-amber-700 bg-amber-50 border-amber-200";
  if (score >= 50) return "text-orange-700 bg-orange-50 border-orange-200";
  return "text-red-700 bg-red-50 border-red-200";
}

function resultLabel(score: number) {
  if (score >= 95) return "Excelente";
  if (score >= 85) return "Aprobado";
  if (score >= 70) return "Aprobado con observaciones";
  if (score >= 50) return "Marginal / requiere revisión";
  return "Revisión obligatoria";
}

function formatNumber(value: number, suffix = "") {
  if (!Number.isFinite(value)) return "N/D";
  return `${Math.round(value * 10) / 10}${suffix}`;
}

function formatMinutes(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "N/D";
  const hours = Math.floor(value / 60);
  const minutes = Math.round(value % 60);
  if (hours <= 0) return `${minutes} min`;
  return `${hours} h ${minutes.toString().padStart(2, "0")} min`;
}

function statusTone(status: string, detected: boolean) {
  if (status === "CERTIFIED" && detected) return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (status === "PARTIAL") return "border-sky-200 bg-sky-50 text-sky-800";
  if (status === "UNRELIABLE" || status === "NOT_APPLICABLE") return "border-slate-200 bg-slate-50 text-slate-700";
  if (status === "NOT_AVAILABLE") return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-slate-200 bg-white text-slate-700";
}

function StatusPill({ ok, label, detail }: { ok: boolean; label: string; detail?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-bold ${ok ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
      {ok ? "✓" : "!"} {label}{detail ? <span className="font-medium opacity-80">· {detail}</span> : null}
    </span>
  );
}

function ScoreCard({ label, score, weight, description }: { label: string; score: number; weight: number; description: string }) {
  const width = Math.max(0, Math.min(100, Math.round(score)));
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">{label}</p>
          <p className="mt-1 text-xs text-slate-500">Peso {weight}%</p>
        </div>
        <strong className={`rounded-xl border px-3 py-1 text-lg ${scoreTone(score)}`}>{Math.round(score)}</strong>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-slate-900" style={{ width: `${width}%` }} />
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
    </article>
  );
}

function MetricCard({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <strong className="mt-2 block text-2xl text-slate-950">{value}</strong>
      {note ? <span className="mt-1 block text-xs text-slate-500">{note}</span> : null}
    </div>
  );
}

function PenaltyRow({ penalty }: { penalty: EvaluationPenaltyView }) {
  const tone = penalty.severity === "CRITICAL" ? "border-red-200 bg-red-50 text-red-800" : penalty.severity === "WARNING" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-slate-200 bg-slate-50 text-slate-700";
  return (
    <li className={`rounded-2xl border p-4 ${tone}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.14em]">{penalty.code}</p>
          <p className="mt-1 text-sm leading-6">{penalty.message}</p>
        </div>
        <strong className="rounded-full bg-white/70 px-3 py-1 text-sm">-{formatNumber(penalty.points)} pts</strong>
      </div>
    </li>
  );
}

function SignalCard({ signal }: { signal: TelemetrySignalView }) {
  return (
    <article className={`rounded-2xl border p-4 ${statusTone(signal.status, signal.detected)}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em]">{signal.key}</p>
          <h3 className="mt-1 text-base font-black">{signal.label}</h3>
        </div>
        <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-black">{signal.status}</span>
      </div>
      <p className="mt-3 text-sm leading-6">{signal.reason}</p>
      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <span className="rounded-full bg-white/70 px-2.5 py-1 font-bold">{signal.detected ? "Detectado" : "No detectado"}</span>
        <span className="rounded-full bg-white/70 px-2.5 py-1 font-bold">Confianza {signal.confidence}</span>
        <span className="rounded-full bg-white/70 px-2.5 py-1 font-bold">{signal.canPenalize ? "Penalizable" : "No penalizable"}</span>
      </div>
      {signal.sources.length ? <p className="mt-3 text-xs leading-5 opacity-80">Fuentes: {signal.sources.join(" · ")}</p> : null}
    </article>
  );
}

export default async function FlightEvaluationSummary({ reservationId }: { reservationId: string }) {
  const data = await getFlightEvaluationSummaryData(reservationId);

  if (!data.found) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900">
        <section className="mx-auto max-w-4xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">Resumen ACARS</p>
          <h1 className="mt-3 text-3xl font-black">No se encontró el resumen del vuelo</h1>
          <p className="mt-3 text-slate-600">El ID solicitado no tiene despacho, evaluación o reporte asociado todavía.</p>
          <Link href="/dispatch" className="mt-6 inline-flex rounded-full bg-slate-950 px-5 py-3 text-sm font-bold text-white">Volver a despacho</Link>
        </section>
      </main>
    );
  }

  const score = data.metrics.totalScore;
  const route = `${data.flight.origin} → ${data.flight.destination}`;
  const timelinePreview = data.timeline.slice(0, 24);
  const observations = data.observations.length ? data.observations : ["Sin observaciones adicionales registradas por el motor de evaluación."];
  const penalties = data.penalties.length ? data.penalties : [];
  const primarySignals = data.signalCertification.filter((signal) => ["AIRBORNE", "TOUCHDOWN", "BLACKBOX", "TELEMETRY_SAMPLES", "FUEL", "TOUCHDOWN_VS"].includes(signal.key));
  const secondarySignals = data.signalCertification.filter((signal) => !["AIRBORNE", "TOUCHDOWN", "BLACKBOX", "TELEMETRY_SAMPLES", "FUEL", "TOUCHDOWN_VS"].includes(signal.key));

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900">
      <section className="mx-auto max-w-7xl space-y-6">
        <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          <div className="bg-slate-950 px-6 py-8 text-white md:px-8">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.28em] text-sky-200">Evaluación post-vuelo</p>
                <h1 className="mt-3 text-3xl font-black md:text-5xl">{data.flight.flightRef} · {route}</h1>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
                  Piloto {data.flight.pilotCallsign} · {data.flight.aircraft} / {data.flight.aircraftModel} · ruta {data.flight.routeText} · alternativo {data.flight.alternate}
                </p>
              </div>
              <div className={`min-w-[190px] rounded-3xl border p-5 text-center ${scoreTone(score)}`}>
                <p className="text-xs font-black uppercase tracking-[0.22em]">Score final</p>
                <strong className="mt-2 block text-5xl font-black">{Math.round(score)}</strong>
                <span className="mt-2 block text-sm font-bold">{resultLabel(score)}</span>
              </div>
            </div>
          </div>

          <div className="grid gap-4 p-6 md:grid-cols-4 md:p-8">
            <MetricCard label="Estado despacho" value={data.flight.dispatchStatus} note={`ACARS: ${data.flight.acarsState}`} />
            <MetricCard label="Estado evaluación" value={data.integrity.evaluationStatus} note={`Economía: ${data.integrity.economyStatus}`} />
            <MetricCard label="Destino / aterrizaje" value={data.flight.landing} note={`Planificado: ${data.flight.destination}`} />
            <MetricCard label="Penalizaciones" value={`${data.metrics.penaltiesCount}`} note={data.metrics.penaltiesCount === 0 ? "Sin descuentos registrados" : "Ver detalle técnico"} />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-5">
          {data.categories.map((category) => (
            <ScoreCard key={category.key} label={category.label} score={category.score} weight={category.weight} description={category.description} />
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard label="Block time" value={formatMinutes(data.metrics.blockMinutes)} />
          <MetricCard label="Airborne time" value={formatMinutes(data.metrics.flightMinutes)} />
          <MetricCard label="Distancia" value={formatNumber(data.metrics.distanceNm, " NM")} />
          <MetricCard label="Fuel usado" value={formatNumber(data.metrics.fuelUsedKg, " kg")} />
          <MetricCard label="Touchdown VS" value={data.metrics.touchdownVsFpm === null ? "N/D" : formatNumber(data.metrics.touchdownVsFpm, " fpm")} />
          <MetricCard label="Touchdown G" value={data.metrics.touchdownGs === null ? "N/D" : formatNumber(data.metrics.touchdownGs, " G")} />
          <MetricCard label="BlackBox frames" value={`${data.metrics.blackboxFrames}`} />
          <MetricCard label="Telemetría" value={`${data.metrics.telemetrySamplesCount}`} note="samples recibidos" />
        </div>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">Certificación de telemetría</p>
              <h2 className="mt-2 text-2xl font-black">Qué leyó realmente ACARS</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">La evaluación es estricta, pero solo penaliza señales certificadas. Las señales no confiables o no aplicables quedan como observación técnica hasta certificar cada aeronave.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <StatusPill ok={data.integrity.blackboxReceived} label="BlackBox" />
              <StatusPill ok={data.integrity.enoughFrames} label="Frames suficientes" />
              <StatusPill ok={data.integrity.airborneDetected} label="AIRBORNE" detail={data.integrity.airborneStatus} />
              <StatusPill ok={data.integrity.touchdownDetected} label="TOUCHDOWN" detail={data.integrity.touchdownStatus} />
            </div>
          </div>

          {primarySignals.length ? (
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {primarySignals.map((signal) => <SignalCard key={signal.key} signal={signal} />)}
            </div>
          ) : (
            <p className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Esta evaluación fue generada antes de activar la matriz de certificación de telemetría.</p>
          )}
        </section>

        {secondarySignals.length ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">Señales por aeronave</p>
            <h2 className="mt-2 text-2xl font-black">Estado de capacidades y datos no penalizables</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {secondarySignals.map((signal) => <SignalCard key={signal.key} signal={signal} />)}
            </div>
          </section>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">Penalizaciones y observaciones</p>
            <h2 className="mt-2 text-2xl font-black">Detalle de evaluación</h2>

            {penalties.length ? (
              <ul className="mt-5 space-y-3">
                {penalties.map((penalty, index) => <PenaltyRow key={`${penalty.code}-${index}`} penalty={penalty} />)}
              </ul>
            ) : (
              <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-800">
                <strong>Sin penalizaciones registradas.</strong>
                <p className="mt-1 text-sm">El motor no descontó puntos en esta evaluación. Las observaciones informativas y señales no certificadas se muestran abajo.</p>
              </div>
            )}

            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm font-black uppercase tracking-[0.16em] text-slate-500">Observaciones</p>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-700">
                {observations.map((observation, index) => <li key={`${observation}-${index}`}>{observation}</li>)}
              </ul>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">Timeline ACARS</p>
            <h2 className="mt-2 text-2xl font-black">Eventos detectados</h2>
            {timelinePreview.length ? (
              <ol className="mt-5 space-y-3">
                {timelinePreview.map((event, index) => (
                  <li key={`${event.type}-${event.at ?? index}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <strong className="text-sm text-slate-950">{event.type}</strong>
                      {event.at ? <span className="text-xs text-slate-500">{event.at}</span> : null}
                    </div>
                    {event.message ? <p className="mt-1 text-sm text-slate-600">{event.message}</p> : null}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">No se registraron eventos de timeline. Si hay BlackBox/XML suficiente, esta condición puede generar penalización.</p>
            )}
          </section>
        </div>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">Cómo se evalúa</p>
          <h2 className="mt-2 text-2xl font-black">Criterio Patagonia Wings</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5"><strong>Estricto sobre señales certificadas</strong><p className="mt-2 text-sm leading-6 text-slate-600">AIRBORNE, TOUCHDOWN, stall, overspeed, touchdown VS y telemetría imposible descuentan cuando ACARS los puede leer con evidencia suficiente.</p></div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5"><strong>No castigo por dato no confiable</strong><p className="mt-2 text-sm leading-6 text-slate-600">Puertas, tren, transponder, luces o fuel quedan como observación si la aeronave/perfil todavía no está certificado.</p></div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5"><strong>Auditoría antes de lanzamiento</strong><p className="mt-2 text-sm leading-6 text-slate-600">Cada avión debe validar qué variables entrega bien antes de activar penalizaciones comerciales para usuarios.</p></div>
          </div>
        </section>

        <div className="flex flex-wrap gap-3 pb-8">
          <Link href="/dispatch" className="rounded-full bg-slate-950 px-5 py-3 text-sm font-bold text-white">Volver a despacho</Link>
          <Link href="/dashboard" className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-800">Ir a oficina</Link>
        </div>
      </section>
    </main>
  );
}
