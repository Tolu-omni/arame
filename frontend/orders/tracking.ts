export type OrderStatus =
  | "pending"
  | "paid"
  | "processing"
  | "packed"
  | "shipped"
  | "delivered"
  | "fulfilled"
  | "cancelled";

export const ADMIN_ORDER_STATUSES: OrderStatus[] = [
  "pending",
  "paid",
  "processing",
  "packed",
  "shipped",
  "delivered",
  "cancelled",
];

export const ORDER_TRACKING_STEPS = [
  {
    key: "paid",
    label: "Payment confirmed",
    detail: "Your order has been received and payment is confirmed.",
  },
  {
    key: "processing",
    label: "Preparing order",
    detail: "The Arame team is preparing your items.",
  },
  {
    key: "packed",
    label: "Packed",
    detail: "Your order has been packed for dispatch.",
  },
  {
    key: "shipped",
    label: "Out for delivery",
    detail: "Your order is marked as on the way.",
  },
  {
    key: "delivered",
    label: "Delivered",
    detail: "Your order is marked as delivered.",
  },
] as const;

const statusLabels: Record<OrderStatus, string> = {
  cancelled: "Cancelled",
  delivered: "Delivered",
  fulfilled: "Delivered",
  packed: "Packed",
  paid: "Paid",
  pending: "Pending",
  processing: "Processing",
  shipped: "Out for delivery",
};

const statusProgress: Record<OrderStatus, number> = {
  cancelled: -1,
  delivered: 4,
  fulfilled: 4,
  packed: 2,
  paid: 0,
  pending: 0,
  processing: 1,
  shipped: 3,
};

export function normalizeOrderStatus(status?: string | null): OrderStatus {
  const value = (status || "pending").toLowerCase();

  if (
    value === "cancelled" ||
    value === "delivered" ||
    value === "fulfilled" ||
    value === "packed" ||
    value === "paid" ||
    value === "pending" ||
    value === "processing" ||
    value === "shipped"
  ) {
    return value;
  }

  return "pending";
}

export function getOrderStatusLabel(status?: string | null) {
  return statusLabels[normalizeOrderStatus(status)];
}

export function getOrderTrackingProgress(status?: string | null) {
  return statusProgress[normalizeOrderStatus(status)];
}

export function getTrackingHref(orderId: string, trackingCode?: string | null) {
  const code = trackingCode?.trim();

  if (!code) {
    return `/track/${orderId}`;
  }

  return `/track/${orderId}?code=${encodeURIComponent(code)}`;
}
