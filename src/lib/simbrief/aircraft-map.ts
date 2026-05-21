export type SimbriefAircraftMap = {
  code: string;
  simbriefCode: string;
  notes?: string;
};

const MAP: Record<string, SimbriefAircraftMap> = {
  C172: { code: "C172", simbriefCode: "C172" },
  C208: { code: "C208", simbriefCode: "C208" },
  BE58: { code: "BE58", simbriefCode: "BE58" },
  B350: { code: "B350", simbriefCode: "B350" },
  TBM9: { code: "TBM9", simbriefCode: "TBM9" },
  ATR72: { code: "ATR72", simbriefCode: "AT76", notes: "mapped to AT76" },
  AT76: { code: "AT76", simbriefCode: "AT76" },
  A320: { code: "A320", simbriefCode: "A320" },
  A20N: { code: "A20N", simbriefCode: "A20N" },
  B738: { code: "B738", simbriefCode: "B738" },
};

function normalize(value: string | null | undefined) {
  return (value ?? "").trim().toUpperCase();
}

export function mapAircraftCodeToSimbrief(aircraftCode: string | null | undefined) {
  const code = normalize(aircraftCode);
  if (!code) return { code: "", simbriefCode: "", matched: false, warning: "aircraft code missing" };
  const mapped = MAP[code];
  if (mapped) return { ...mapped, matched: true };
  return {
    code,
    simbriefCode: code,
    matched: false,
    warning: `no exact mapping for ${code}, using fallback`,
  };
}
