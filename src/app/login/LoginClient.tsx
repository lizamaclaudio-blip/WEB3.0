"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { signInWithPassword } from "@/lib/supabase/client-auth";

export default function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialIdentifier = useMemo(() => searchParams.get("email") ?? "", [searchParams]);
  const [identifier, setIdentifier] = useState(initialIdentifier);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signInWithPassword(identifier, password);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar sesión.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Acceso pilotos"
      title="Inicio de sesión"
      description="Ingresa al área privada para acceder al Crew Center, tus despachos, PIREPs, progreso, economía virtual y herramientas ACARS."
      sideTitle="Área privada"
      sideItems={[
        "El acceso al dashboard queda reservado para pilotos con cuenta aprobada.",
        "La sesión ahora valida contra Supabase Auth.",
        "Puedes ingresar con correo electrónico o callsign si el perfil tiene correo asociado.",
      ]}
    >
      <form className="space-y-5" aria-label="Formulario de inicio de sesión" onSubmit={onSubmit}>
        <div>
          <label htmlFor="identifier" className="block text-sm font-extrabold text-slate-800">
            Callsign o correo electrónico
          </label>
          <input
            id="identifier"
            name="identifier"
            type="text"
            autoComplete="username"
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            required
            className="mt-2 w-full rounded-md border border-slate-300 bg-white px-4 py-3 text-[15px] text-slate-950 outline-none transition focus:border-[#0B4F8A] focus:ring-4 focus:ring-sky-100"
          />
        </div>

        <div>
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="password" className="block text-sm font-extrabold text-slate-800">
              Contraseña
            </label>
            <a href="#" className="text-sm font-bold text-[#0B4F8A] hover:text-sky-600">
              Recuperar acceso
            </a>
          </div>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            className="mt-2 w-full rounded-md border border-slate-300 bg-white px-4 py-3 text-[15px] text-slate-950 outline-none transition focus:border-[#0B4F8A] focus:ring-4 focus:ring-sky-100"
          />
        </div>

        <label className="flex items-center gap-3 text-sm font-semibold text-slate-600">
          <input type="checkbox" className="h-4 w-4 rounded border-slate-300 accent-[#0B4F8A]" />
          Mantener sesión iniciada en este dispositivo
        </label>

        {error && <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}

        <button type="submit" disabled={loading} className="pw-sur-btn pw-sur-btn-primary w-full justify-center py-3 text-[15px] disabled:opacity-60">
          {loading ? "Validando..." : "Iniciar sesión"}
        </button>

        <div className="rounded-md border border-sky-200 bg-sky-50 p-4 text-sm leading-6 text-slate-700">
          La sesión queda guardada localmente para consultar los endpoints privados del Crew Center con token Supabase.
        </div>

        <p className="text-center text-sm text-slate-600">
          ¿Aún no tienes cuenta?{" "}
          <Link href="/register" className="font-extrabold text-[#0B4F8A] hover:text-sky-600">
            Solicitar cuenta de piloto
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
