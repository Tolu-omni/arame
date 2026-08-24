import type { CartItemModel } from "@/backend/models/Cart";

export type OrderModel = {
  id: string;
  user_id: string;
  status: "pending" | "paid" | "processing" | "packed" | "shipped" | "delivered" | "fulfilled" | "cancelled";
  tracking_code?: string | null;
  items: CartItemModel[];
  shipping_address?: Record<string, unknown> | null;
  status_updated_at?: string | null;
  total: number;
  created_at: string;
};
