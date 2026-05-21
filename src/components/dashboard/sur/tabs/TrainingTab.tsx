"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { CrewCenterData } from "@/components/dashboard/sur/DashboardClient";
import {
  AIRCRAFT_CERTIFICATIONS,
  CHECKRIDE_FAILURE_POLICY,
  RATING_MODULES,
  THEORY_EXAMS,
  isAircraftCertified,
} from "@/lib/training/catalog";
import type { ProgressionExpenseCatalogItem } from "@/lib/economy";
import {
  getCheckrideExpenseCode,
  getRatingExpenseCode,
  getTheoryExamExpenseCode,
  resolveExpenseAmount,
} from "@/lib/economy/training-expense";
import { getProgressionExpenseCatalog } from "@/lib/economy";
import styles from "./OfficeTrainingTabs.module.css";

type Permissions = CrewCenterData["permissions"];

function money(value: number) {
  return `$ ${value.toLocaleString("es-CL")}`;
}

type ExpenseResult = { ok: boolean; error?: string; amountUsd?: number };

function useProgressionExpenses() {
  const [catalog, setCatalog] = useState<ProgressionExpenseCatalogItem[]>(() => getProgressionExpenseCatalog());

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/economy/expenses", { cache: "no-store" })
      .then((res) => res.json())
      .then((json: { ok?: boolean; expenses?: ProgressionExpenseCatalogItem[] }) => {
        if (!cancelled && json?.ok && Array.isArray(json.expenses) && json.expenses.length > 0) {
          setCatalog(json.expenses);
        }
      })
      .catch(() => null);
    return () => { cancelled = true; };
  }, []);

  return catalog;
}

async function submitProgressionExpense(params: {
  category: "checkride" | "theory" | "rating";
  itemCode: string;
  itemCategory: string;
  attemptIndex?: number;
}): Promise<ExpenseResult> {
  try {
    const { getStoredSession } = await import("@/lib/supabase/client-auth");
    const session = getStoredSession();
    if (!session?.access_token) return { ok: false, error: "No autenticado." };
    const res = await fetch("/api/economy/progression-expense", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(params),
      cache: "no-store",
    });
    const json = (await res.json()) as ExpenseResult & { required?: number; available?: number };
    if (!res.ok) {
      const extra = (json.required != null && json.available != null)
        ? ` (requerido $${json.required}, disponible $${json.available})`
        : "";
      return { ok: false, error: (json.error ?? "Error al registrar gasto.") + extra };
    }
    return { ok: true, amountUsd: json.amountUsd };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Error de red." };
  }
}

function statusBadge(status: string) {
  if (status === "APPROVED") return <span className={`${styles.status} ${styles.statusSuccess}`}>Aprobada</span>;
  if (status === "AVAILABLE") return <span className={`${styles.status} ${styles.statusInfo}`}>Disponible</span>;
  if (status === "LOCKED") return <span className={`${styles.status} ${styles.statusMuted}`}>Bloqueada</span>;
  return <span className={`${styles.status} ${styles.statusWarning}`}>Pendiente</span>;
}

