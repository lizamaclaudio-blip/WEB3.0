import Link from "next/link";

export const metadata = {
  title: "Descargas | Patagonia Wings",
  description: "Descarga Patagonia Wings ACARS y otros recursos",
};

export default function DownloadsPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="mx-auto max-w-4xl px-4 py-12">
        <h1 className="mb-8 text-center text-3xl font-bold text-white md:text-4xl">
          Descargas
        </h1>

        <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-6 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-6 md:flex-row md:items-start">
            <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-4xl font-bold text-white shadow-lg">
              ACARS
            </div>

            <div className="flex-1 text-center md:text-left">
              <h2 className="mb-2 text-2xl font-semibold text-white">
                Patagonia Wings ACARS
              </h2>
              <p className="mb-1 text-slate-300">
                Version actual: <span className="font-mono text-cyan-400">7.1.2</span>
              </p>
              <p className="mb-4 text-sm text-slate-400">
                Sistema de registro de vuelos para Microsoft Flight Simulator
              </p>

              <a
                href="/downloads/acars/PatagoniaWingsACARSSetup.exe"
                download
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-3 font-medium text-white shadow-lg transition-all hover:from-cyan-400 hover:to-blue-500 hover:shadow-cyan-500/25"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Descargar instalador
              </a>
            </div>
          </div>

          <div className="mt-6 rounded-lg border border-cyan-500/30 bg-cyan-500/10 p-4">
            <p className="text-sm text-cyan-200">
              <strong>Versión 7.1.2 — Hotfix Login Web 3.0</strong><br />
              • Corrige autenticación ACARS contra Web 3.0.<br />
              • El cliente ahora envía email normalizado al endpoint /api/auth/login.<br />
              • Mensaje de credenciales incorrectas mejorado.<br />
              • Claim/finalize no fueron modificados.
            </p>
          </div>

          <div className="mt-6 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
            <p className="text-sm text-amber-200">
              <strong>Nota importante:</strong> Si tienes una version anterior conectada al actualizador antiguo, 
              instala manualmente esta version una vez. Desde 7.1.1 las futuras actualizaciones se consultaran 
              directamente desde Patagonia Wings Web.
            </p>
          </div>
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm text-slate-300 transition-colors hover:border-slate-500 hover:text-white"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Volver al inicio
          </Link>
        </div>
      </div>
    </main>
  );
}
