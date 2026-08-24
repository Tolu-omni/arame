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
import { getSupabaseServerClient } from "@/backend/supabase/server";

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

async function getUserEmail(request: Request) {
  const accessToken = getBearerToken(request);

  if (!accessToken) {
    return "";
  }

  const supabase = getSupabaseServerClient(accessToken);

  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { data, error } = await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  return data.user?.email || "";
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as InitializeBody;
    const purpose = body.purpose || "checkout";

    if (purpose === "add_card") {
      const email = await getUserEmail(request);

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

    return Response.json({
      accessCode: transaction.access_code,
      authorizationUrl: transaction.authorization_url,
      reference: transaction.reference,
      testMode: isPaystackTestMode(),
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
