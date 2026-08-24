import { fromKobo, verifyPaystackWebhookSignature } from "@/backend/paystack/client";
import { getSupabaseServiceRoleClient } from "@/backend/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type PaystackWebhookEvent = {
  data?: {
    amount?: number;
    channel?: string;
    paid_at?: string;
    reference?: string;
    status?: string;
  };
  event?: string;
};

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-paystack-signature");

  if (!verifyPaystackWebhookSignature(rawBody, signature)) {
    return Response.json({ error: "Invalid Paystack signature." }, { status: 401 });
  }

  let event: PaystackWebhookEvent;

  try {
    event = JSON.parse(rawBody) as PaystackWebhookEvent;
  } catch {
    return Response.json({ error: "Invalid webhook payload." }, { status: 400 });
  }

  if (event.event !== "charge.success" || event.data?.status !== "success") {
    return Response.json({ received: true });
  }

  const reference = event.data.reference?.trim();

  if (!reference) {
    return Response.json({ received: true, skipped: "missing_reference" });
  }

  const supabase = getSupabaseServiceRoleClient();

  if (!supabase) {
    return Response.json(
      { error: "Add SUPABASE_SERVICE_ROLE_KEY before enabling Paystack webhooks." },
      { status: 500 }
    );
  }

  const paidAt = event.data.paid_at || new Date().toISOString();
  const { data: order, error } = await supabase
    .from("orders")
    .update({
      paid_at: paidAt,
      payment_channel: event.data.channel || "card",
      status: "paid",
      status_updated_at: paidAt,
      ...(typeof event.data.amount === "number" ? { total: fromKobo(event.data.amount) } : {}),
    })
    .eq("payment_reference", reference)
    .select("id,tracking_code")
    .maybeSingle();

  if (error) {
    console.error("Paystack webhook order update failed:", error);
    return Response.json({ error: "Unable to update order." }, { status: 500 });
  }

  return Response.json({
    orderId: order?.id || null,
    received: true,
    trackingCode: order?.tracking_code || null,
  });
}
