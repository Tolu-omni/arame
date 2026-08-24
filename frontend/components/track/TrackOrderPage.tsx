"use client";

/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  PackageCheck,
  ReceiptText,
  RefreshCw,
  Truck,
  XCircle,
} from "lucide-react";
import { Header } from "@/frontend/components/shared/Header";
import { Footer } from "@/frontend/components/shared/Footer";
import { getSupabaseBrowserClient } from "@/frontend/supabase/browser";
import {
  ORDER_TRACKING_STEPS,
  getOrderStatusLabel,
  getOrderTrackingProgress,
  normalizeOrderStatus,
} from "@/frontend/orders/tracking";
import styles from "./track-order-page.module.css";

type OrderItem = {
  image: string;
  name: string;
  price: number | string;
  quantity: number | string;
  size: string;
};

type ShippingAddress = {
  first_name?: string;
  last_name?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  phone?: string;
};

type TrackingOrder = {
  id: string;
  created_at: string | null;
  items: OrderItem[] | null;
  paid_at: string | null;
  payment_channel: string | null;
  payment_provider: string | null;
  payment_reference: string | null;
  shipping_address: ShippingAddress | null;
  status: string | null;
  status_updated_at: string | null;
  total: number | string;
  tracking_code: string | null;
};

const orderSelect = [
  "id",
  "created_at",
  "items",
  "paid_at",
  "payment_channel",
  "payment_provider",
  "payment_reference",
  "shipping_address",
  "status",
  "status_updated_at",
  "total",
  "tracking_code",
].join(",");

const stepIcons = [ReceiptText, Clock3, PackageCheck, Truck, CheckCircle2];

function formatCurrency(value: number | string) {
  return `\u20A6${Number(value || 0).toFixed(2)}`;
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return "";
  }

  return new Date(value).toLocaleString("en-NG", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getShippingAddress(value: unknown): ShippingAddress | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as ShippingAddress;
}

function getTrackingOrder(value: unknown): TrackingOrder | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const row = value as TrackingOrder;

  return {
    ...row,
    shipping_address: getShippingAddress(row.shipping_address),
  };
}

function getCustomerName(shipping: ShippingAddress | null) {
  return [shipping?.first_name, shipping?.last_name].filter(Boolean).join(" ") || "Customer";
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return "Unable to load this order.";
}

