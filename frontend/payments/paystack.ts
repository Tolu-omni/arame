export type PaystackTransaction = {
  reference: string;
  status?: string;
  message?: string;
  trans?: string;
  transaction?: string;
  trxref?: string;
};

type PaystackPopupOptions = {
  key: string;
  email: string;
  amount: number;
  currency?: string;
  channels?: string[];
  metadata?: Record<string, unknown>;
  onSuccess: (transaction: PaystackTransaction) => void;
  onCancel: () => void;
  onError: (error: { message?: string }) => void;
};

type PaystackPopup = {
  newTransaction: (options: PaystackPopupOptions) => void;
};

type PaystackConstructor = new () => PaystackPopup;

declare global {
  interface Window {
    PaystackPop?: PaystackConstructor;
    Paystack?: PaystackConstructor;
  }
}

let paystackScriptPromise: Promise<void> | null = null;

function loadPaystackInline() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Paystack can only be loaded in the browser."));
  }

  if (window.PaystackPop || window.Paystack) {
    return Promise.resolve();
  }

  if (paystackScriptPromise) {
    return paystackScriptPromise;
  }

  paystackScriptPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[src="https://js.paystack.co/v2/inline.js"]'
    );

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener(
        "error",
        () => reject(new Error("Unable to load Paystack checkout.")),
        { once: true }
      );
      return;
    }

    const script = document.createElement("script");
    script.src = "https://js.paystack.co/v2/inline.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Unable to load Paystack checkout."));
    document.head.appendChild(script);
  });

  return paystackScriptPromise;
}

export async function openPaystackTransaction(
  options: Omit<PaystackPopupOptions, "onSuccess" | "onCancel" | "onError">
) {
  await loadPaystackInline();

  const PaystackPopup = window.PaystackPop || window.Paystack;

  if (!PaystackPopup) {
    throw new Error("Paystack checkout is not available.");
  }

  return new Promise<PaystackTransaction>((resolve, reject) => {
    const popup = new PaystackPopup();

    popup.newTransaction({
      ...options,
      onSuccess: (transaction) => resolve(transaction),
      onCancel: () => reject(new Error("Payment was cancelled.")),
      onError: (error) => reject(new Error(error.message || "Paystack payment failed.")),
    });
  });
}
