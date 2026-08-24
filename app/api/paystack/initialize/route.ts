import {
  generatePaystackReference,
  initializePaystackTransaction,
  isPaystackTestMode,
} from "@/backend/paystack/client";
import {
  buildVerifiedOrderItems,
  getBearerToken,
  type CheckoutItemInput,
  type ShippingInput,
} from "@/backend/paystack/orders";
import { getSiteUrl } from "@/backend/lib/site";
import { getSupabaseServerClient, getSupabaseServiceRoleClient } from "@/backend/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type InitializePurpose = "checkout" | "add_card";

type InitializeBody = {
  items?: CheckoutItemInput[];
  label?: string;
  purpose?: InitializePurpose;
  saveCard?: boolean;
  shipping?: ShippingInput;
};

async function getAuthenticatedContext(request: Request, requireUser = false) {
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
      console.warn("Ignoring checkout auth lookup failure:", error.message);
      return { supabase, user: null };
    }

    throw error;
  }

  return { supabase, user: data.user };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as InitializeBody;
    const purpose = body.purpose || "checkout";

    if (purpose === "add_card") {
      const { user } = await getAuthenticatedContext(request, true);
      const email = user?.email || "";

      if (!email) {
        return Response.json({ error: "Please sign in before saving a card." }, { status: 401 });
      }

      const reference = generatePaystackReference("ARAME-CARD");
      const callbackUrl = getSiteUrl("/account?payment=paystack-add-card", request);
      const transaction = await initializePaystackTransaction({
        amount: 50,
        callbackUrl,
        channels: ["card"],
        email,
        metadata: {
          cancel_action: getSiteUrl("/account", request),
          label: body.label?.trim() || "Personal Card",
          purpose,
        },
        reference,
      });

      return Response.json({
        accessCode: transaction.access_code,
        authorizationUrl: transaction.authorization_url,
        reference: transaction.reference,
        testMode: isPaystackTestMode(),
      });
    }

    const email = body.shipping?.email?.trim();

    if (!email) {
      return Response.json({ error: "Enter an email address before payment." }, { status: 400 });
    }

    const { orderItems, total } = await buildVerifiedOrderItems(body.items ?? []);
    const { user } = await getAuthenticatedContext(request);
    const orderSupabase = getSupabaseServiceRoleClient();

    if (!orderSupabase) {
      return Response.json(
        { error: "Add SUPABASE_SERVICE_ROLE_KEY before accepting Paystack checkout orders." },
        { status: 500 }
      );
    }

    const reference = generatePaystackReference("ARAME");
    const callbackUrl = getSiteUrl("/checkout?payment=paystack", request);
    const transaction = await initializePaystackTransaction({
      amount: total,
      callbackUrl,
      channels: ["card"],
      email,
      metadata: {
        cancel_action: getSiteUrl("/checkout", request),
        cart_items: orderItems.length,
        purpose,
        save_card: Boolean(body.saveCard),
      },
      reference,
    });
    const { data: order, error: orderError } = await orderSupabase
      .from("orders")
      .insert({
        items: orderItems,
        payment_provider: "paystack",
        payment_reference: reference,
        shipping_address: body.shipping || null,
        status: "pending",
        total,
        user_id: user?.id || null,
      })
      .select("id,tracking_code")
      .single();

    if (orderError) {
      throw orderError;
    }

    return Response.json({
      accessCode: transaction.access_code,
      authorizationUrl: transaction.authorization_url,
      orderId: order.id,
      reference: transaction.reference,
      testMode: isPaystackTestMode(),
      trackingCode: order.tracking_code,
      total,
    });
  } catch (error) {
    console.error("Paystack initialization failed:", error);

    return Response.json(
      { error: error instanceof Error ? error.message : "Unable to start Paystack payment." },
      { status: 500 }
    );
  }
}
