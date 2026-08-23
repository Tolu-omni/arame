"use client";

import { CartProvider } from "@/frontend/context/CartContext";
import { ToastProvider } from "@/frontend/context/ToastContext";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <CartProvider>{children}</CartProvider>
    </ToastProvider>
  );
}
