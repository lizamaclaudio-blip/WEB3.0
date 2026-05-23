export const ACARS_ACTIVE_STATES = [
  "ACARS_READY",
  "ACARS_CLAIMED",
  "ACARS_STARTED",
  "IN_FLIGHT",
  "REPORT_RECEIVED",
  "PENDING_EVALUATION",
] as const;

export const ACARS_TERMINAL_STATES = [
  "EVALUATED",
  "COMPLETED",
  "CANCELLED",
  "EXPIRED",
] as const;

export type AcarsState = (typeof ACARS_ACTIVE_STATES)[number] | (typeof ACARS_TERMINAL_STATES)[number];

export function normalizeAcarsState(value: unknown): AcarsState | null {
  const text = String(value ?? "").trim().toUpperCase();
  if (!text) return null;
  const mapped: Record<string, AcarsState> = {
    STARTED: "ACARS_STARTED",
    REPORT_PENDING: "REPORT_RECEIVED",
    FINALIZED: "COMPLETED",
  };
  const normalized = mapped[text] ?? (text as AcarsState);
  return [...ACARS_ACTIVE_STATES, ...ACARS_TERMINAL_STATES].includes(normalized) ? normalized : null;
}