export function TrainingTab({ permissions }: { permissions?: Permissions }) {
  const permittedAircraftTypes = permissions?.permittedAircraftTypes ?? [];
  const approvedCertifications = AIRCRAFT_CERTIFICATIONS.filter((cert) => isAircraftCertified(permittedAircraftTypes, cert)).length;
  const availableCertifications = AIRCRAFT_CERTIFICATIONS.length - approvedCertifications;
  const catalog = useProgressionExpenses();
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const pendingRef = useRef<Set<string>>(new Set());

  async function handleExpense(
    key: string,
    category: "checkride" | "theory" | "rating",
    itemCode: string,
    itemCategory: string,
    cost: number,
    attemptIndex = 0,
  ) {
    if (pendingRef.current.has(key)) return;
    const label = category === "checkride" ? "Checkride" : category === "rating" ? "habilitacion" : "examen teorico";
    const confirmed = window.confirm(
      `Confirmar inscripcion: ${label} ${itemCode}\nCosto: $${cost.toLocaleString("es-CL")} USD\n\nEl monto sera descontado de tu wallet virtual.`,
    );
    if (!confirmed) return;
    pendingRef.current.add(key);
    setFeedback((prev) => ({ ...prev, [key]: "Procesando..." }));
    const result = await submitProgressionExpense({ category, itemCode, itemCategory, attemptIndex });
    pendingRef.current.delete(key);
    if (result.ok) {
      setFeedback((prev) => ({ ...prev, [key]: `Registrado: -$${result.amountUsd?.toLocaleString("es-CL") ?? ""}` }));
    } else {
      setFeedback((prev) => ({ ...prev, [key]: result.error ?? "Error." }));
    }
  }

  function certCost(cert: typeof AIRCRAFT_CERTIFICATIONS[number]) {
    const code = getCheckrideExpenseCode(cert.category);
    const amount = resolveExpenseAmount(code, catalog);
    return amount > 0 ? amount : cert.costCoins;
  }

  function examCost(exam: typeof THEORY_EXAMS[number]) {
    const code = getTheoryExamExpenseCode(exam.category);
    const amount = resolveExpenseAmount(code, catalog);
    return amount > 0 ? amount : exam.costCoins;
  }

  function ratingCost(rating: typeof RATING_MODULES[number]) {
    const code = getRatingExpenseCode(rating.category);
    const amount = resolveExpenseAmount(code, catalog);
    return amount > 0 ? amount : rating.costCoins;
  }

  return (
    <div className={styles.shell}>
      <section className={styles.heroCard}>
        <div className={styles.heroTitle}>Centro de Capacitación y Perfeccionamiento</div>
        <div className={styles.heroBody}>
          <p>Solicita certificaciones, habilitaciones y exámenes teóricos para avanzar en tu carrera operacional.</p>
          <p>Las tablas quedan contenidas en una caja con desplazamiento horizontal para evitar desalineaciones.</p>
        </div>
      </section>

      <section className={styles.alert}>
        <strong>Regla de checkride:</strong> cada intento tendrá costo virtual cuando se active economía/wallet. Si fallas 1 vez, espera 7 días; 2 veces, 15 días; 3 veces, 30 días. Luego el contador se reinicia.
      </section>

      <section className={styles.card}>
        <header className={styles.cardHeader}>
          <h3>Resumen de entrenamiento</h3>
          <span>Estado actual</span>
        </header>
        <div className={`${styles.cardBody} ${styles.summaryGrid}`}>
          <article className={styles.metricCard}>
            <span>Certificaciones</span>
            <strong>{approvedCertifications}</strong>
            <small>Aprobadas</small>
          </article>
          <article className={styles.metricCard}>
            <span>Disponibles</span>
            <strong>{availableCertifications}</strong>
            <small>Checkrides por solicitar</small>
          </article>
          <article className={styles.metricCard}>
            <span>Habilitaciones</span>
            <strong>{RATING_MODULES.length}</strong>
            <small>Módulos operacionales</small>
          </article>
          <article className={styles.metricCard}>
            <span>Teóricos</span>
            <strong>{THEORY_EXAMS.length}</strong>
            <small>Evaluaciones disponibles</small>
          </article>
        </div>
      </section>

      <section className={styles.card}>
        <header className={styles.cardHeader}>
          <h3>Listado de certificaciones</h3>
          <span>Aeronaves</span>
        </header>
        <div className={`${styles.cardBody} ${styles.stack}`}>
          <p className={styles.emptyText}>
            Cada certificación corresponde a un checkride por tipo de aeronave, no por matrícula. Estas certificaciones serán requisito para ascensos, rutas oficiales y operaciones avanzadas.
          </p>
          <div className={styles.tableWrap}>
            <table className={`${styles.table} ${styles.trainingTable}`}>
              <thead>
                <tr>
                  <th>Avión</th>
                  <th>Familia</th>
                  <th>Nivel</th>
                  <th>Estado</th>
                  <th>Min. horas</th>
                  <th>Costo</th>
                  <th>Ver</th>
                  <th>Inscribirse</th>
                </tr>
              </thead>
              <tbody>
                {AIRCRAFT_CERTIFICATIONS.map((cert) => {
                  const approved = isAircraftCertified(permittedAircraftTypes, cert);
                  const fbKey = `checkride:${cert.code}`;
                  const cost = certCost(cert);
                  return (
                    <tr key={cert.code}>
                      <td className={styles.aircraftCell}>
                        <span className={styles.planeBadge}>{cert.code}</span>
                        <strong>{cert.name}</strong>
                      </td>
                      <td>{cert.family}</td>
                      <td>{cert.level}</td>
                      <td>{statusBadge(approved ? "APPROVED" : "AVAILABLE")}</td>
                      <td>{cert.minHours} h</td>
                      <td><span className={styles.cost}>{money(cost)}</span></td>
                      <td>
                        <Link className={styles.action} href={`/training/certifications/${encodeURIComponent(cert.code)}`}>
                          Ver
                        </Link>
                      </td>
                      <td>
                        {feedback[fbKey] ? (
                          <span className={styles.cost}>{feedback[fbKey]}</span>
                        ) : (
                          <button
                            className={`${styles.action} ${styles.actionMuted}`}
                            type="button"
                            onClick={() => void handleExpense(fbKey, "checkride", cert.code, cert.category, cost)}
                          >
                            Inscribirse
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className={styles.card}>
        <header className={styles.cardHeader}>
          <h3>Listado de habilitaciones</h3>
          <span>Capacidades</span>
        </header>
        <div className={`${styles.cardBody} ${styles.stack}`}>
          <p className={styles.emptyText}>
            Las habilitaciones desbloquean capacidades operacionales: IFR, viento cruzado, rutas internacionales, turbohélice, jets y widebody.
          </p>
          <div className={styles.tableWrap}>
            <table className={`${styles.table} ${styles.trainingTable}`}>
              <thead>
                <tr>
                  <th>Habilitación</th>
                  <th>Categoría</th>
                  <th>Estado</th>
                  <th>Requisito operacional</th>
                  <th>Costo</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {RATING_MODULES.map((rating) => {
                  const fbKey = `rating:${rating.code}`;
                  const cost = ratingCost(rating);
                  return (
                    <tr key={rating.code}>
                      <td className={styles.leftCell}><strong>{rating.label}</strong></td>
                      <td>{rating.category}</td>
                      <td>{statusBadge(rating.status)}</td>
                      <td className={styles.leftCell}>{rating.requiredFor}</td>
                      <td><span className={styles.cost}>{money(cost)}</span></td>
                      <td>
                        {feedback[fbKey] ? (
                          <span className={styles.cost}>{feedback[fbKey]}</span>
                        ) : (
                          <button
                            className={`${styles.action} ${styles.actionMuted}`}
                            type="button"
                            onClick={() => void handleExpense(fbKey, "rating", rating.code, rating.category, cost)}
                          >
                            Solicitar
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className={styles.card}>
        <header className={styles.cardHeader}>
          <h3>Listado de exámenes teóricos</h3>
          <span>Evaluaciones</span>
        </header>
        <div className={`${styles.cardBody} ${styles.stack}`}>
          <p className={styles.emptyText}>
            Los exámenes teóricos se usarán para progresión de rango, habilitaciones y certificaciones. La corrección oficial debe quedar en servidor.
          </p>
          <div className={styles.tableWrap}>
            <table className={`${styles.table} ${styles.trainingTable}`}>
              <thead>
                <tr>
                  <th>Examen</th>
                  <th>Categoría</th>
                  <th>Duración</th>
                  <th>Aprobación</th>
                  <th>Costo</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {THEORY_EXAMS.map((exam) => {
                  const fbKey = `theory:${exam.code}`;
                  const cost = examCost(exam);
                  return (
                    <tr key={exam.code}>
                      <td className={styles.leftCell}><strong>{exam.label}</strong></td>
                      <td>{exam.category}</td>
                      <td>{exam.durationMinutes} min</td>
                      <td>{exam.passingScore}%</td>
                      <td><span className={styles.cost}>{money(cost)}</span></td>
                      <td>
                        {feedback[fbKey] ? (
                          <span className={styles.cost}>{feedback[fbKey]}</span>
                        ) : (
                          <button
                            className={`${styles.action} ${styles.actionMuted}`}
                            type="button"
                            onClick={() => void handleExpense(fbKey, "theory", exam.code, exam.category, cost)}
                          >
                            Rendir
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className={styles.card}>
        <header className={styles.cardHeader}>
          <h3>Política de intentos</h3>
          <span>Checkride</span>
        </header>
        <div className={styles.cardBody}>
          <ul className={styles.policyList}>
            {CHECKRIDE_FAILURE_POLICY.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>
      </section>
    </div>
  );
}
