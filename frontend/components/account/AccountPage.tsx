"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { Header } from "@/frontend/components/shared/Header";
import { Footer } from "@/frontend/components/shared/Footer";
import {
  clearSupabaseAuthRedirectFromUrl,
  getAuthRedirectUrl,
  getSupabaseBrowserClient,
} from "@/frontend/supabase/browser";
import { useCurrency } from "@/frontend/context/CurrencyContext";
import { getOrderStatusLabel, getTrackingHref } from "@/frontend/orders/tracking";
import styles from "./account-page.module.css";

type AuthMode = "login" | "signup";
type AccountTab = "account" | "addresses" | "wallet";

type ProfileForm = {
  display_name: string;
  title: string;
  first_name: string;
  last_name: string;
  phone: string;
  avatar_url: string;
};

type AddressForm = {
  id?: string;
  first_name: string;
  last_name: string;
  company: string;
  address_line_1: string;
  address_line_2: string;
  city: string;
  country: string;
  state: string;
  postal_code: string;
  phone: string;
  is_default: boolean;
};

type PaymentForm = {
  id?: string;
  label: string;
  method_type: string;
  last4: string;
  created_at?: string;
};

type OrderItem = {
  image: string;
  name: string;
  price: number | string;
  quantity: number | string;
  size: string;
};

type OrderRow = {
  id: string;
  created_at: string;
  items: OrderItem[] | null;
  status: string | null;
  tracking_code?: string | null;
  total: number | string;
};

type PendingCardAuthorization = {
  createdAt: number;
  label: string;
  reference: string;
};

const emptyProfile: ProfileForm = {
  display_name: "",
  title: "",
  first_name: "",
  last_name: "",
  phone: "",
  avatar_url: "",
};

const emptyAddress: AddressForm = {
  first_name: "",
  last_name: "",
  company: "",
  address_line_1: "",
  address_line_2: "",
  city: "",
  country: "Nigeria",
  state: "",
  postal_code: "",
  phone: "",
  is_default: true,
};

const emptyPayment: PaymentForm = {
  label: "",
  method_type: "Card",
  last4: "",
};

const cardAuthorizationStorageKey = "arame:paystack:add-card";
const isPaystackPublicTestMode = (process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || "").startsWith("pk_test_");
const paystackTestCardHint =
  "Test mode: use Paystack card 4084 0840 8408 4081, any future expiry, and CVV 408.";

function getCardAuthorizationFailureMessage(message: string, testMode?: boolean) {
  const baseMessage =
    message || "Card authorization was declined, so the card could not be saved.";

  if (testMode || isPaystackPublicTestMode) {
    return `${baseMessage} ${paystackTestCardHint}`;
  }

  return `${baseMessage} Try another card or ask your bank to allow online card authorization.`;
}

function getPaystackCardReturn() {
  if (typeof window === "undefined") {
    return null;
  }

  const params = new URLSearchParams(window.location.search);
  const reference = params.get("reference") || params.get("trxref") || "";
  const payment = params.get("payment") || "";

  if (payment !== "paystack-add-card" || !reference) {
    return null;
  }

  return { reference };
}

function readPendingCardAuthorization() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const pending = window.sessionStorage.getItem(cardAuthorizationStorageKey);
    return pending ? (JSON.parse(pending) as PendingCardAuthorization) : null;
  } catch {
    return null;
  }
}

const states = [
  "Abia",
  "Abuja Federal Capital Territory",
  "Adamawa",
  "Akwa Ibom",
  "Anambra",
  "Bauchi",
  "Bayelsa",
  "Benue",
  "Borno",
  "Cross River",
  "Delta",
  "Ebonyi",
  "Edo",
  "Ekiti",
  "Enugu",
  "Gombe",
  "Imo",
  "Jigawa",
  "Kaduna",
  "Kano",
  "Katsina",
  "Kebbi",
  "Kogi",
  "Kwara",
  "Lagos",
  "Nasarawa",
  "Niger",
  "Ogun",
  "Ondo",
  "Osun",
  "Oyo",
  "Plateau",
  "Rivers",
  "Sokoto",
  "Taraba",
  "Yobe",
  "Zamfara",
];

