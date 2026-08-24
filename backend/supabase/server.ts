import { createClient } from "@supabase/supabase-js";
import { hasValidSupabaseConfig } from "@/backend/lib/validations";

export function getSupabaseServerClient(accessToken?: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!hasValidSupabaseConfig(url, anonKey)) {
    return null;
  }

  const supabaseUrl = url;
  const supabaseAnonKey = anonKey;

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
    },
    ...(accessToken
      ? {
          global: {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          },
        }
      : {}),
  });
}

export function getSupabaseServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!hasValidSupabaseConfig(url, serviceRoleKey)) {
    return null;
  }

  return createClient(url as string, serviceRoleKey as string, {
    auth: {
      persistSession: false,
    },
  });
}
