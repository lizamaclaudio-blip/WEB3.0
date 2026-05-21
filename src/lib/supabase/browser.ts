"use client";

import { getStoredSession, signInWithPassword, signUpPilotAccount, clearStoredSession } from "@/lib/supabase/client-auth";

export function getSupabaseBrowserClient() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    getStoredSession,
    signInWithPassword,
    signUpPilotAccount,
    clearStoredSession,
  };
}

export { clearStoredSession, getStoredSession, signInWithPassword, signUpPilotAccount };
