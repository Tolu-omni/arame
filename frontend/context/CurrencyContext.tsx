"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type StoreCurrency = "NGN" | "USD" | "GBP" | "EUR";

type CurrencyContextValue = {
  currency: StoreCurrency;
  setCurrency: (currency: StoreCurrency) => void;
  formatPrice: (priceInNgn: number | string) => string;
};

export const currencyOptions: { code: StoreCurrency; label: string }[] = [
  { code: "NGN", label: "NGN - Naira" },
  { code: "USD", label: "USD - Dollar" },
  { code: "GBP", label: "GBP - Pound" },
  { code: "EUR", label: "EUR - Euro" },
];

const currencyRates: Record<StoreCurrency, number> = {
  NGN: 1,
  USD: 0.00064,
  GBP: 0.00048,
  EUR: 0.00055,
};

const currencyLocales: Record<StoreCurrency, string> = {
  NGN: "en-NG",
  USD: "en-US",
  GBP: "en-GB",
  EUR: "en-IE",
};

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

function isStoreCurrency(value: string): value is StoreCurrency {
  return currencyOptions.some((option) => option.code === value);
}

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<StoreCurrency>("NGN");

  useEffect(() => {
    const savedCurrency = window.localStorage.getItem("arame:currency");
    if (savedCurrency && isStoreCurrency(savedCurrency)) {
      const frameId = window.requestAnimationFrame(() => {
        setCurrencyState(savedCurrency);
      });

      return () => window.cancelAnimationFrame(frameId);
    }

    return undefined;
  }, []);

  const setCurrency = useCallback((nextCurrency: StoreCurrency) => {
    setCurrencyState(nextCurrency);
    window.localStorage.setItem("arame:currency", nextCurrency);
  }, []);

  const value = useMemo<CurrencyContextValue>(
    () => ({
      currency,
      setCurrency,
      formatPrice: (priceInNgn) => {
        const amount = Number(priceInNgn || 0) * currencyRates[currency];

        return new Intl.NumberFormat(currencyLocales[currency], {
          currency,
          maximumFractionDigits: currency === "NGN" ? 2 : 2,
          minimumFractionDigits: currency === "NGN" ? 2 : 2,
          style: "currency",
        }).format(amount);
      },
    }),
    [currency, setCurrency]
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency() {
  const value = useContext(CurrencyContext);

  if (!value) {
    throw new Error("useCurrency must be used inside CurrencyProvider.");
  }

  return value;
}
