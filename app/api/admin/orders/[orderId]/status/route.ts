import { isAdminEmail } from "@/backend/admin/access";
import { sendOrderStatusEmail } from "@/backend/email/orders";
import { getBearerToken } from "@/backend/paystack/orders";
import { getSupabaseServerClient, getSupabaseServiceRoleClient } from "@/backend/supabase/server";
import { normalizeOrderStatus, type OrderStatus } from "@/frontend/orders/tracking";

export const dynamic = "force-dynamic";

type Body = {
  status?: string;
};

const allowedStatuses: OrderStatus[] = [
  "pending",
  "paid",
  "processing",
  "packed",
  "shipped",
  "delivered",
  "cancelled",
];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const accessToken = getBearerToken(request);

    if (!accessToken) {
      return Response.json({ error: "Please sign in as an admin." }, { status: 401 });
    }

    const supabase = getSupabaseServerClient(accessToken);

    if (!supabase) {
      return Response.json({ error: "Supabase is not configured." }, { status: 500 });
    }

    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !isAdminEmail(userData.user?.email)) {
      return Response.json({ error: "Admin access is required." }, { status: 403 });
    }

    const { orderId } = await params;
    const body = (await request.json()) as Body;
    const status = normalizeOrderStatus(body.status);

    if (!allowedStatuses.includes(status)) {
      return Response.json({ error: "Unsupported order status." }, { status: 400 });
    }

    const adminSupabase = getSupabaseServiceRoleClient();

    if (!adminSupabase) {
      return Response.json(
        { error: "Add SUPABASE_SERVICE_ROLE_KEY before updating order status." },
        { status: 500 }
      );
    }

    const { data: currentOrder, error: currentError } = await adminSupabase
      .from("orders")
      .select("status")
      .eq("id", orderId)
      .single();

    if (currentError) {
      throw currentError;
    }

    const { data: order, error } = await adminSupabase
      .from("orders")
      .update({
        status,
      })
      .eq("id", orderId)
      .select("id,items,payment_reference,shipping_address,status,total,tracking_code")
      .single();

    if (error) {
      throw error;
    }

    if (normalizeOrderStatus(currentOrder.status) !== status) {
      const emailResult = await sendOrderStatusEmail({
        items: order.items,
        orderId: order.id,
        paymentReference: order.payment_reference,
        shipping: order.shipping_address,
        status: order.status,
        total: order.total,
        trackingCode: order.tracking_code,
      });

      if (!emailResult.sent) {
        console.warn("Order status email was not sent:", emailResult.reason);
      }
    }

    return Response.json({ order });
  } catch (error) {
    console.error("Admin order status update failed:", error);

    return Response.json(
      { error: error instanceof Error ? error.message : "Unable to update order status." },
      { status: 500 }
    );
  }
}
