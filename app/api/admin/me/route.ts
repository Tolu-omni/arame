import { isAdminEmail } from "@/backend/admin/access";
import { getBearerToken } from "@/backend/paystack/orders";
import { getSupabaseServerClient } from "@/backend/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const accessToken = getBearerToken(request);

  if (!accessToken) {
    return Response.json({ isAdmin: false });
  }

  const supabase = getSupabaseServerClient(accessToken);

  if (!supabase) {
    return Response.json({ error: "Supabase is not configured." }, { status: 500 });
  }

  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user?.email) {
    return Response.json({ isAdmin: false });
  }

  return Response.json({ isAdmin: isAdminEmail(data.user.email) });
}
