import { getSupabaseServerClient } from "@/backend/supabase/server";
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
  type ShippingInput,
} from "@/backend/paystack/orders";

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

function getCardType(brand?: string, cardType?: string) {
  const value = (brand || cardType || "Card").trim();
  return value ? value.charAt(0).toUpperCase() + value.slice(1).toLowerCase() : "Card";
}

async function getAuthenticatedUser(request: Request) {
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

    const { supabase, user } = await getAuthenticatedUser(request);
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

    const { orderItems, total } = await buildVerifiedOrderItems(body.items ?? []);
    const expectedAmount = toKobo(total);

    if (paystackTransaction.amount !== expectedAmount) {
      return Response.json(
        { error: "Payment amount does not match the current cart total." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("orders")
      .insert({
        items: orderItems,
        paid_at: paystackTransaction.paid_at || new Date().toISOString(),
        payment_channel: paystackTransaction.channel || "card",
        payment_provider: "paystack",
        payment_reference: paystackTransaction.reference,
        status: "paid",
        total: fromKobo(paystackTransaction.amount),
        user_id: user?.id || null,
      })
      .select("id")
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

    return Response.json({
      orderId: data.id,
      payment: {
        last4: authorization?.last4 || "",
        methodType: getCardType(authorization?.brand, authorization?.card_type),
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
