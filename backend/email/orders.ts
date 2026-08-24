import { getOrderStatusLabel } from "@/frontend/orders/tracking";
import { getSiteUrl, sendTransactionalEmail } from "@/backend/email/client";

type OrderEmailItem = {
  image?: string;
  name?: string;
  price?: number | string;
  quantity?: number | string;
  size?: string;
};

type OrderShipping = {
  address?: string;
  address_line_2?: string;
  city?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  postal_code?: string;
  state?: string;
} | null;

type OrderEmailPayload = {
  fallbackEmail?: string | null;
  items?: OrderEmailItem[] | null;
  orderId: string;
  paidAt?: string | null;
  paymentReference?: string | null;
  shipping?: OrderShipping;
  status?: string | null;
  total: number | string;
  trackingCode?: string | null;
};

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatNaira(value: number | string) {
  return new Intl.NumberFormat("en-NG", {
    currency: "NGN",
    minimumFractionDigits: 2,
    style: "currency",
  }).format(Number(value || 0));
}

function getCustomerEmail(shipping?: OrderShipping, fallbackEmail?: string | null) {
  return shipping?.email?.trim() || fallbackEmail?.trim() || "";
}

function getCustomerName(shipping?: OrderShipping) {
  const name = `${shipping?.first_name || ""} ${shipping?.last_name || ""}`.trim();
  return name || "there";
}

function buildTrackingUrl(orderId: string, trackingCode?: string | null) {
  const code = trackingCode?.trim();
  const suffix = code ? `?code=${encodeURIComponent(code)}` : "";

  return `${getSiteUrl()}/track/${encodeURIComponent(orderId)}${suffix}`;
}

function buildItemsHtml(items?: OrderEmailItem[] | null) {
  if (!items?.length) {
    return "<p>No item details were attached to this order.</p>";
  }

  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin-top:16px">
      <tbody>
        ${items
          .map((item) => {
            const quantity = Number(item.quantity || 0);
            const total = Number(item.price || 0) * quantity;

            return `
              <tr>
                <td style="border-bottom:1px solid #eadfd7;padding:12px 0">
                  <strong>${escapeHtml(item.name || "Arame product")}</strong>
                  <div style="color:#6b5a50;font-size:13px">Qty: ${escapeHtml(quantity)}${item.size ? ` | Size: ${escapeHtml(item.size)}` : ""}</div>
                </td>
                <td align="right" style="border-bottom:1px solid #eadfd7;padding:12px 0;white-space:nowrap">${escapeHtml(formatNaira(total))}</td>
              </tr>
            `;
          })
          .join("")}
      </tbody>
    </table>
  `;
}

function buildShell({
  body,
  heading,
  preheader,
}: {
  body: string;
  heading: string;
  preheader: string;
}) {
  return `
    <!doctype html>
    <html>
      <body style="margin:0;background:#f5f2ed;color:#241c18;font-family:Arial,Helvetica,sans-serif">
        <div style="display:none;max-height:0;overflow:hidden">${escapeHtml(preheader)}</div>
        <div style="max-width:680px;margin:0 auto;padding:32px 18px">
          <div style="background:#fffaf6;border:1px solid #dccfc5;padding:28px">
            <div style="font-family:Georgia,serif;font-size:28px;letter-spacing:.08em;margin-bottom:20px">ARAME</div>
            <h1 style="font-family:Georgia,serif;font-weight:400;font-size:32px;line-height:1.15;margin:0 0 18px">${escapeHtml(heading)}</h1>
            ${body}
            <p style="margin-top:28px;color:#6b5a50;font-size:13px;line-height:1.6">
              Need help? Reply to this email or contact aramesupport@gmail.com.
            </p>
          </div>
        </div>
      </body>
    </html>
  `;
}

export async function sendOrderReceiptEmail(payload: OrderEmailPayload) {
  const to = getCustomerEmail(payload.shipping, payload.fallbackEmail);

  if (!to) {
    return { reason: "No customer email on order.", sent: false };
  }

  const trackingUrl = buildTrackingUrl(payload.orderId, payload.trackingCode);
  const body = `
    <p style="font-size:16px;line-height:1.6;margin:0 0 16px">Hi ${escapeHtml(getCustomerName(payload.shipping))}, your payment is confirmed and your Arame order has been received.</p>
    <div style="background:#f7f1eb;border:1px solid #eadfd7;padding:16px;margin:20px 0">
      <div><strong>Tracking code:</strong> ${escapeHtml(payload.trackingCode || "Pending")}</div>
      <div><strong>Payment reference:</strong> ${escapeHtml(payload.paymentReference || "Paystack")}</div>
      <div><strong>Total:</strong> ${escapeHtml(formatNaira(payload.total))}</div>
    </div>
    ${buildItemsHtml(payload.items)}
    <p style="margin:24px 0 0">
      <a href="${escapeHtml(trackingUrl)}" style="display:inline-block;background:#97452f;color:#fff;text-decoration:none;padding:12px 18px">Track order</a>
    </p>
  `;

  return sendTransactionalEmail({
    html: buildShell({
      body,
      heading: "Your receipt is ready",
      preheader: "Your Arame order payment is confirmed.",
    }),
    subject: `Arame receipt ${payload.trackingCode || payload.orderId.slice(0, 8)}`,
    text: `Your Arame order is confirmed. Track it here: ${trackingUrl}`,
    to,
  });
}

export async function sendOrderStatusEmail(payload: OrderEmailPayload) {
  const to = getCustomerEmail(payload.shipping, payload.fallbackEmail);

  if (!to) {
    return { reason: "No customer email on order.", sent: false };
  }

  const statusLabel = getOrderStatusLabel(payload.status);
  const trackingUrl = buildTrackingUrl(payload.orderId, payload.trackingCode);
  const body = `
    <p style="font-size:16px;line-height:1.6;margin:0 0 16px">Hi ${escapeHtml(getCustomerName(payload.shipping))}, your order is now marked as <strong>${escapeHtml(statusLabel)}</strong>.</p>
    <div style="background:#f7f1eb;border:1px solid #eadfd7;padding:16px;margin:20px 0">
      <div><strong>Tracking code:</strong> ${escapeHtml(payload.trackingCode || "Pending")}</div>
      <div><strong>Total:</strong> ${escapeHtml(formatNaira(payload.total))}</div>
    </div>
    <p style="margin:24px 0 0">
      <a href="${escapeHtml(trackingUrl)}" style="display:inline-block;background:#97452f;color:#fff;text-decoration:none;padding:12px 18px">View tracking</a>
    </p>
  `;

  return sendTransactionalEmail({
    html: buildShell({
      body,
      heading: `Order ${statusLabel}`,
      preheader: `Your Arame order is now ${statusLabel.toLowerCase()}.`,
    }),
    subject: `Arame order update: ${statusLabel}`,
    text: `Your Arame order is now ${statusLabel}. Track it here: ${trackingUrl}`,
    to,
  });
}
