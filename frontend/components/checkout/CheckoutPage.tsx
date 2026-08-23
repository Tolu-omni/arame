"use client";

/* eslint-disable @next/next/no-img-element */

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { useCart } from "@/frontend/context/CartContext";
import { getSupabaseBrowserClient } from "@/frontend/supabase/browser";
import { Header } from "@/frontend/components/shared/Header";
import { Footer } from "@/frontend/components/shared/Footer";
import { openPaystackTransaction } from "@/frontend/payments/paystack";
import {
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  CreditCard,
} from "lucide-react";
import styles from "./checkout-page.module.css";

type CheckoutStep = "details" | "payment" | "processing" | "success";

type ShippingForm = {
  first_name: string;
  last_name: string;
  email: string;
  address: string;
  city: string;
  state: string;
  postal_code: string;
  phone: string;
};

type PaymentMethod = {
  id: string;
  label: string;
  last4: string;
  method_type: string;
};

const emptyShipping: ShippingForm = {
  first_name: "",
  last_name: "",
  email: "",
  address: "",
  city: "",
  state: "",
  postal_code: "",
  phone: "",
};

const nigerianStates = [
  "Abia", "Abuja FCT", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno",
  "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "Gombe", "Imo", "Jigawa",
  "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger",
  "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara"
];

