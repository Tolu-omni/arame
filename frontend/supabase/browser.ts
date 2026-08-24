import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;

const AUTH_REDIRECT_PARAMS = new Set([
  "access_token",
  "code",
  "error",
  "error_code",
  "error_description",
  "expires_at",
  "expires_in",
  "provider_refresh_token",
  "provider_token",
  "refresh_token",
  "token_type",
  "type",
]);

function hasValidSupabaseConfig(url?: string, key?: string) {
  if (!url || !key) {
    return false;
  }

  try {
    const parsedUrl = new URL(url);
    return parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:";
  } catch {
    return false;
  }
}

export function getSupabaseBrowserClient() {
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

  if (!browserClient) {
    browserClient = createClient(supabaseUrl, supabaseAnonKey);
  }

  return browserClient;
}

function hasAuthRedirectParams(params: URLSearchParams) {
  return Array.from(params.keys()).some((key) => AUTH_REDIRECT_PARAMS.has(key));
}

export function clearSupabaseAuthRedirectFromUrl() {
  if (typeof window === "undefined") {
    return;
  }

  const url = new URL(window.location.href);
  let changed = false;

  if (url.hash) {
    const hashParams = new URLSearchParams(url.hash.slice(1));

    if (hasAuthRedirectParams(hashParams)) {
      url.hash = "";
      changed = true;
    }
  }

  AUTH_REDIRECT_PARAMS.forEach((key) => {
    if (url.searchParams.has(key)) {
      url.searchParams.delete(key);
      changed = true;
    }
  });

  if (changed) {
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}`);
  }
}
