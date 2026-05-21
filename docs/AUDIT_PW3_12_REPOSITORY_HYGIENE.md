# AUDIT PW3 12 — HIGIENE DEL REPOSITORIO
**Fecha:** 2026-05-21 | **Solo lectura — no se borró nada**

---

## Items a Excluir en Próximos ZIPs

| Item | Tipo | Acción Recomendada |
|---|---|---|
| `.env.local` | Credenciales DB/auth | **NUNCA incluir en ZIP** — agregar a .gitignore |
| `.next/` | Build cache | Excluir (ya en .gitignore) |
| `.cache/` | Cache interno | Excluir en ZIP manual |
| `node_modules/` | Dependencias | Excluir (ya en .gitignore) |
| `public.zip` | ZIP en raíz | Eliminar del directorio |
| `public (2).zip` | ZIP duplicado | Eliminar del directorio |
| `pw3-economy-cierre-20260520-2200.zip` | ZIP antiguo | Mover a backup externo |
| `src/app_globals.tmp` | Archivo temporal | Eliminar |
| `validate-pw3-master.mjs.bak` | Backup script | Eliminar |
| 36 README/PW3_*.md en raíz | Docs sueltos | Mover a `docs/` |

---

## BOM UTF-8

| Archivo | BOM detectado |
|---|---|
| `src/lib/dispatch/training-reservations.ts` | ❌ Sin BOM |
| `src/lib/dispatch/manifest-types.ts` | ❌ Sin BOM |
| `src/lib/economy/calculator.ts` | ❌ Sin BOM |

**Mojibake (validate-economy.mjs):** `mojibake_hits=0` ✅

---

## Supabase

- Directorio `supabase/` existe con `migrations/` y `pw3/`
- Contiene migraciones Supabase legacy (auth, perfil)
- **NO se usa para economía PW3** — economía va a Neon vía DATABASE_URL
- No eliminar — puede necesitarse para auth

---

## Archivos Potencialmente Obsoletos

| Archivo | Estado |
|---|---|
| `scripts/pw3/run-pw3-supabase-master.mjs` | Legacy Supabase — no ejecutar para PW3 economy |
| `scripts/pw3/download-ourairports.mjs` | Utilidad puntual — conservar |
| `scripts/pw3/fix-dispatch-*.mjs` | Parches ya aplicados — archivar |
| `scripts/pw3/apply-dispatch-accordion-icao-fix.mjs` | Parche puntual — archivar |
| `docs/exports/*.zip` | ZIPs de parches — conservar como historial |

---

## Git

- **Un solo commit** (`331306d` — "Initial commit from Create Next App")
- Todo el trabajo real está sin commitear (??/untracked)
- **Riesgo alto:** si el directorio se daña, no hay recuperación desde git
- **Acción recomendada:** `git add -A && git commit -m "PW3 E4.1 Pre-ACARS completed"` antes de ACARS desktop

---

## .gitignore Recomendado (additions)

```
.env.local
.cache/
src/app_globals.tmp
*.zip
scripts/pw3/*.bak
```
