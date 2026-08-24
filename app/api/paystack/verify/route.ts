import { getSupabaseServerClient, getSupabaseServiceRoleClient } from "@/backend/supabase/server";
import {
  fromKobo,
  isPaystackTestMode,
  toKobo,
  verifyPaystackTransaction,
} from "@/backend/paystack/client";
import {
  buildVerifiedOrderItems,
  getBearerToken,
  type CheckoutItemInput,
  type OrderItem,
  type ShippingInput,
} from "@/backend/paystack/orders";
import { sendOrderReceiptEmail } from "@/backend/email/orders";

export const dynamic = "force-dynamic";

type VerifyPurpose = "checkout" | "add_card";

type VerifyBody = {
  items?: CheckoutItemInput[];
  label?: string;
  purpose?: VerifyPurpose;
  reference?: string;
  saveCard?: boolean;
  shipping?: ShippingInput;
};

type ExistingOrder = {
  id: string;
  items: OrderItem[] | null;
  shipping_address: ShippingInput | null;
  status: string | null;
  total: number | string;
  tracking_code: string | null;
  user_id: string | null;
};

function getCardType(brand?: string, cardType?: string) {
  const value = (brand || cardType || "Card").trim();
  return value ? value.charAt(0).toUpperCase() + value.slice(1).toLowerCase() : "Card";
}

function getPaymentMethodType(channel?: string, brand?: string, cardType?: string) {
  if (channel === "bank_transfer" || channel === "transfer") {
    return "Bank transfer";
  }

  if (channel === "bank") {
    return "Bank";
  }

  return getCardType(brand, cardType);
}

async function getAuthenticatedUser(request: Request, requireUser = false) {
  const accessToken = getBearerToken(request);
  const supabase = getSupabaseServerClient(accessToken);

  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  if (!accessToken) {
    return { supabase, user: null };
  }

  const { data, error } = await supabase.auth.getUser();

  if (error) {
    if (!requireUser) {
      console.warn("Ignoring payment verification auth lookup failure:", error.message);
      return { supabase, user: null };
    }

    throw error;
  }

  return { supabase, user: data.user };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as VerifyBody;
    const reference = body.reference?.trim();
    const purpose = body.purpose || "checkout";

    if (!reference) {
      return Response.json({ error: "Payment reference is required." }, { status: 400 });
    }

    const paystackTransaction = await verifyPaystackTransaction(reference);

    if (paystackTransaction.status !== "success") {
      return Response.json(
        { error: paystackTransaction.gateway_response || "Payment was not successful." },
        { status: 400 }
      );
    }

    const { supabase, user } = await getAuthenticatedUser(request, purpose === "add_card");
    const authorization = paystackTransaction.authorization;

    if (purpose === "add_card") {
      if (!user) {
        return Response.json({ error: "Please sign in before saving a card." }, { status: 401 });
      }

      if (!authorization?.authorization_code || !authorization.reusable) {
        return Response.json(
          { error: "This Paystack card authorization cannot be reused." },
          { status: 400 }
        );
      }

      const payload = {
        authorization_code: authorization.authorization_code,
        bank: authorization.bank || null,
        email: paystackTransaction.customer?.email || user.email,
        exp_month: authorization.exp_month || null,
        exp_year: authorization.exp_year || null,
        label: body.label?.trim() || "Personal Card",
        last4: authorization.last4 || "",
        method_type: getCardType(authorization.brand, authorization.card_type),
        paystack_customer_code: paystackTransaction.customer?.customer_code || null,
        reusable: Boolean(authorization.reusable),
        user_id: user.id,
      };

      const { data, error } = await supabase
        .from("payment_methods")
        .insert(payload)
        .select("id,label,method_type,last4,created_at")
        .single();

      if (error) {
        throw error;
      }

      return Response.json({
        paymentMethod: data,
        reference: paystackTransaction.reference,
        testMode: isPaystackTestMode(),
      });
    }

    const orderSupabase = getSupabaseServiceRoleClient();

    if (!orderSupabase) {
      return Response.json(
        { error: "Add SUPABASE_SERVICE_ROLE_KEY before verifying Paystack checkout orders." },
        { status: 500 }
      );
    }

    const { data: existingOrder, error: existingOrderError } = await orderSupabase
      .from("orders")
      .select("id,items,shipping_address,status,total,tracking_code,user_id")
      .eq("payment_reference", paystackTransaction.reference)
      .maybeSingle();

    if (existingOrderError) {
      throw existingOrderError;
    }

    const persistedOrder = existingOrder as ExistingOrder | null;
    const verifiedItems = persistedOrder?.items?.length
      ? { orderItems: persistedOrder.items, total: Number(persistedOrder.total || 0) }
      : await buildVerifiedOrderItems(body.items ?? []);
    const { orderItems, total } = verifiedItems;
    const expectedAmount = toKobo(total);

    if (paystackTransaction.amount !== expectedAmount) {
      return Response.json(
        { error: "Payment amount does not match the current cart total." },
        { status: 400 }
      );
    }

    const orderPayload = {
      items: orderItems,
      paid_at: paystackTransaction.paid_at || new Date().toISOString(),
      payment_channel: paystackTransaction.channel || "card",
      payment_provider: "paystack",
      payment_reference: paystackTransaction.reference,
      shipping_address: body.shipping || persistedOrder?.shipping_address || null,
      status: "paid",
      total: fromKobo(paystackTransaction.amount),
      user_id: persistedOrder?.user_id || user?.id || null,
    };

    const orderQuery = persistedOrder
      ? orderSupabase.from("orders").update(orderPayload).eq("id", persistedOrder.id)
      : orderSupabase.from("orders").insert(orderPayload);

    const { data, error } = await orderQuery
      .select("id,items,payment_reference,shipping_address,total,tracking_code")
      .single();

    if (error) {
      throw error;
    }

    if (body.saveCard && user && authorization?.authorization_code && authorization.reusable) {
      await supabase.from("payment_methods").insert({
        authorization_code: authorization.authorization_code,
        bank: authorization.bank || null,
        email: paystackTransaction.customer?.email || user.email,
        exp_month: authorization.exp_month || null,
        exp_year: authorization.exp_year || null,
        label: "Checkout Card",
        last4: authorization.last4 || "",
        method_type: getCardType(authorization.brand, authorization.card_type),
        paystack_customer_code: paystackTransaction.customer?.customer_code || null,
        reusable: Boolean(authorization.reusable),
        user_id: user.id,
      });
    }

    if (persistedOrder?.status !== "paid") {
      const emailResult = await sendOrderReceiptEmail({
        fallbackEmail: paystackTransaction.customer?.email || user?.email,
        items: data.items,
        orderId: data.id,
        paymentReference: data.payment_reference,
        shipping: data.shipping_address,
        total: data.total,
        trackingCode: data.tracking_code,
      });

      if (!emailResult.sent) {
        console.warn("Order receipt email was not sent:", emailResult.reason);
      }
    }

    return Response.json({
      orderId: data.id,
      shipping: data.shipping_address,
      trackingCode: data.tracking_code,
      payment: {
        last4: authorization?.last4 || "",
        methodType: getPaymentMethodType(
          paystackTransaction.channel,
          authorization?.brand,
          authorization?.card_type
        ),
        reference: paystackTransaction.reference,
      },
      total: fromKobo(paystackTransaction.amount),
      testMode: isPaystackTestMode(),
    });
  } catch (error) {
    console.error("Paystack verification failed:", error);

    return Response.json(
      { error: error instanceof Error ? error.message : "Unable to verify payment." },
      { status: 500 }
    );
  }
}
