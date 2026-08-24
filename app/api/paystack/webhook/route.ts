import { fromKobo, verifyPaystackWebhookSignature } from "@/backend/paystack/client";
import { sendOrderReceiptEmail } from "@/backend/email/orders";
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
  const { data: currentOrder, error: currentError } = await supabase
    .from("orders")
    .select("id,status")
    .eq("payment_reference", reference)
    .maybeSingle();

  if (currentError) {
    console.error("Paystack webhook order lookup failed:", currentError);
    return Response.json({ error: "Unable to find order." }, { status: 500 });
  }

  const { data: order, error } = await supabase
    .from("orders")
    .update({
      paid_at: paidAt,
      payment_channel: event.data.channel || "card",
      payment_provider: "paystack",
      status: "paid",
      ...(typeof event.data.amount === "number" ? { total: fromKobo(event.data.amount) } : {}),
    })
    .eq("payment_reference", reference)
    .select("id,items,payment_reference,shipping_address,total,tracking_code")
    .maybeSingle();

  if (error) {
    console.error("Paystack webhook order update failed:", error);
    return Response.json({ error: "Unable to update order." }, { status: 500 });
  }

  if (order && currentOrder?.status !== "paid") {
    const emailResult = await sendOrderReceiptEmail({
      items: order.items,
      orderId: order.id,
      paymentReference: order.payment_reference,
      shipping: order.shipping_address,
      total: order.total,
      trackingCode: order.tracking_code,
    });

    if (!emailResult.sent) {
      console.warn("Webhook receipt email was not sent:", emailResult.reason);
    }
  }

  return Response.json({
    orderId: order?.id || null,
    received: true,
    trackingCode: order?.tracking_code || null,
  });
}
