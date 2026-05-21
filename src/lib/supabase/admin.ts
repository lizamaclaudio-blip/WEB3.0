import { SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL } from "@/lib/supabase/env";

export function getSupabaseAdminClient() {
  return {
    url: SUPABASE_URL,
    key: SUPABASE_SERVICE_ROLE_KEY,
  };
}
