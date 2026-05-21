"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { AuthShell } from "@/components/auth/AuthShell";

type LoginResponse = {
  ok: boolean;
  error?: string;
  code?: string;
  redirectTo?: string;
};

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");

    if (!email || !password) {
      setError("Ingresa correo y contraseña.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        cache: "no-store",
        body: JSON.stringify({ email, password }),
      });

      const data = (await response.json().catch(() => null)) as LoginResponse | null;

      if (!response.ok || !data?.ok) {
        throw new Error(data?.error ?? "No se pudo iniciar sesión.");
      }

      window.location.assign(data.redirectTo ?? "/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar sesión.");
      setLoading(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Acceso pilotos"
      title="Iniciar sesión"
      description="Ingresa al Crew Center de Patagonia Wings para revisar tu estado, base, rutas disponibles, despacho y progreso operacional."
      sideTitle="Crew Center"
      sideItems={[
        "Acceso conectado a Neon PostgreSQL.",
        "Tu sesión queda protegida con cookie segura del servidor.",
        "El despacho se habilitará según estado, rango, ubicación y aeronave disponible.",
      ]}
    >
      <form className="space-y-5" aria-label="Formulario de inicio de sesión" onSubmit={onSubmit}>
        <div>
          <label htmlFor="email" className="block text-sm font-extrabold text-slate-800">
            Correo electrónico
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="mt-2 w-full rounded-md border border-slate-300 bg-white px-4 py-3 text-[15px] text-slate-950 outline-none transition focus:border-[#0B4F8A] focus:ring-4 focus:ring-sky-100"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-extrabold text-slate-800">
            Contraseña
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="mt-2 w-full rounded-md border border-slate-300 bg-white px-4 py-3 text-[15px] text-slate-950 outline-none transition focus:border-[#0B4F8A] focus:ring-4 focus:ring-sky-100"
          />
        </div>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="pw-sur-btn pw-sur-btn-primary w-full justify-center py-3 text-[15px] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Ingresando..." : "Ingresar al Crew Center"}
        </button>

        <p className="text-center text-sm text-slate-600">
          Aún no tienes cuenta?{" "}
          <Link href="/register" className="font-extrabold text-[#0B4F8A] hover:text-sky-600">
            Crear cuenta
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