export function AccountPage() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const { formatPrice } = useCurrency();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [tab, setTab] = useState<AccountTab>("account");
  const [profile, setProfile] = useState<ProfileForm>(emptyProfile);
  const [savedProfile, setSavedProfile] = useState<ProfileForm>(emptyProfile);
  const [addresses, setAddresses] = useState<AddressForm[]>([]);
  const [payments, setPayments] = useState<PaymentForm[]>([]);
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [addressForm, setAddressForm] = useState<AddressForm>(emptyAddress);
  const [paymentForm, setPaymentForm] = useState<PaymentForm>(emptyPayment);
  const [savingPayment, setSavingPayment] = useState(false);
  const loggedSignInEventRef = useRef<string | null>(null);
  const handledCardAuthorizationRef = useRef<string | null>(null);

  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [dbError, setDbError] = useState("");

  const configured = Boolean(supabase);
  const showOrders = searchParams.get("view") === "orders";

  useEffect(() => {
    if (!supabase) return;

    let cancelled = false;

    supabase.auth.getSession().then(({ data }) => {
      clearSupabaseAuthRedirectFromUrl();

      if (!cancelled) {
        setUser(data.session?.user ?? null);
      }
    });

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN") {
        clearSupabaseAuthRedirectFromUrl();
      }

      setUser(session?.user ?? null);

      if (event === "SIGNED_IN" && session?.user) {
        const eventKey = `${session.user.id}:${session.access_token}`;

        if (loggedSignInEventRef.current !== eventKey) {
          loggedSignInEventRef.current = eventKey;

          void supabase.from("sign_in_events").insert({
            user_id: session.user.id,
            email: session.user.email,
            event_type: "sign_in",
          });
        }
      }
    });

    return () => {
      cancelled = true;
      data.subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (!supabase || !user) return;

    let cancelled = false;
    const client = supabase;
    const currentUser = user;

    async function loadAccount() {
      setLoadingOrders(true);
      setDbError("");
      const [{ data: profileData }, { data: addressData }, { data: paymentData }] = await Promise.all([
        client.from("profiles").select("*").eq("id", currentUser.id).maybeSingle(),
        client.from("addresses").select("*").eq("user_id", currentUser.id).order("created_at", { ascending: false }),
        client
          .from("payment_methods")
          .select("id,label,method_type,last4,created_at")
          .eq("user_id", currentUser.id)
          .order("created_at", { ascending: false }),
      ]);

      let orderData: OrderRow[] = [];
      try {
        const { data, error } = await client
          .from("orders")
          .select("*")
          .eq("user_id", currentUser.id)
          .order("created_at", { ascending: false });

        if (error) {
          console.warn("Orders fetch error:", error);
          if (error.message.includes("relation") && error.message.includes("does not exist")) {
            setDbError("The 'orders' table was not found in your Supabase database. Please run the SQL schema in your Supabase dashboard.");
          } else {
            setDbError(`Error loading orders: ${error.message}`);
          }
        } else if (data) {
          orderData = data as OrderRow[];
        }
      } catch (error) {
        console.error("Unexpected error fetching orders:", error);
        setDbError("An unexpected error occurred while loading orders.");
      }

      if (cancelled) return;

      const nextProfile = {
        ...emptyProfile,
        display_name: profileData?.display_name ?? currentUser.email?.split("@")[0] ?? "",
        title: profileData?.title ?? "",
        first_name: profileData?.first_name ?? "",
        last_name: profileData?.last_name ?? "",
        phone: profileData?.phone ?? "",
        avatar_url: profileData?.avatar_url ?? "",
      };

      setProfile(nextProfile);
      setSavedProfile(nextProfile);
      setAddresses((addressData ?? []) as AddressForm[]);
      setPayments(
        ((paymentData ?? []) as PaymentForm[]).map((payment) => ({
          ...payment,
          label: payment.label || "Saved Card",
          last4: payment.last4 || "0000",
          method_type: payment.method_type || "Card",
        }))
      );
      setOrders(orderData);
      setLoadingOrders(false);
    }

    loadAccount();

    return () => {
      cancelled = true;
    };
  }, [supabase, user]);

  useEffect(() => {
    const paystackReturn = getPaystackCardReturn();

    if (
      !paystackReturn ||
      !supabase ||
      !user ||
      handledCardAuthorizationRef.current === paystackReturn.reference
    ) {
      return;
    }

    const returnReference = paystackReturn.reference;
    handledCardAuthorizationRef.current = returnReference;
    const client = supabase;
    setSavingPayment(true);
    setMessage("Completing secure card authorization...");

    const pending = readPendingCardAuthorization();

    if (!pending) {
      setMessage("Card authorization returned, but the saved card details expired. Please try again.");
      setSavingPayment(false);
      return;
    }

    if (pending.reference !== returnReference) {
      setMessage("Card authorization reference does not match this session.");
      setSavingPayment(false);
      return;
    }

    const pendingAuthorization = pending;

    async function verifyCardAuthorization() {
      try {
        const { data: sessionData } = await client.auth.getSession();
        const response = await fetch("/api/paystack/verify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(sessionData.session?.access_token
              ? { Authorization: `Bearer ${sessionData.session.access_token}` }
              : {}),
          },
          body: JSON.stringify({
            label: pendingAuthorization.label,
            purpose: "add_card",
            reference: returnReference,
          }),
        });
        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            getCardAuthorizationFailureMessage(result.error || "Unable to save card.", result.testMode)
          );
        }

        window.sessionStorage.removeItem(cardAuthorizationStorageKey);
        window.history.replaceState(null, "", "/account");
        setPayments((current) => [result.paymentMethod as PaymentForm, ...current]);
        setPaymentModalOpen(false);
        setPaymentForm(emptyPayment);
        setTab("wallet");
        setMessage("Card authorized and saved.");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Unable to save card.");
      } finally {
        setSavingPayment(false);
      }
    }

    void verifyCardAuthorization();
  }, [supabase, user]);

  const updateProfileField = (key: keyof ProfileForm, value: string) => {
    setProfile((current) => ({ ...current, [key]: value }));
  };

  const updateAddressField = (key: keyof AddressForm, value: string | boolean) => {
    setAddressForm((current) => ({ ...current, [key]: value }));
  };

  const updatePaymentField = (key: keyof PaymentForm, value: string) => {
    setPaymentForm((current) => ({ ...current, [key]: value }));
  };

  const handleAuth = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");

    if (!supabase) {
      setMessage("Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local first.");
      return;
    }

    const result =
      authMode === "login"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

    if (result.error) {
      setMessage(result.error.message);
      return;
    }

    setMessage(authMode === "signup" ? "Account created. Check your email if confirmation is enabled." : "");
  };

  const handleOAuth = async (provider: "google" | "facebook") => {
    if (!supabase) {
      setMessage("Supabase is not configured yet.");
      return;
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: getAuthRedirectUrl("/account"),
      },
    });

    if (error) setMessage(error.message);
  };

  const saveProfile = async () => {
    if (!supabase || !user) return;

    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      email: user.email,
      ...profile,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setSavedProfile(profile);
    setMessage("Account updated.");
    window.dispatchEvent(
      new CustomEvent("arame:profile-updated", {
        detail: {
          display_name: profile.display_name,
          avatar_url: profile.avatar_url,
        },
      })
    );
  };

  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !supabase || !user) return;

    const extension = file.name.split(".").pop() || "jpg";
    const path = `${user.id}/${Date.now()}.${extension}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });

    if (error) {
      setMessage(error.message);
      return;
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    updateProfileField("avatar_url", data.publicUrl);
  };

  const saveAddress = async () => {
    if (!supabase || !user) return;

    const payload = { ...addressForm, user_id: user.id };
    const query = addressForm.id
      ? supabase.from("addresses").update(payload).eq("id", addressForm.id).select("*").single()
      : supabase.from("addresses").insert(payload).select("*").single();

    const { data, error } = await query;

    if (error) {
      setMessage(error.message);
      return;
    }

    setAddresses((current) => {
      const rest = current.filter((item) => item.id !== data.id);
      return [data as AddressForm, ...rest];
    });
    setAddressModalOpen(false);
    setAddressForm(emptyAddress);
  };

  const removeAddress = async (id?: string) => {
    if (!id || !supabase) return;

    const { error } = await supabase.from("addresses").delete().eq("id", id);
    if (error) {
      setMessage(error.message);
      return;
    }
    setAddresses((current) => current.filter((item) => item.id !== id));
  };

  const savePayment = async () => {
    if (!supabase || !user) return;

    if (!user.email) {
      setMessage("Your account email is required before saving a card.");
      return;
    }

    setSavingPayment(true);
    setMessage("");

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const response = await fetch("/api/paystack/initialize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(sessionData.session?.access_token
            ? { Authorization: `Bearer ${sessionData.session.access_token}` }
            : {}),
        },
        body: JSON.stringify({
          label: paymentForm.label || "Personal Card",
          purpose: "add_card",
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Unable to start card authorization.");
      }

      window.sessionStorage.setItem(
        cardAuthorizationStorageKey,
        JSON.stringify({
          createdAt: Date.now(),
          label: paymentForm.label || "Personal Card",
          reference: result.reference,
        } satisfies PendingCardAuthorization)
      );

      window.location.assign(result.authorizationUrl);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to start card authorization.");
    } finally {
      setSavingPayment(false);
    }
  };

  const removePayment = async (id?: string) => {
    if (!id || !supabase) return;

    const { error } = await supabase.from("payment_methods").delete().eq("id", id);
    if (error) {
      setMessage(error.message);
      return;
    }
    setPayments((current) => current.filter((item) => item.id !== id));
  };

  return (
    <div className={styles.accountPage}>
      <Header variant="shop" />

      {!user ? (
        <section className={styles.authScreen}>
          <div className={styles.authCard}>
            <h1>{authMode === "login" ? "Log In" : "Sign Up"}</h1>
            <p>
              {authMode === "login" ? "New to this site? " : "Already a member? "}
              <button
                className={styles.linkButton}
                type="button"
                onClick={() => {
                  setAuthMode(authMode === "login" ? "signup" : "login");
                  setShowEmailForm(false);
                  setMessage("");
                }}
              >
                {authMode === "login" ? "Sign Up" : "Log In"}
              </button>
            </p>

            {!showEmailForm ? (
              <>
                <button className={styles.socialButton} type="button" onClick={() => handleOAuth("google")}>
                  <span>G</span>
                  <span>{authMode === "login" ? "Log in with Google" : "Sign up with Google"}</span>
                </button>
                <button className={`${styles.socialButton} ${styles.facebook}`} type="button" onClick={() => handleOAuth("facebook")}>
                  <span>f</span>
                  <span>{authMode === "login" ? "Log in with Facebook" : "Sign up with Facebook"}</span>
                </button>
                <div className={styles.orLine}>or</div>
                <button className={styles.emailButton} type="button" onClick={() => setShowEmailForm(true)}>
                  {authMode === "login" ? "Log in with Email" : "Sign up with email"}
                </button>
              </>
            ) : (
              <form className={styles.authForm} onSubmit={handleAuth}>
                <div className={styles.field}>
                  <label htmlFor="authEmail">Email</label>
                  <input id="authEmail" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
                </div>
                <div className={styles.field}>
                  <label htmlFor="authPassword">Password</label>
                  <input id="authPassword" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={6} />
                </div>
                <button className={styles.submitButton} type="submit">
                  {authMode === "login" ? "Log In" : "Sign Up"}
                </button>
              </form>
            )}

            {!configured && <p className={styles.message}>Supabase env keys are missing.</p>}
            {message && <p className={styles.message}>{message}</p>}
          </div>
        </section>
      ) : (
        <>
          <main className={styles.accountMain}>
            <div className={styles.accountWrap}>
              <div className={styles.topBar}>
                <h1>{showOrders ? "My Orders" : "Account Settings"}</h1>
              </div>

              {!showOrders && (
                <div className={styles.tabs}>
                  <button className={`${styles.tab} ${tab === "account" ? styles.activeTab : ""}`} type="button" onClick={() => setTab("account")}>
                    My Account
                  </button>
                  <button className={`${styles.tab} ${tab === "addresses" ? styles.activeTab : ""}`} type="button" onClick={() => setTab("addresses")}>
                    My Addresses
                  </button>
                  <button className={`${styles.tab} ${tab === "wallet" ? styles.activeTab : ""}`} type="button" onClick={() => setTab("wallet")}>
                    My Wallet
                  </button>
                </div>
              )}

              {!showOrders && tab === "account" && (
                <section>
                  <div className={styles.sectionHead}>
                    <div>
                      <h2>Account</h2>
                      <p>View and edit your personal info below.</p>
                    </div>
                    <div className={styles.actions}>
                      <button className={styles.button} type="button" onClick={() => setProfile(savedProfile)}>
                        Discard
                      </button>
                      <button className={`${styles.button} ${styles.primary}`} type="button" onClick={saveProfile}>
                        Update Info
                      </button>
                    </div>
                  </div>

                  <div className={styles.profileRow}>
                    <div>
                      <div className={styles.block}>
                        <h2>Display info</h2>
                        <p>This information will be visible to all members of this site.</p>
                      </div>
                      <div className={styles.field}>
                        <label htmlFor="displayName">Display name *</label>
                        <input id="displayName" type="text" value={profile.display_name} onChange={(event) => updateProfileField("display_name", event.target.value)} />
                      </div>
                      <div className={styles.field}>
                        <label htmlFor="title">Title</label>
                        <input id="title" type="text" value={profile.title} onChange={(event) => updateProfileField("title", event.target.value)} />
                      </div>
                    </div>
                    <div className={styles.profileImageBox}>
                      <div className={styles.profileTitle}>
                        <span>Profile image</span>
                        <span className={styles.infoDot}>i</span>
                      </div>
                      <label className={styles.avatar} htmlFor="profileUpload">
                        {profile.avatar_url ? <img src={profile.avatar_url} alt="Profile" /> : <span>{(profile.display_name || user.email || "A").charAt(0).toUpperCase()}</span>}
                        <span className={styles.camera}>+</span>
                      </label>
                      <input id="profileUpload" type="file" accept="image/*" hidden onChange={uploadAvatar} />
                    </div>
                  </div>

                  <div className={styles.block}>
                    <h2>Personal info</h2>
                    <p>Update your personal information.</p>
                    <div className={styles.formGrid}>
                      <div className={styles.field}>
                        <label htmlFor="firstName">First name</label>
                        <input id="firstName" type="text" value={profile.first_name} onChange={(event) => updateProfileField("first_name", event.target.value)} />
                      </div>
                      <div className={styles.field}>
                        <label htmlFor="lastName">Last name</label>
                        <input id="lastName" type="text" value={profile.last_name} onChange={(event) => updateProfileField("last_name", event.target.value)} />
                      </div>
                      <div className={styles.field}>
                        <label htmlFor="phone">Phone</label>
                        <input id="phone" type="tel" value={profile.phone} onChange={(event) => updateProfileField("phone", event.target.value)} />
                      </div>
                    </div>
                  </div>

                  <div className={styles.block}>
                    <h2>Login info</h2>
                    <p>View your login email.</p>
                    <p className={styles.muted}>{user.email}</p>
                  </div>

                  {message && <p className={styles.message}>{message}</p>}
                </section>
              )}

              {!showOrders && tab === "addresses" && (
                <section>
                  <div className={styles.block}>
                    <h2>My Addresses</h2>
                    <p>Add and manage the addresses you use often.</p>
                  </div>
                  {addresses.length === 0 ? (
                    <div className={styles.emptyState}>
                      <p>You haven&apos;t saved any addresses yet.</p>
                      <button className={`${styles.button} ${styles.primary}`} type="button" onClick={() => setAddressModalOpen(true)}>
                        Add New Address
                      </button>
                    </div>
                  ) : (
                    <div className={styles.cardList}>
                      {addresses.map((address) => (
                        <div className={styles.savedCard} key={address.id}>
                          <div>
                            <div className={styles.savedText}>
                              <div>{[address.first_name, address.last_name].filter(Boolean).join(" ")}</div>
                              {address.company && <div>{address.company}</div>}
                              {address.address_line_1 && <div>{address.address_line_1}</div>}
                              {address.address_line_2 && <div>{address.address_line_2}</div>}
                              <div>{[address.city, address.state, address.postal_code].filter(Boolean).join(", ")}</div>
                              <div>{address.country}</div>
                              {address.phone && <div>{address.phone}</div>}
                            </div>
                            <div className={styles.cardActions}>
                              <button type="button" onClick={() => { setAddressForm(address); setAddressModalOpen(true); }}>
                                Edit
                              </button>
                              <button type="button" onClick={() => removeAddress(address.id)}>
                                Remove
                              </button>
                            </div>
                          </div>
                          {address.is_default && <div>Default Address</div>}
                        </div>
                      ))}
                      <div className={styles.centerAction}>
                        <button className={`${styles.button} ${styles.primary}`} type="button" onClick={() => { setAddressForm(emptyAddress); setAddressModalOpen(true); }}>
                          Add New Address
                        </button>
                      </div>
                    </div>
                  )}
                </section>
              )}

              {!showOrders && tab === "wallet" && (
                <section>
                  <div className={styles.block}>
                    <h2>Wallet</h2>
                    <p>Manage your saved credit cards for faster checkout.</p>
                  </div>
                  {payments.length === 0 ? (
                    <div className={styles.walletEmpty}>No payment methods saved yet.</div>
                  ) : (
                    <div className={styles.walletGrid}>
                      {payments.map((payment) => (
                        <div className={styles.virtualWalletCard} key={payment.id}>
                          <div className={styles.virtualWalletCardGlass} />
                          <div className={styles.virtualWalletCardHeader}>
                            <span className={styles.walletCardLabel}>{payment.label.toUpperCase()}</span>
                            <span className={`${styles.walletCardLogo} ${styles[payment.method_type.toLowerCase()] || styles.generic}`} />
                          </div>
                          <div className={styles.walletCardChip} />
                          <div className={styles.walletCardNumber}>
                            •••• •••• •••• {payment.last4}
                          </div>
                          <div className={styles.walletCardFooter}>
                            <div>
                              <span className={styles.walletCardFooterLabel}>CARDHOLDER</span>
                              <span className={styles.walletCardFooterVal}>
                                {profile.first_name || profile.last_name
                                  ? `${profile.first_name} ${profile.last_name}`.toUpperCase()
                                  : profile.display_name.toUpperCase() || "CARDHOLDER"}
                              </span>
                            </div>
                            <div className={styles.walletCardRemoveWrap}>
                              <button
                                type="button"
                                className={styles.walletRemoveBtn}
                                onClick={() => removePayment(payment.id)}
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className={styles.centerAction}>
                    <button className={`${styles.button} ${styles.primary}`} type="button" onClick={() => setPaymentModalOpen(true)}>
                      + Add Payment Method
                    </button>
                  </div>
                </section>
              )}

              {showOrders && (
                <section>
                  <div className={styles.block}>
                    <p>View your order history or check the status of a recent order.</p>
                  </div>

                  {dbError ? (
                    <div className={styles.dbErrorCard}>
                      <p className={styles.errorHeading}>Database Setup Required</p>
                      <p>{dbError}</p>
                      <pre className={styles.sqlSnippet}>
{`create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  status text not null default 'pending',
  items jsonb not null,
  total numeric not null,
  created_at timestamptz default now()
);`}
                      </pre>
                    </div>
                  ) : loadingOrders ? (
                    <div className={styles.orderLoading}>
                      <div className={styles.spinner} />
                      <p>Loading your orders...</p>
                    </div>
                  ) : orders.length === 0 ? (
                    <div className={styles.emptyState}>
                      <p>You haven&apos;t placed any orders yet.</p>
                      <Link href="/shop">Start Browsing</Link>
                    </div>
                  ) : (
                    <div className={styles.ordersList}>
                      {orders.map((order) => (
                        <div key={order.id} className={styles.orderCard}>
                          <div className={styles.orderCardHeader}>
                            <div className={styles.orderMeta}>
                              <div>
                                <span className={styles.metaLabel}>ORDER PLACED</span>
                                <span className={styles.metaValue}>
                                  {new Date(order.created_at).toLocaleDateString("en-NG", {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                  })}
                                </span>
                              </div>
                              <div>
                                <span className={styles.metaLabel}>TOTAL</span>
                                <span className={styles.metaValue}>{formatPrice(order.total)}</span>
                              </div>
                              <div className={styles.orderRefCol}>
                                <span className={styles.metaLabel}>ORDER ID</span>
                                <span className={styles.orderIdText} title={order.id}>{order.id}</span>
                              </div>
                            </div>
                            <div className={styles.orderStatusCol}>
                              <span className={`${styles.statusBadge} ${styles[order.status?.toLowerCase() || "pending"] || styles.pending}`}>
                                {getOrderStatusLabel(order.status)}
                              </span>
                              <Link className={styles.trackOrderLink} href={getTrackingHref(order.id, order.tracking_code)}>
                                Track Receipt
                              </Link>
                            </div>
                          </div>

                          <div className={styles.orderItems}>
                            {Array.isArray(order.items) &&
                              order.items.map((item, idx) => (
                                <div key={idx} className={styles.orderItemRow}>
                                  <div className={styles.orderItemImgBox}>
                                    <img src={item.image} alt={item.name} />
                                  </div>
                                  <div className={styles.orderItemInfo}>
                                    <h4>{item.name}</h4>
                                    <p className={styles.orderItemDetails}>
                                      Qty: {item.quantity} | Size: {item.size}
                                    </p>
                                  </div>
                                  <div className={styles.orderItemPrice}>
                                    {formatPrice(Number(item.price) * Number(item.quantity))}
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              )}
            </div>
          </main>
          <Footer />
        </>
      )}

      {addressModalOpen && (
        <div className={styles.modalLayer} onClick={() => setAddressModalOpen(false)}>
          <div className={styles.modal} onClick={(event) => event.stopPropagation()}>
            <button className={styles.close} type="button" aria-label="Close" onClick={() => setAddressModalOpen(false)} />
            <h3>{addressForm.id ? "Edit Address" : "Add New Address"}</h3>
            <div className={styles.modalLine} />
            <div className={styles.addressGrid}>
              <div className={styles.field}>
                <label htmlFor="addrFirstName">* First name</label>
                <input id="addrFirstName" value={addressForm.first_name} onChange={(event) => updateAddressField("first_name", event.target.value)} />
              </div>
              <div className={styles.field}>
                <label htmlFor="addrLastName">* Last name</label>
                <input id="addrLastName" value={addressForm.last_name} onChange={(event) => updateAddressField("last_name", event.target.value)} />
              </div>
              <div className={`${styles.field} ${styles.wide}`}>
                <label htmlFor="addrCompany">Company name</label>
                <input id="addrCompany" value={addressForm.company} onChange={(event) => updateAddressField("company", event.target.value)} />
              </div>
              <div className={`${styles.field} ${styles.wide}`}>
                <label htmlFor="addrAddress">* Address</label>
                <input id="addrAddress" value={addressForm.address_line_1} onChange={(event) => updateAddressField("address_line_1", event.target.value)} />
              </div>
              <div className={`${styles.field} ${styles.wide}`}>
                <label htmlFor="addrAddress2">Address line 2</label>
                <input id="addrAddress2" value={addressForm.address_line_2} onChange={(event) => updateAddressField("address_line_2", event.target.value)} />
              </div>
              <div className={styles.field}>
                <label htmlFor="addrCity">* City</label>
                <input id="addrCity" value={addressForm.city} onChange={(event) => updateAddressField("city", event.target.value)} />
              </div>
              <div className={styles.field}>
                <label htmlFor="addrCountry">* Country</label>
                <input id="addrCountry" value={addressForm.country} onChange={(event) => updateAddressField("country", event.target.value)} />
              </div>
              {addressForm.country.trim().toLowerCase() === "nigeria" && (
                <div className={styles.field}>
                  <label htmlFor="addrState">State</label>
                  <select id="addrState" value={addressForm.state} onChange={(event) => updateAddressField("state", event.target.value)}>
                    <option value="">Select state</option>
                    {states.map((state) => (
                      <option key={state} value={state}>{state}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className={styles.field}>
                <label htmlFor="addrZip">Zip / Postal code</label>
                <input id="addrZip" value={addressForm.postal_code} onChange={(event) => updateAddressField("postal_code", event.target.value)} />
              </div>
              <div className={styles.field}>
                <label htmlFor="addrPhone">Phone</label>
                <input id="addrPhone" type="tel" value={addressForm.phone} onChange={(event) => updateAddressField("phone", event.target.value)} />
              </div>
            </div>
            <label className={styles.checkRow}>
              <input type="checkbox" checked={addressForm.is_default} onChange={(event) => updateAddressField("is_default", event.target.checked)} />
              <span>Make this my default address</span>
            </label>
            <button className={`${styles.button} ${styles.primary}`} type="button" onClick={saveAddress}>
              {addressForm.id ? "Save Address" : "Add Address"}
            </button>
          </div>
        </div>
      )}

      {paymentModalOpen && (
        <div
          className={styles.modalLayer}
          onClick={() => {
            if (!savingPayment) setPaymentModalOpen(false);
          }}
        >
          <div className={`${styles.modal} ${styles.smallModal}`} onClick={(event) => event.stopPropagation()}>
            <button
              className={styles.close}
              type="button"
              aria-label="Close"
              onClick={() => setPaymentModalOpen(false)}
              disabled={savingPayment}
            />
            <h3>Add Saved Card</h3>
            <div className={styles.field}>
              <label htmlFor="paymentLabel">Card Label</label>
              <input id="paymentLabel" placeholder="e.g. Personal Visa" value={paymentForm.label} onChange={(event) => updatePaymentField("label", event.target.value)} />
            </div>
            <div className={styles.paystackNotice}>
              <strong>Secure Paystack Authorization</strong>
              <span>Paystack may show a small NGN 50 authorization to verify the card before it can be saved.</span>
              <span>This wallet saves only the verified card brand, last four digits, and reusable Paystack authorization.</span>
              {isPaystackPublicTestMode && <span className={styles.testCardHint}>{paystackTestCardHint}</span>}
            </div>
            {message && <p className={styles.message}>{message}</p>}
            <div className={styles.actions} style={{ marginTop: "24px" }}>
              <button className={styles.button} type="button" onClick={() => setPaymentModalOpen(false)} disabled={savingPayment}>Cancel</button>
              <button className={`${styles.button} ${styles.primary}`} type="button" onClick={savePayment} disabled={savingPayment}>
                {savingPayment ? "Authorizing..." : "Authorize Card"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
