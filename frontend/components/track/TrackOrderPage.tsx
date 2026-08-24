"use client";

/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Bell,
  CheckCircle2,
  Clock3,
  Download,
  PackageCheck,
  ReceiptText,
  RefreshCw,
  Truck,
  X,
  XCircle,
} from "lucide-react";
import { Header } from "@/frontend/components/shared/Header";
import { Footer } from "@/frontend/components/shared/Footer";
import { useCurrency } from "@/frontend/context/CurrencyContext";
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
  address_line_2?: string;
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
  status_updated_at?: string | null;
  total: number | string;
  tracking_code: string | null;
  user_id?: string | null;
};

type AddressRow = {
  address_line_1?: string | null;
  address_line_2?: string | null;
  city?: string | null;
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  postal_code?: string | null;
  state?: string | null;
};

type OrderNotification = {
  created_at: string | null;
  id: string;
  message: string;
  read_at: string | null;
  status: string | null;
  title: string;
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
  "total",
  "tracking_code",
  "user_id",
].join(",");

const notificationSelect = "id,title,message,status,created_at,read_at";

const stepIcons = [ReceiptText, Clock3, PackageCheck, Truck, CheckCircle2];

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

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getShippingAddress(value: unknown): ShippingAddress | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as ShippingAddress;
}

