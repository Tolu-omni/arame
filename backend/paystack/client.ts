import { createHmac, timingSafeEqual } from "crypto";

const PAYSTACK_BASE_URL = "https://api.paystack.co";

export type PaystackAuthorization = {
  authorization_code?: string;
  last4?: string;
  exp_month?: string;
  exp_year?: string;
  card_type?: string;
  bank?: string;
  brand?: string;
  reusable?: boolean;
};

export type PaystackCustomer = {
  email?: string;
  customer_code?: string;
};

export type PaystackTransactionData = {
  access_code?: string;
  amount: number;
  authorization?: PaystackAuthorization;
  authorization_url?: string;
  channel?: string;
  currency?: string;
  customer?: PaystackCustomer;
  gateway_response?: string;
  paid_at?: string;
  paused?: boolean;
  reference: string;
  status: string;
};

export type PaystackInitializationData = {
  access_code: string;
  authorization_url: string;
  reference: string;
};

type PaystackResponse<T> = {
  status: boolean;
  message: string;
  data: T;
};

export function getPaystackSecretKey() {
  return process.env.PAYSTACK_SECRET_KEY || "";
}

export function getPaystackPublicKey() {
  return process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || "";
}

export function isPaystackTestMode() {
  const secretKey = getPaystackSecretKey();
  const publicKey = getPaystackPublicKey();
  return secretKey.startsWith("sk_test_") || publicKey.startsWith("pk_test_");
}

export function verifyPaystackWebhookSignature(rawBody: string, signature: string | null) {
  const secretKey = getPaystackSecretKey();

  if (!secretKey || !signature) {
    return false;
  }

  const expected = createHmac("sha512", secretKey).update(rawBody).digest("hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  const actualBuffer = Buffer.from(signature, "hex");

  if (expectedBuffer.length !== actualBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, actualBuffer);
}

export function toKobo(amount: number) {
  return Math.round(Number(amount || 0) * 100);
}

export function fromKobo(amount: number) {
  return Number(amount || 0) / 100;
}

export function generatePaystackReference(prefix: string) {
  const safePrefix = prefix.replace(/[^a-zA-Z0-9.-=]/g, "").slice(0, 12) || "ARAME";
  return `${safePrefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

async function paystackFetch<T>(path: string, init?: RequestInit) {
  const secretKey = getPaystackSecretKey();

  if (!secretKey) {
    throw new Error("Add PAYSTACK_SECRET_KEY to .env.local first.");
  }

  const response = await fetch(`${PAYSTACK_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  const payload = (await response.json()) as PaystackResponse<T>;

  if (!response.ok || !payload.status) {
    throw new Error(payload.message || "Paystack request failed.");
  }

  return payload.data;
}

export async function verifyPaystackTransaction(reference: string) {
  return paystackFetch<PaystackTransactionData>(
    `/transaction/verify/${encodeURIComponent(reference)}`,
    { method: "GET" }
  );
}

export async function initializePaystackTransaction({
  amount,
  callbackUrl,
  channels = ["card"],
  email,
  metadata,
  reference,
}: {
  amount: number;
  callbackUrl: string;
  channels?: string[];
  email: string;
  metadata?: Record<string, unknown>;
  reference: string;
}) {
  return paystackFetch<PaystackInitializationData>("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify({
      amount: String(toKobo(amount)),
      callback_url: callbackUrl,
      channels,
      currency: "NGN",
      email,
      metadata,
      reference,
    }),
  });
}

export async function chargePaystackAuthorization({
  amount,
  authorizationCode,
  callbackUrl,
  email,
  metadata,
  reference,
}: {
  amount: number;
  authorizationCode: string;
  callbackUrl?: string;
  email: string;
  metadata?: Record<string, unknown>;
  reference: string;
}) {
  return paystackFetch<PaystackTransactionData>("/transaction/charge_authorization", {
    method: "POST",
    body: JSON.stringify({
      amount: String(toKobo(amount)),
      authorization_code: authorizationCode,
      callback_url: callbackUrl,
      channels: ["card"],
      currency: "NGN",
      email,
      metadata,
      reference,
    }),
  });
}
