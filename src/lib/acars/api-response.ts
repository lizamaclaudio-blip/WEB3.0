import { NextResponse } from "next/server";

export type AcarsEnvelopeInput = {
  ok: boolean;
  code: string;
  message: string;
  status?: string | null;
  evaluationStatus?: string | null;
  details?: unknown;
  extra?: Record<string, unknown>;
};

export function acarsJson(httpStatus: number, input: AcarsEnvelopeInput) {
  return NextResponse.json(
    {
      ok: input.ok,
      code: input.code,
      message: input.message,
      status: input.status ?? null,
      evaluationStatus: input.evaluationStatus ?? null,
      details: input.details ?? null,
      ...(input.extra ?? {}),
    },
    { status: httpStatus },
  );
}

