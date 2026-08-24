import { chargePaystackAuthorization, fromKobo, generatePaystackReference } from "@/backend/paystack/client";
import { getSupabaseServerClient } from "@/backend/supabase/server";
import {
  buildVerifiedOrderItems,
  getBearerToken,
  type CheckoutItemInput,
  type ShippingInput,
} from "@/backend/paystack/orders";
import { sendOrderReceiptEmail } from "@/backend/email/orders";

export const dynamic = "force-dynamic";

type ChargeBody = {
  items?: CheckoutItemInput[];
  paymentMethodId?: string;
  shipping?: ShippingInput;
};

type SavedPaymentMethod = {
  authorization_code: string | null;
  email: string | null;
  id: string;
  label: string | null;
  last4: string | null;
  method_type: string | null;
};

export async function POST(request: Request) {
  try {
    const accessToken = getBearerToken(request);

    if (!accessToken) {
      return Response.json({ error: "Please sign in before using a saved card." }, { status: 401 });
    }

    const supabase = getSupabaseServerClient(accessToken);

    if (!supabase) {
      return Response.json({ error: "Supabase is not configured." }, { status: 500 });
    }

    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      return Response.json({ error: "Please sign in before using a saved card." }, { status: 401 });
    }

    const body = (await request.json()) as ChargeBody;

    if (!body.paymentMethodId) {
      return Response.json({ error: "Choose a saved card first." }, { status: 400 });
    }

    const { data: paymentMethod, error: paymentMethodError } = await supabase
      .from("payment_methods")
      .select("id,label,method_type,last4,authorization_code,email")
      .eq("id", body.paymentMethodId)
      .eq("user_id", userData.user.id)
      .single();

    if (paymentMethodError) {
      throw paymentMethodError;
    }

    const savedCard = paymentMethod as SavedPaymentMethod;

    if (!savedCard.authorization_code) {
      return Response.json(
        { error: "This saved card is missing its Paystack authorization. Add it again." },
        { status: 400 }
      );
    }

    const { orderItems, total } = await buildVerifiedOrderItems(body.items ?? []);
    const email = savedCard.email || userData.user.email;

    if (!email) {
      return Response.json({ error: "Saved card email is missing." }, { status: 400 });
    }

    const charge = await chargePaystackAuthorization({
      amount: total,
      authorizationCode: savedCard.authorization_code,
      email,
      metadata: {
        payment_method_id: savedCard.id,
        purpose: "saved_card_checkout",
        shipping: body.shipping || null,
      },
      reference: generatePaystackReference("ARAME-SAVED"),
    });

    if (charge.status !== "success") {
      return Response.json(
        { error: charge.gateway_response || "Saved card charge was not successful." },
        { status: 400 }
      );
    }

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        items: orderItems,
        paid_at: charge.paid_at || new Date().toISOString(),
        payment_channel: charge.channel || "card",
        payment_provider: "paystack",
        payment_reference: charge.reference,
        shipping_address: body.shipping || null,
        status: "paid",
        status_updated_at: new Date().toISOString(),
        total: fromKobo(charge.amount),
        user_id: userData.user.id,
      })
      .select("id,items,payment_reference,shipping_address,total,tracking_code")
      .single();

    if (orderError) {
      throw orderError;
    }

    const emailResult = await sendOrderReceiptEmail({
      fallbackEmail: email,
      items: order.items,
      orderId: order.id,
      paymentReference: order.payment_reference,
      shipping: order.shipping_address,
      total: order.total,
      trackingCode: order.tracking_code,
    });

    if (!emailResult.sent) {
      console.warn("Saved-card receipt email was not sent:", emailResult.reason);
    }

    return Response.json({
      orderId: order.id,
      trackingCode: order.tracking_code,
      payment: {
        last4: savedCard.last4 || "",
        methodType: savedCard.method_type || "Card",
        reference: charge.reference,
      },
      total: fromKobo(charge.amount),
    });
  } catch (error) {
    console.error("Paystack saved-card charge failed:", error);

    return Response.json(
      { error: error instanceof Error ? error.message : "Unable to charge saved card." },
      { status: 500 }
    );
  }
}
