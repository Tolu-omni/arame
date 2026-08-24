"use client";

import { CartProvider } from "@/frontend/context/CartContext";
import { CurrencyProvider } from "@/frontend/context/CurrencyContext";
import { ToastProvider } from "@/frontend/context/ToastContext";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <CurrencyProvider>
        <CartProvider>{children}</CartProvider>
      </CurrencyProvider>
    </ToastProvider>
  );
}
