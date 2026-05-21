type PilotCountersProps = {
  counters?: {
    monthPosition?: number;
    monthHours?: number;
    totalPireps?: number;
    totalHours?: number;
    score?: number;
    coins?: number;
  };
};

function format(value: number | undefined, fallback: number, decimals = 0) {
  const n = Number.isFinite(value) ? Number(value) : fallback;
  return n.toLocaleString("es-CL", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function PilotCounters({ counters }: PilotCountersProps) {
  const rows = [
    [format(counters?.monthPosition, 24), "Posición en Mayo"],
    [format(counters?.monthHours, 5.8, 1), "Hs. en Mayo"],
    [format(counters?.totalPireps, 416), "PIREEPs Reportados".replace("PIREE", "PIRE")],
    [format(counters?.totalHours, 1061.6, 1), "Horas de Vuelo"],
    [format(counters?.score, 145), "PW Score"],
    [`$${format(counters?.coins, 631)}`, "Coins"],
  ];

  return (
    <section className="pw-sur-counters-wrap">
      <div className="pw-sur-container pw-sur-counters">
        {rows.map(([value, label]) => (
          <div className="pw-sur-counter" key={label}>
            <strong>{value}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
