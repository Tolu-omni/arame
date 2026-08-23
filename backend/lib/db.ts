import { getSupabaseServerClient } from "@/backend/supabase/server";

export function getDatabaseClient() {
  return getSupabaseServerClient();
}