function getShippingAddressFromSavedAddress(address?: AddressRow | null): ShippingAddress | null {
  if (!address) {
    return null;
  }

  return {
    address: address.address_line_1 || "",
    address_line_2: address.address_line_2 || "",
    city: address.city || "",
    email: address.email || "",
    first_name: address.first_name || "",
    last_name: address.last_name || "",
    phone: address.phone || "",
    postal_code: address.postal_code || "",
    state: address.state || "",
  };
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

function getDeliveryLines(shipping: ShippingAddress | null) {
  if (!shipping) {
    return [];
  }

  return [
    getCustomerName(shipping),
    shipping.address,
    shipping.address_line_2,
    [shipping.city, shipping.state, shipping.postal_code].filter(Boolean).join(", "),
    shipping.phone ? `Phone: ${shipping.phone}` : "",
    shipping.email ? `Email: ${shipping.email}` : "",
  ].filter((line): line is string => Boolean(line));
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
  const { formatPrice } = useCurrency();
  const lastAutoOpenedNotificationIdRef = useRef("");
  const trackingCode = searchParams.get("code")?.trim() || "";
  const [order, setOrder] = useState<TrackingOrder | null>(null);
  const [notifications, setNotifications] = useState<OrderNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [requiresSignIn, setRequiresSignIn] = useState(false);
  const [error, setError] = useState("");

  const loadDefaultShippingAddress = useCallback(async () => {
    if (!supabase) {
      return null;
    }

    const { data } = await supabase
      .from("addresses")
      .select("first_name,last_name,address_line_1,address_line_2,city,state,postal_code,phone")
      .eq("is_default", true)
      .maybeSingle();

    return getShippingAddressFromSavedAddress(data);
  }, [supabase]);

  const withShippingFallback = useCallback(
    async (nextOrder: TrackingOrder | null) => {
      if (!supabase || !nextOrder || nextOrder.shipping_address?.address) {
        return nextOrder;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const currentUserId = sessionData.session?.user.id;

      if (!currentUserId) {
        return nextOrder;
      }

      const { data: ownedOrder } = await supabase
        .from("orders")
        .select("id,user_id,shipping_address")
        .eq("id", orderId)
        .maybeSingle();

      const orderOwnerId =
        ownedOrder && typeof ownedOrder === "object" && "user_id" in ownedOrder
          ? String(ownedOrder.user_id || "")
          : "";

      if (orderOwnerId !== currentUserId) {
        return nextOrder;
      }

      const ownedShipping =
        ownedOrder && typeof ownedOrder === "object" && "shipping_address" in ownedOrder
          ? getShippingAddress(ownedOrder.shipping_address)
          : null;
      const fallbackShipping = ownedShipping?.address ? ownedShipping : await loadDefaultShippingAddress();

      return {
        ...nextOrder,
        shipping_address: fallbackShipping,
      };
    },
    [loadDefaultShippingAddress, orderId, supabase]
  );

  const loadNotifications = useCallback(async () => {
    if (!supabase) {
      return;
    }

    try {
      if (trackingCode) {
        const { data, error: notificationError } = await supabase.rpc(
          "get_order_tracking_notifications",
          {
            p_order_id: orderId,
            p_tracking_code: trackingCode,
          }
        );

        if (notificationError) {
          throw notificationError;
        }

        const nextNotifications = (data ?? []) as OrderNotification[];
        setNotifications(nextNotifications);
        if (nextNotifications.length > 0 && nextNotifications[0].id !== lastAutoOpenedNotificationIdRef.current) {
          lastAutoOpenedNotificationIdRef.current = nextNotifications[0].id;
          setNotificationsOpen(true);
        }
        return;
      }

      const { data, error: notificationError } = await supabase
        .from("order_notifications")
        .select(notificationSelect)
        .eq("order_id", orderId)
        .order("created_at", { ascending: false })
        .limit(12);

      if (notificationError) {
        throw notificationError;
      }

      const nextNotifications = (data ?? []) as OrderNotification[];
      setNotifications(nextNotifications);
      if (nextNotifications.length > 0 && nextNotifications[0].id !== lastAutoOpenedNotificationIdRef.current) {
        lastAutoOpenedNotificationIdRef.current = nextNotifications[0].id;
        setNotificationsOpen(true);
      }
    } catch (notificationError) {
      console.warn("Order notifications unavailable:", notificationError);
      setNotifications([]);
    }
  }, [orderId, supabase, trackingCode]);

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

          setOrder(await withShippingFallback(getTrackingOrder(data)));
          void loadNotifications();
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

        setOrder(await withShippingFallback(getTrackingOrder(data)));
        void loadNotifications();
      } catch (loadError) {
        console.error("Order tracking load failed:", loadError);
        setOrder(null);
        setError(getErrorMessage(loadError));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [loadNotifications, orderId, supabase, trackingCode, withShippingFallback]
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
  const deliveryLines = getDeliveryLines(shipping);
  const addressLines = shipping
    ? [shipping.address, shipping.address_line_2, [shipping.city, shipping.state, shipping.postal_code].filter(Boolean).join(", ")].filter(Boolean)
    : [];
  const shortOrderId = orderId.slice(0, 8).toUpperCase();
  const isCancelled = status === "cancelled";
  const notificationItems =
    notifications.length > 0
      ? notifications
      : [
          {
            created_at: order?.status_updated_at || order?.created_at || null,
            id: "current-status",
            message: `Your order is currently marked as ${statusLabel.toLowerCase()}.`,
            read_at: null,
            status,
            title: statusLabel,
          },
        ];

  const downloadReceipt = () => {
    if (!order) {
      return;
    }

    const itemRows = Array.isArray(order.items)
      ? order.items
          .map(
            (item) => `
              <tr>
                <td>${escapeHtml(item.name)}</td>
                <td>${escapeHtml(String(item.size || ""))}</td>
                <td>${escapeHtml(String(item.quantity || 0))}</td>
                <td>${escapeHtml(formatPrice(Number(item.price) * Number(item.quantity)))}</td>
              </tr>`
          )
          .join("")
      : "";

    const html = `<!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Arame Receipt ${escapeHtml(shortOrderId)}</title>
          <style>
            body { color: #241c18; font-family: Arial, sans-serif; margin: 40px; }
            h1 { font-family: Georgia, serif; font-weight: 400; margin: 0 0 6px; }
            .muted { color: #6f625b; }
            .box { border: 1px solid #d8cfc7; margin-top: 24px; padding: 20px; }
            .row { display: flex; justify-content: space-between; gap: 24px; margin: 10px 0; }
            table { border-collapse: collapse; margin-top: 20px; width: 100%; }
            th, td { border-bottom: 1px solid #e5ded7; padding: 12px; text-align: left; }
            th { background: #f5f2ed; font-size: 12px; letter-spacing: .08em; text-transform: uppercase; }
            .total { color: #97452f; font-size: 22px; font-weight: 700; }
          </style>
        </head>
        <body>
          <h1>Arame Receipt</h1>
          <div class="muted">Order ${escapeHtml(order.id)}</div>
          <div class="box">
            <div class="row"><span>Status</span><strong>${escapeHtml(statusLabel)}</strong></div>
            <div class="row"><span>Tracking Code</span><strong>${escapeHtml(order.tracking_code || "")}</strong></div>
            <div class="row"><span>Reference</span><strong>${escapeHtml(order.payment_reference || "")}</strong></div>
            <div class="row"><span>Date</span><strong>${escapeHtml(formatDateTime(order.created_at))}</strong></div>
            <div class="row"><span>Total</span><strong class="total">${escapeHtml(formatPrice(order.total))}</strong></div>
          </div>
          <div class="box">
            <strong>Delivery Details</strong>
            ${(deliveryLines.length > 0 ? deliveryLines : ["Address not saved"])
              .map((line) => `<div>${escapeHtml(line)}</div>`)
              .join("")}
          </div>
          <table>
            <thead><tr><th>Item</th><th>Size</th><th>Qty</th><th>Amount</th></tr></thead>
            <tbody>${itemRows}</tbody>
          </table>
        </body>
      </html>`;

    const url = window.URL.createObjectURL(new Blob([html], { type: "text/html" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `arame-receipt-${shortOrderId}.html`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

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
                <button className={styles.refreshButton} type="button" onClick={() => setNotificationsOpen(true)}>
                  <Bell size={16} />
                  Updates
                </button>
                <button className={styles.refreshButton} type="button" onClick={downloadReceipt}>
                  <Download size={16} />
                  Receipt
                </button>
                <button className={styles.refreshButton} type="button" onClick={() => void loadOrder(true)}>
                  <RefreshCw size={16} className={refreshing ? styles.spinning : ""} />
                  Refresh
                </button>
              </div>
            </section>

            {notificationsOpen && (
              <div className={styles.notificationPopover} role="dialog" aria-label="Order updates">
                <div className={styles.popoverHeader}>
                  <div className={styles.panelTitleWithIcon}>
                    <Bell size={18} />
                    <h2>Updates</h2>
                  </div>
                  <button type="button" onClick={() => setNotificationsOpen(false)} aria-label="Close updates">
                    <X size={16} />
                  </button>
                </div>

                <div className={styles.notificationList}>
                  {notificationItems.map((notification) => (
                    <div className={styles.notificationItem} key={notification.id}>
                      <div className={styles.notificationDot} />
                      <div>
                        <strong>{notification.title}</strong>
                        <p>{notification.message}</p>
                        <span>{formatDateTime(notification.created_at)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

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
                    <strong>{formatPrice(order.total)}</strong>
                  </div>
                  {order.payment_reference && (
                    <div>
                      <span>Reference</span>
                      <strong>{order.payment_reference}</strong>
                    </div>
                  )}
                  <div>
                    <span>Customer</span>
                    <strong>{customerName}</strong>
                  </div>
                  <div>
                    <span>Address</span>
                    <strong>
                      {addressLines.length > 0 ? (
                        <>
                          {addressLines.map((line) => (
                            <span className={styles.deliveryLine} key={line}>{line}</span>
                          ))}
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
                      <strong>{formatPrice(Number(item.price) * Number(item.quantity))}</strong>
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