export function TrackOrderPage({ orderId }: { orderId: string }) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const searchParams = useSearchParams();
  const trackingCode = searchParams.get("code")?.trim() || "";
  const [order, setOrder] = useState<TrackingOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [requiresSignIn, setRequiresSignIn] = useState(false);
  const [error, setError] = useState("");

  const loadOrder = useCallback(
    async (silent = false) => {
      if (!supabase) {
        setError("Supabase is not configured yet.");
        setLoading(false);
        return;
      }

      if (!silent) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      try {
        setError("");
        setRequiresSignIn(false);

        if (trackingCode) {
          const { data, error: rpcError } = await supabase
            .rpc("get_order_tracking", {
              p_order_id: orderId,
              p_tracking_code: trackingCode,
            })
            .maybeSingle();

          if (rpcError) {
            throw rpcError;
          }

          setOrder(getTrackingOrder(data));
          return;
        }

        const { data: sessionData } = await supabase.auth.getSession();

        if (!sessionData.session?.user) {
          setRequiresSignIn(true);
          setOrder(null);
          return;
        }

        const { data, error: orderError } = await supabase
          .from("orders")
          .select(orderSelect)
          .eq("id", orderId)
          .maybeSingle();

        if (orderError) {
          throw orderError;
        }

        setOrder(getTrackingOrder(data));
      } catch (loadError) {
        console.error("Order tracking load failed:", loadError);
        setOrder(null);
        setError(getErrorMessage(loadError));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [orderId, supabase, trackingCode]
  );

  useEffect(() => {
    void loadOrder();

    const interval = window.setInterval(() => {
      void loadOrder(true);
    }, 30000);

    return () => {
      window.clearInterval(interval);
    };
  }, [loadOrder]);

  const status = normalizeOrderStatus(order?.status);
  const statusLabel = getOrderStatusLabel(status);
  const progress = getOrderTrackingProgress(status);
  const shipping = order?.shipping_address ?? null;
  const customerName = getCustomerName(shipping);
  const shortOrderId = orderId.slice(0, 8).toUpperCase();
  const isCancelled = status === "cancelled";

  return (
    <div className={styles.trackPage}>
      <Header variant="shop" />

      <main className={styles.trackMain}>
        <Link href="/account?view=orders" className={styles.backLink}>
          <ArrowLeft size={16} /> Orders
        </Link>

        {loading ? (
          <section className={styles.centerPanel}>
            <div className={styles.spinner} />
            <p>Loading receipt...</p>
          </section>
        ) : requiresSignIn ? (
          <section className={styles.centerPanel}>
            <ReceiptText size={40} />
            <h1>Sign in to track this order</h1>
            <p>This order is connected to your Arame account.</p>
            <Link href="/account" className={styles.primaryButton}>
              Sign In
            </Link>
          </section>
        ) : error || !order ? (
          <section className={styles.centerPanel}>
            <XCircle size={42} />
            <h1>Receipt not found</h1>
            <p>{error || "Check the receipt link or tracking code."}</p>
            <Link href="/account?view=orders" className={styles.primaryButton}>
              View Orders
            </Link>
          </section>
        ) : (
          <>
            <section className={styles.heroPanel}>
              <div>
                <span className={styles.eyebrow}>Receipt {shortOrderId}</span>
                <h1>{statusLabel}</h1>
                <p>{customerName}, your order progress is ready below.</p>
              </div>

              <div className={styles.statusBox}>
                <span className={`${styles.statusBadge} ${styles[status]}`}>
                  {statusLabel}
                </span>
                <button className={styles.refreshButton} type="button" onClick={() => void loadOrder(true)}>
                  <RefreshCw size={16} className={refreshing ? styles.spinning : ""} />
                  Refresh
                </button>
              </div>
            </section>

            <section className={styles.trackingGrid}>
              <div className={styles.timelinePanel}>
                <div className={styles.panelHeader}>
                  <h2>Tracking</h2>
                  <span>{formatDateTime(order.status_updated_at || order.created_at)}</span>
                </div>

                <div className={styles.timeline}>
                  {ORDER_TRACKING_STEPS.map((step, index) => {
                    const Icon = stepIcons[index];
                    const isDone = !isCancelled && index < progress;
                    const isActive = !isCancelled && index === progress;

                    return (
                      <div
                        className={`${styles.timelineStep} ${
                          isDone ? styles.doneStep : isActive ? styles.activeStep : ""
                        }`}
                        key={step.key}
                      >
                        <div className={styles.stepIcon}>
                          <Icon size={18} />
                        </div>
                        <div>
                          <h3>{step.label}</h3>
                          <p>{step.detail}</p>
                          {index === 0 && <span>{formatDateTime(order.paid_at || order.created_at)}</span>}
                          {isActive && index > 0 && <span>{formatDateTime(order.status_updated_at)}</span>}
                        </div>
                      </div>
                    );
                  })}

                  {isCancelled && (
                    <div className={`${styles.timelineStep} ${styles.cancelStep}`}>
                      <div className={styles.stepIcon}>
                        <XCircle size={18} />
                      </div>
                      <div>
                        <h3>Order cancelled</h3>
                        <p>This order has been marked as cancelled.</p>
                        <span>{formatDateTime(order.status_updated_at || order.created_at)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <aside className={styles.receiptPanel}>
                <div className={styles.panelHeader}>
                  <h2>Receipt</h2>
                  <span>{order.tracking_code}</span>
                </div>

                <div className={styles.receiptRows}>
                  <div>
                    <span>Order ID</span>
                    <strong>{order.id}</strong>
                  </div>
                  <div>
                    <span>Total</span>
                    <strong>{formatCurrency(order.total)}</strong>
                  </div>
                  {order.payment_reference && (
                    <div>
                      <span>Reference</span>
                      <strong>{order.payment_reference}</strong>
                    </div>
                  )}
                  <div>
                    <span>Delivery</span>
                    <strong>
                      {shipping?.address ? (
                        <>
                          {shipping.address}
                          <br />
                          {[shipping.city, shipping.state].filter(Boolean).join(", ")}
                        </>
                      ) : (
                        "Address not saved"
                      )}
                    </strong>
                  </div>
                  {shipping?.phone && (
                    <div>
                      <span>Phone</span>
                      <strong>{shipping.phone}</strong>
                    </div>
                  )}
                </div>
              </aside>
            </section>

            <section className={styles.itemsPanel}>
              <div className={styles.panelHeader}>
                <h2>Items</h2>
                <span>{order.items?.length || 0} item(s)</span>
              </div>

              <div className={styles.itemsList}>
                {Array.isArray(order.items) &&
                  order.items.map((item, index) => (
                    <div className={styles.itemRow} key={`${item.name}-${item.size}-${index}`}>
                      <img src={item.image} alt={item.name} />
                      <div>
                        <h3>{item.name}</h3>
                        <p>Qty: {item.quantity} | Size: {item.size}</p>
                      </div>
                      <strong>{formatCurrency(Number(item.price) * Number(item.quantity))}</strong>
                    </div>
                  ))}
              </div>
            </section>
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
