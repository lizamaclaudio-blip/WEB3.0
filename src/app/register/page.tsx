"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { AuthShell } from "@/components/auth/AuthShell";

type HubOption = {
  code: string;
  name: string;
  airport?: {
    city?: string | null;
    name?: string | null;
  };
  permissions?: {
    initialRegistration?: boolean;
    school?: boolean;
  };
};

type RegisterResponse = {
  ok: boolean;
  error?: string;
  redirectTo?: string;
};

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [hubs, setHubs] = useState<HubOption[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadHubs() {
      try {
        const response = await fetch("/api/hubs", { cache: "no-store" });
        const data = (await response.json().catch(() => null)) as { hubs?: HubOption[] } | null;
        const schoolHubs = (data?.hubs ?? []).filter((hub) => hub.permissions?.initialRegistration === true || ["SCPF", "SCTB", "SCIE"].includes(hub.code));
        if (!cancelled) setHubs(schoolHubs);
      } catch {
        if (!cancelled) setHubs([]);
      }
    }

    void loadHubs();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirmPassword = String(form.get("confirmPassword") ?? "");

    if (password !== confirmPassword) {
      setError("Las contrasenas no coinciden.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: String(form.get("firstName") ?? ""),
          lastName: String(form.get("lastName") ?? ""),
          email: String(form.get("email") ?? ""),
          hubIdent: String(form.get("base") ?? ""),
          experience: String(form.get("experience") ?? "intermedio"),
          password,
        }),
      });

      const data = (await response.json().catch(() => null)) as RegisterResponse | null;

      if (!response.ok || !data?.ok) {
        throw new Error(data?.error ?? "No se pudo crear la cuenta.");
      }

      setMessage("Cuenta creada. Tu callsign PWG fue asignado automaticamente y tu perfil quedo activo.");
      setTimeout(() => router.push(data.redirectTo ?? "/dashboard"), 700);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la cuenta.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Nuevo piloto"
      title="Crear cuenta"
      description="Crea tu cuenta en Patagonia Wings. El sistema asigna tu callsign PWG automaticamente y activa tu perfil como CADET."
      sideTitle="Proceso de ingreso"
      sideItems={[
        "Completa tus datos basicos de postulacion.",
        "El sistema asigna automaticamente el siguiente callsign PWG disponible.",
        "Tu cuenta queda activa automaticamente como CADET.",
      ]}
    >
      <form className="space-y-5" aria-label="Formulario de creacion de cuenta" onSubmit={onSubmit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="firstName" className="block text-sm font-extrabold text-slate-800">Nombre</label>
            <input id="firstName" name="firstName" type="text" autoComplete="given-name" required className="mt-2 w-full rounded-md border border-slate-300 bg-white px-4 py-3 text-[15px] text-slate-950 outline-none transition focus:border-[#0B4F8A] focus:ring-4 focus:ring-sky-100" />
          </div>
          <div>
            <label htmlFor="lastName" className="block text-sm font-extrabold text-slate-800">Apellido</label>
            <input id="lastName" name="lastName" type="text" autoComplete="family-name" required className="mt-2 w-full rounded-md border border-slate-300 bg-white px-4 py-3 text-[15px] text-slate-950 outline-none transition focus:border-[#0B4F8A] focus:ring-4 focus:ring-sky-100" />
          </div>
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-extrabold text-slate-800">Correo electronico</label>
          <input id="email" name="email" type="email" autoComplete="email" required className="mt-2 w-full rounded-md border border-slate-300 bg-white px-4 py-3 text-[15px] text-slate-950 outline-none transition focus:border-[#0B4F8A] focus:ring-4 focus:ring-sky-100" />
        </div>

        <div className="rounded-md border border-sky-100 bg-sky-50 px-4 py-3 text-sm font-semibold text-[#0B4F8A]">
          El callsign no se elige manualmente. Patagonia Wings asignara automaticamente el siguiente codigo PWG disponible.
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="base" className="block text-sm font-extrabold text-slate-800">Hub escuela inicial</label>
            <select id="base" name="base" className="mt-2 w-full rounded-md border border-slate-300 bg-white px-4 py-3 text-[15px] text-slate-950 outline-none transition focus:border-[#0B4F8A] focus:ring-4 focus:ring-sky-100" required>
              <option value="">Selecciona hub escuela</option>
              {hubs.map((hub) => (
                <option key={hub.code} value={hub.code}>
                  {hub.code} - {hub.airport?.city || hub.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="experience" className="block text-sm font-extrabold text-slate-800">Experiencia simulador</label>
            <select id="experience" name="experience" className="mt-2 w-full rounded-md border border-slate-300 bg-white px-4 py-3 text-[15px] text-slate-950 outline-none transition focus:border-[#0B4F8A] focus:ring-4 focus:ring-sky-100" defaultValue="intermedio">
              <option value="inicial">Inicial</option>
              <option value="intermedio">Intermedio</option>
              <option value="avanzado">Avanzado</option>
              <option value="online">Vuelo online / redes ATC</option>
            </select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="password" className="block text-sm font-extrabold text-slate-800">Contrasena</label>
            <input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} className="mt-2 w-full rounded-md border border-slate-300 bg-white px-4 py-3 text-[15px] text-slate-950 outline-none transition focus:border-[#0B4F8A] focus:ring-4 focus:ring-sky-100" />
          </div>
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-extrabold text-slate-800">Confirmar contrasena</label>
            <input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required minLength={8} className="mt-2 w-full rounded-md border border-slate-300 bg-white px-4 py-3 text-[15px] text-slate-950 outline-none transition focus:border-[#0B4F8A] focus:ring-4 focus:ring-sky-100" />
          </div>
        </div>

        <label className="flex items-start gap-3 text-sm leading-6 text-slate-600">
          <input type="checkbox" required className="mt-1 h-4 w-4 rounded border-slate-300 accent-[#0B4F8A]" />
          <span>Declaro que usare la plataforma como piloto virtual y acepto las normas operacionales de Patagonia Wings.</span>
        </label>

        {error && <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}
        {message && <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">{message}</div>}

        <button type="submit" disabled={loading} className="pw-sur-btn pw-sur-btn-primary w-full justify-center py-3 text-[15px] disabled:opacity-60">
          {loading ? "Creando cuenta..." : "Crear cuenta de piloto"}
        </button>

        <p className="text-center text-sm text-slate-600">
          Ya tienes acceso? <Link href="/login" className="font-extrabold text-[#0B4F8A] hover:text-sky-600">Iniciar sesion</Link>
        </p>
      </form>
    </AuthShell>
  );
}
