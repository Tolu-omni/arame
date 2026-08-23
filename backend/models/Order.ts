import type { CartItemModel } from "@/backend/models/Cart";

export type OrderModel = {
  id: string;
  user_id: string;
  status: "pending" | "paid" | "fulfilled" | "cancelled";
  items: CartItemModel[];
  total: number;
  created_at: string;
};
