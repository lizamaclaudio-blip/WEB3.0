"use client";

import { useEffect, useState } from "react";
import { clearStoredSession, getStoredSession } from "@/lib/supabase/client-auth";

export function usePrivateApi<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const session = getStoredSession();
        if (!session?.access_token) throw new Error("No autenticado.");
        const response = await fetch(path, {
          headers: { Authorization: `Bearer ${session.access_token}` },
          cache: "no-store",
        });
        const json = (await response.json().catch(() => null)) as T & { error?: string };

        if (response.status === 401) {
          clearStoredSession();
          throw new Error(json?.error || "No autenticado.");
        }
        if (!response.ok) throw new Error(json?.error || "No disponible.");
        if (!cancelled) setData(json);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "No disponible.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [path]);

  return { data, loading, error };
}
