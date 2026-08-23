import { getSupabaseServerClient } from "@/backend/supabase/server";
import { isEmail, isNonEmptyString } from "@/backend/lib/validations";

export async function loginWithEmail(email: string, password: string) {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return { data: null, error: "Supabase is not configured." };
  }

  if (!isEmail(email) || !isNonEmptyString(password)) {
    return { data: null, error: "Enter a valid email and password." };
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  return { data, error: error?.message ?? null };
}

export async function registerWithEmail(email: string, password: string) {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return { data: null, error: "Supabase is not configured." };
  }

  if (!isEmail(email) || password.length < 6) {
    return { data: null, error: "Enter a valid email and a password of at least 6 characters." };
  }

  const { data, error } = await supabase.auth.signUp({ email, password });

  return { data, error: error?.message ?? null };
}
