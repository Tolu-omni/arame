"use client";

import { createContext, useContext, useMemo, useState } from "react";
import type { CartItem } from "@/frontend/cart/types";

type CartContextValue = {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (productId: string | number, size: string) => void;
  clearCart: () => void;
  subtotal: number;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      addItem: (item) => {
        setItems((current) => {
          const existing = current.find(
            (cartItem) => cartItem.product_id === item.product_id && cartItem.size === item.size
          );

          if (!existing) {
            return [...current, item];
          }

          return current.map((cartItem) =>
            cartItem.product_id === item.product_id && cartItem.size === item.size
              ? { ...cartItem, quantity: cartItem.quantity + item.quantity }
              : cartItem
          );
        });
      },
      removeItem: (productId, size) => {
        setItems((current) =>
          current.filter((item) => item.product_id !== productId || item.size !== size)
        );
      },
      clearCart: () => setItems([]),
      subtotal: items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    }),
    [items]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const value = useContext(CartContext);

  if (!value) {
    throw new Error("useCart must be used inside CartProvider.");
  }

  return value;
}