export function CheckoutPage() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const { items, subtotal: cartSubtotal, clearCart } = useCart();

  const [step, setStep] = useState<CheckoutStep>("details");
  const [user, setUser] = useState<User | null>(null);
  const [shipping, setShipping] = useState<ShippingForm>(emptyShipping);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState("");
  const [savePaymentMethod, setSavePaymentMethod] = useState(false);

  // Post-payment state
  const [orderId, setOrderId] = useState("");
  const [receiptPaymentLabel, setReceiptPaymentLabel] = useState("Paystack card");
  const [receiptPaymentReference, setReceiptPaymentReference] = useState("");
  const [receiptTotal, setReceiptTotal] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const subtotal = step === "success" ? receiptTotal : cartSubtotal;

  // Load user default address if logged in
  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session?.user) {
        const currentUser = data.session.user;
        setUser(currentUser);

        // Prefill email
        setShipping(prev => ({ ...prev, email: currentUser.email || "" }));

        // Fetch user default address
        const { data: addresses } = await supabase
          .from("addresses")
          .select("*")
          .eq("user_id", currentUser.id)
          .eq("is_default", true)
          .maybeSingle();

        if (addresses) {
          setShipping(prev => ({
            ...prev,
            first_name: addresses.first_name || "",
            last_name: addresses.last_name || "",
            address: addresses.address_line_1 || "",
            city: addresses.city || "",
            state: addresses.state || "",
            postal_code: addresses.postal_code || "",
            phone: addresses.phone || "",
          }));
        }

        const { data: savedPayments } = await supabase
          .from("payment_methods")
          .select("id,label,method_type,last4")
          .eq("user_id", currentUser.id)
          .order("created_at", { ascending: false });

        if (savedPayments) {
          const methods = (savedPayments as PaymentMethod[]).map((method) => ({
            ...method,
            label: method.label || "Saved Card",
            last4: method.last4 || "0000",
            method_type: method.method_type || "Card",
          }));
          setPaymentMethods(methods);
          setSelectedPaymentMethodId(methods[0]?.id || "");
        }
      }
    });
  }, [supabase]);

  // If cart is empty and not in success state, redirect to shop
  useEffect(() => {
    if (items.length === 0 && step !== "success") {
      router.push("/shop");
    }
  }, [items, step, router]);

  const paystackPublicKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || "";
  const selectedPaymentMethod = useMemo(() => {
    return paymentMethods.find((method) => method.id === selectedPaymentMethodId) ?? null;
  }, [paymentMethods, selectedPaymentMethodId]);
  const cardBrand = selectedPaymentMethod?.method_type.toLowerCase() || "generic";
  const cardNumberDisplay = selectedPaymentMethod
    ? `\u2022\u2022\u2022\u2022 \u2022\u2022\u2022\u2022 \u2022\u2022\u2022\u2022 ${selectedPaymentMethod.last4}`
    : "PAYSTACK TEST CHECKOUT";
  const cardholderDisplay = `${shipping.first_name} ${shipping.last_name}`.trim() || "CUSTOMER";

  const handleShippingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep("payment");
  };

  const getSessionAccessToken = async () => {
    if (!supabase) {
      return "";
    }

    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || "";
  };

  const completeOrder = async ({
    orderId: nextOrderId,
    paymentLabel,
    paymentReference,
    total,
  }: {
    orderId: string;
    paymentLabel: string;
    paymentReference: string;
    total: number;
  }) => {
    setOrderId(nextOrderId);
    setReceiptPaymentLabel(paymentLabel);
    setReceiptPaymentReference(paymentReference);
    setReceiptTotal(total);
    clearCart();
    setStep("success");
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!paystackPublicKey) {
      setErrorMessage("Add NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY to .env.local first.");
      return;
    }

    if (!shipping.email) {
      setErrorMessage("Enter an email address before payment.");
      return;
    }

    setErrorMessage("");
    setStep("processing");

    try {
      const transaction = await openPaystackTransaction({
        amount: Math.round(cartSubtotal * 100),
        channels: ["card"],
        currency: "NGN",
        email: shipping.email,
        key: paystackPublicKey,
        metadata: {
          cart_items: items.length,
          purpose: "checkout",
          save_card: savePaymentMethod,
        },
      });
      const accessToken = await getSessionAccessToken();
      const response = await fetch("/api/paystack/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          items,
          purpose: "checkout",
          reference: transaction.reference,
          saveCard: savePaymentMethod,
          shipping,
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Payment verification failed.");
      }

      await completeOrder({
        orderId: result.orderId,
        paymentLabel: result.payment?.last4
          ? `${result.payment.methodType || "Card"} ending in ${result.payment.last4}`
          : "Paystack card",
        paymentReference: result.payment?.reference || transaction.reference,
        total: Number(result.total || cartSubtotal),
      });
    } catch (error) {
      console.error("Paystack checkout failed:", error);
      setErrorMessage(error instanceof Error ? error.message : "Unable to complete payment.");
      setStep("payment");
    }
  };

  const handleSavedCardPayment = async () => {
    if (!selectedPaymentMethodId) {
      setErrorMessage("Choose a saved card first.");
      return;
    }

    setErrorMessage("");
    setStep("processing");

    try {
      const accessToken = await getSessionAccessToken();
      const response = await fetch("/api/paystack/charge-saved-card", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          items,
          paymentMethodId: selectedPaymentMethodId,
          shipping,
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Saved card payment failed.");
      }

      await completeOrder({
        orderId: result.orderId,
        paymentLabel: result.payment?.last4
          ? `${result.payment.methodType || "Card"} ending in ${result.payment.last4}`
          : "Saved Paystack card",
        paymentReference: result.payment?.reference || "",
        total: Number(result.total || cartSubtotal),
      });
    } catch (error) {
      console.error("Saved card payment failed:", error);
      setErrorMessage(error instanceof Error ? error.message : "Unable to charge saved card.");
      setStep("payment");
    }
  };

  return (
    <div className={styles.checkoutPage}>
      <Header variant="shop" />

      <main className={styles.checkoutMain}>
        {/* Step Indicator */}
        {step !== "success" && (
          <div className={styles.stepProgress}>
            <span className={step === "details" ? styles.activeStep : ""}>Shipping</span>
            <ArrowRight size={14} className={styles.stepArrow} />
            <span className={step === "payment" ? styles.activeStep : ""}>Payment</span>
            <ArrowRight size={14} className={styles.stepArrow} />
            <span>Confirmation</span>
          </div>
        )}

        <div className={styles.checkoutContainer}>
          {/* LEFT SIDE: Active Checkout Phase */}
          {step !== "success" ? (
            <div className={styles.checkoutFormWrap}>
              {step === "details" && (
                <form onSubmit={handleShippingSubmit} className={styles.formSection}>
                  <h2>Shipping Information</h2>

                  <div className={styles.formGrid}>
                    <div className={styles.formGroup}>
                      <label htmlFor="firstName">First Name</label>
                      <input
                        id="firstName"
                        type="text"
                        required
                        value={shipping.first_name}
                        onChange={e => setShipping({ ...shipping, first_name: e.target.value })}
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label htmlFor="lastName">Last Name</label>
                      <input
                        id="lastName"
                        type="text"
                        required
                        value={shipping.last_name}
                        onChange={e => setShipping({ ...shipping, last_name: e.target.value })}
                      />
                    </div>
                    <div className={`${styles.formGroup} ${styles.wide}`}>
                      <label htmlFor="email">Email Address</label>
                      <input
                        id="email"
                        type="email"
                        required
                        value={shipping.email}
                        onChange={e => setShipping({ ...shipping, email: e.target.value })}
                      />
                    </div>
                    <div className={`${styles.formGroup} ${styles.wide}`}>
                      <label htmlFor="address">Delivery Address</label>
                      <input
                        id="address"
                        type="text"
                        required
                        value={shipping.address}
                        onChange={e => setShipping({ ...shipping, address: e.target.value })}
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label htmlFor="city">City</label>
                      <input
                        id="city"
                        type="text"
                        required
                        value={shipping.city}
                        onChange={e => setShipping({ ...shipping, city: e.target.value })}
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label htmlFor="state">State</label>
                      <select
                        id="state"
                        required
                        value={shipping.state}
                        onChange={e => setShipping({ ...shipping, state: e.target.value })}
                      >
                        <option value="">Select State</option>
                        {nigerianStates.map(state => (
                          <option key={state} value={state}>{state}</option>
                        ))}
                      </select>
                    </div>
                    <div className={styles.formGroup}>
                      <label htmlFor="postal">Postal / Zip Code</label>
                      <input
                        id="postal"
                        type="text"
                        value={shipping.postal_code}
                        onChange={e => setShipping({ ...shipping, postal_code: e.target.value })}
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label htmlFor="phone">Phone Number</label>
                      <input
                        id="phone"
                        type="tel"
                        required
                        value={shipping.phone}
                        onChange={e => setShipping({ ...shipping, phone: e.target.value })}
                      />
                    </div>
                  </div>

                  <button type="submit" className={styles.submitBtn}>
                    Proceed to Payment <ArrowRight size={16} />
                  </button>
                </form>
              )}

              {step === "payment" && (
                <div className={styles.paymentSection}>
                  <button type="button" className={styles.backBtn} onClick={() => setStep("details")}>
                    <ChevronLeft size={16} /> Edit shipping address
                  </button>

                  <h2>Payment Details</h2>

                  {/* PREMIUM VIRTUAL CARD PREVIEW */}
                  <div className={styles.cardPreviewContainer}>
                    <div className={styles.cardInner}>
                      {/* Front Side */}
                      <div className={`${styles.cardSide} ${styles.cardFront}`}>
                        <div className={styles.cardGlass} />
                        <div className={styles.cardHeader}>
                          <span className={styles.cardBrandName}>ARAME</span>
                          <span className={`${styles.cardLogo} ${styles[cardBrand]}`} />
                        </div>
                        <div className={styles.cardChip} />
                        <div className={styles.cardNumberDisplay}>
                          {cardNumberDisplay}
                        </div>
                        <div className={styles.cardFooter}>
                          <div>
                            <span className={styles.cardLabel}>CARDHOLDER</span>
                            <span className={styles.cardVal}>{cardholderDisplay.toUpperCase()}</span>
                          </div>
                          <div>
                            <span className={styles.cardLabel}>POWERED BY</span>
                            <span className={styles.cardVal}>PAYSTACK</span>
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>

                  {errorMessage && <span className={styles.errorText}>{errorMessage}</span>}

                  {paymentMethods.length > 0 && (
                    <div className={styles.savedPaymentList}>
                      {paymentMethods.map((method) => (
                        <label
                          className={`${styles.savedPaymentOption} ${
                            selectedPaymentMethodId === method.id ? styles.selectedPaymentOption : ""
                          }`}
                          key={method.id}
                        >
                          <input
                            type="radio"
                            name="savedPayment"
                            checked={selectedPaymentMethodId === method.id}
                            onChange={() => setSelectedPaymentMethodId(method.id)}
                          />
                          <CreditCard size={18} />
                          <span>
                            <strong>{method.label || method.method_type}</strong>
                            <small>{method.method_type} ending in {method.last4}</small>
                          </span>
                        </label>
                      ))}

                      <button type="button" className={styles.submitBtn} onClick={handleSavedCardPayment}>
                        Pay with Saved Card {`\u20A6${subtotal.toFixed(2)}`}
                      </button>
                    </div>
                  )}

                  <form onSubmit={handlePaymentSubmit} className={styles.paymentForm}>

                    <div className={styles.secureNotice}>
                      <ShieldCheck size={18} className={styles.secureIcon} />
                      <span>Card details open inside Paystack test checkout. Arame stores only verified payment references and safe card metadata.</span>
                    </div>

                    {user && (
                      <label className={styles.saveCardOption}>
                        <input
                          type="checkbox"
                          checked={savePaymentMethod}
                          onChange={(event) => setSavePaymentMethod(event.target.checked)}
                        />
                        <span>Save this card after Paystack authorization</span>
                      </label>
                    )}

                    <button type="submit" className={styles.submitBtn}>
                      Pay with New Card {`\u20A6${subtotal.toFixed(2)}`}
                    </button>
                  </form>
                </div>
              )}

            </div>
          ) : (
            /* SUCCESS ORDER RECEIPT */
            <div className={styles.successWrapper}>
              <div className={styles.successBadge}>
                <CheckCircle2 size={64} className={styles.badgeIcon} />
                <h1>Order Placed Successfully!</h1>
                <p>Thank you for shopping with Arame. Your payment was verified.</p>
                {errorMessage && <p className={styles.errorText}>{errorMessage}</p>}
              </div>

              <div className={styles.receipt}>
                <div className={styles.receiptHeader}>
                  <h3>TRANSACTION RECEIPT</h3>
                  <p>Order ID: <strong>{orderId}</strong></p>
                  <p>Date: {new Date().toLocaleDateString()}</p>
                </div>

                <div className={styles.receiptDetails}>
                  <div className={styles.receiptRow}>
                    <span>Paid With:</span>
                    <strong>{receiptPaymentLabel}</strong>
                  </div>
                  {receiptPaymentReference && (
                    <div className={styles.receiptRow}>
                      <span>Reference:</span>
                      <strong>{receiptPaymentReference}</strong>
                    </div>
                  )}
                  <div className={styles.receiptRow}>
                    <span>Mode:</span>
                    <strong>Paystack Test</strong>
                  </div>
                  <div className={styles.receiptRow}>
                    <span>Delivered To:</span>
                    <strong className={styles.deliverTo}>
                      {shipping.first_name} {shipping.last_name}<br/>
                      {shipping.address}, {shipping.city}<br/>
                      {shipping.state}, Nigeria
                    </strong>
                  </div>

                  <div className={styles.receiptDivider} />

                  <div className={styles.receiptTotal}>
                    <span>Total Charged:</span>
                    <strong>₦{(subtotal).toFixed(2)}</strong>
                  </div>
                </div>
              </div>

              <div className={styles.successActions}>
                <Link href="/shop" className={`${styles.successBtn} ${styles.primary}`}>
                  Continue Shopping
                </Link>
                <Link href="/account?view=orders" className={styles.successBtn}>
                  View Order Status
                </Link>
              </div>
            </div>
          )}

          {/* RIGHT SIDE: Order Cart Sticky Summary */}
          {step !== "success" && (
            <aside className={styles.checkoutSummary}>
              <div className={styles.summaryCard}>
                <h3>Order Summary</h3>

                <div className={styles.summaryItems}>
                  {items.map(item => (
                    <div key={`${item.product_id}-${item.size}`} className={styles.summaryItem}>
                      <img src={item.image} alt={item.name} />
                      <div className={styles.summaryItemInfo}>
                        <h4>{item.name}</h4>
                        <span>Qty: {item.quantity} | {item.size}</span>
                      </div>
                      <span className={styles.summaryItemPrice}>
                        ₦{(item.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className={styles.summaryTotalSection}>
                  <div className={styles.summaryRow}>
                    <span>Subtotal</span>
                    <span>₦{subtotal.toFixed(2)}</span>
                  </div>
                  <div className={styles.summaryRow}>
                    <span>Shipping</span>
                    <span className={styles.freeText}>Free</span>
                  </div>
                  <div className={styles.summaryDivider} />
                  <div className={`${styles.summaryRow} ${styles.totalRow}`}>
                    <span>Grand Total</span>
                    <strong>₦{subtotal.toFixed(2)}</strong>
                  </div>
                </div>
              </div>
            </aside>
          )}
        </div>
      </main>

      {/* OVERLAY LOADER FOR PAYMENT STAGE TRANSITIONS */}
      {step === "processing" && (
        <div className={styles.processingOverlay}>
          <div className={styles.spinnerWrap}>
            <div className={styles.spinner} />
            <p>Processing transaction securely...</p>
            <span>Do not refresh or close this tab</span>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
