import type { ProgressionExpenseCatalogItem } from "./types";
import { getProgressionExpenseCatalog } from "./catalog";

export type TrainingExpenseCategory = "checkride" | "theory" | "rating";

export type TrainingExpenseCode =
  | "CHECKRIDE_INITIAL"
  | "CHECKRIDE_LIGHT"
  | "CHECKRIDE_TURBOPROP"
  | "CHECKRIDE_REGIONAL_JET"
  | "CHECKRIDE_NARROW_BODY"
  | "CHECKRIDE_WIDE_BODY"
  | "THEORY_BASIC"
  | "THEORY_ADVANCED"
  | "THEORY_RANK_EXAM"
  | "TYPE_RATING"
  | "RECURRENT_RENEWAL"
  | "SPECIAL_CARGO_CERT"
  | "INTERNATIONAL_CERT"
  | "FAILED_RETRY";

const AIRCRAFT_CATEGORY_TO_EXPENSE_CODE: Record<string, TrainingExpenseCode> = {
  "Monomotor piston": "CHECKRIDE_INITIAL",
  "Multimotor": "CHECKRIDE_LIGHT",
  "Turboprop": "CHECKRIDE_TURBOPROP",
  "Regional": "CHECKRIDE_TURBOPROP",
  "Regional jet": "CHECKRIDE_REGIONAL_JET",
  "Jet comercial": "CHECKRIDE_NARROW_BODY",
  "Jet clasico": "CHECKRIDE_NARROW_BODY",
  "Widebody": "CHECKRIDE_WIDE_BODY",
};

const THEORY_EXAM_CATEGORY_TO_EXPENSE_CODE: Record<string, TrainingExpenseCode> = {
  "Base": "THEORY_BASIC",
  "Meteo": "THEORY_BASIC",
  "Operacion": "THEORY_BASIC",
  "ATC": "THEORY_BASIC",
  "Despacho": "THEORY_BASIC",
  "Performance": "THEORY_ADVANCED",
  "IFR": "THEORY_ADVANCED",
  "Compania": "THEORY_BASIC",
};

const RATING_CATEGORY_TO_EXPENSE_CODE: Record<string, TrainingExpenseCode> = {
  "IFR": "RECURRENT_RENEWAL",
  "Meteo": "RECURRENT_RENEWAL",
  "Aeronave": "TYPE_RATING",
  "Ruta": "INTERNATIONAL_CERT",
};

export function getCheckrideExpenseCode(aircraftCategory: string): TrainingExpenseCode {
  return AIRCRAFT_CATEGORY_TO_EXPENSE_CODE[aircraftCategory] ?? "CHECKRIDE_INITIAL";
}

export function getTheoryExamExpenseCode(examCategory: string): TrainingExpenseCode {
  return THEORY_EXAM_CATEGORY_TO_EXPENSE_CODE[examCategory] ?? "THEORY_BASIC";
}

export function getRatingExpenseCode(ratingCategory: string): TrainingExpenseCode {
  return RATING_CATEGORY_TO_EXPENSE_CODE[ratingCategory] ?? "RECURRENT_RENEWAL";
}

export function resolveExpenseAmount(
  expenseCode: TrainingExpenseCode,
  catalog: ProgressionExpenseCatalogItem[],
): number {
  const item = catalog.find((entry) => entry.code === expenseCode);
  if (item && item.amountUsd > 0) return item.amountUsd;
  const local = getProgressionExpenseCatalog();
  return local.find((entry) => entry.code === expenseCode)?.amountUsd ?? 0;
}

export function buildCheckrideExpenseKey(
  pilotId: string,
  aircraftCode: string,
  attemptIndex: number,
): string {
  return `checkride:${pilotId}:${aircraftCode.toUpperCase()}:attempt${attemptIndex}`;
}

export function buildTheoryExpenseKey(
  pilotId: string,
  examCode: string,
  attemptIndex: number,
): string {
  return `theory:${pilotId}:${examCode.toUpperCase()}:attempt${attemptIndex}`;
}

export function buildRatingExpenseKey(
  pilotId: string,
  ratingCode: string,
): string {
  return `rating:${pilotId}:${ratingCode.toUpperCase()}`;
}
