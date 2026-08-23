"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/frontend/supabase/browser";
import { useCart } from "@/frontend/context/CartContext";
import styles from "@/frontend/components/home/home-page.module.css";

type HeaderProps = {
  variant?: "home" | "shop";
};

export function Header({ variant = "home" }: HeaderProps) {
  const router = useRouter();
  const isShop = variant === "shop";
  const supabase = getSupabaseBrowserClient();
  const { items } = useCart();
  const accountRef = useRef<HTMLDivElement>(null);
  const [user, setUser] = useState<User | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [profile, setProfile] = useState({
    displayName: "",
    avatarUrl: "",
  });

  useEffect(() => {
    if (!supabase) return;

    let cancelled = false;
    const client = supabase;

    async function loadProfile(nextUser: User | null) {
      setUser(nextUser);

      if (!nextUser) {
        setProfile({ displayName: "", avatarUrl: "" });
        return;
      }

      const { data } = await client
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("id", nextUser.id)
        .maybeSingle();

      if (cancelled) return;

      setProfile({
        displayName: data?.display_name || nextUser.email?.split("@")[0] || "Account",
        avatarUrl: data?.avatar_url || "",
      });
    }

    client.auth.getSession().then(({ data }) => {
      if (!cancelled) {
        loadProfile(data.session?.user ?? null);
      }
    });

    const { data } = client.auth.onAuthStateChange((_event, session) => {
      loadProfile(session?.user ?? null);
    });

    const handleProfileUpdate = (event: Event) => {
      const nextProfile = (event as CustomEvent<{ display_name: string; avatar_url: string }>).detail;

      setProfile((current) => ({
        displayName: nextProfile.display_name || current.displayName,
        avatarUrl: nextProfile.avatar_url || current.avatarUrl,
      }));
    };

    window.addEventListener("arame:profile-updated", handleProfileUpdate);

    return () => {
      cancelled = true;
      data.subscription.unsubscribe();
      window.removeEventListener("arame:profile-updated", handleProfileUpdate);
    };
  }, [supabase]);

  useEffect(() => {
    const closeMenu = (event: MouseEvent) => {
      if (!accountRef.current?.contains(event.target as Node)) {
        setAccountOpen(false);
      }
    };

    document.addEventListener("click", closeMenu);

    return () => {
      document.removeEventListener("click", closeMenu);
    };
  }, []);

  const logout = async () => {
    await supabase?.auth.signOut();
    setAccountOpen(false);
    router.push("/account");
  };

  const cartCount = items.reduce((total, item) => total + item.quantity, 0);

  // Admin authorization check
  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "toluomoniyi@gmail.com";
  const isAdmin = user?.email && [
    adminEmail.toLowerCase().trim(),
    "toluomoniyi9@gmail.com",
    "toluomoniyi@gmail.com",
    "tolu@arame.com",
  ].includes(user.email.toLowerCase().trim());

  return (
    <header className={`${styles.header} ${isShop ? styles.shopHeader : ""}`}>
      <Link href="/" className={styles.logo} aria-label="Go to homepage">
        <svg viewBox="0 0 20 26" fill="none" aria-hidden="true">
          <path d="M10 1 C10 1 2 9 2 16 C2 20.4 5.6 24 10 24 C14.4 24 18 20.4 18 16 C18 9 10 1 10 1Z" />
          <path d="M10 10 C10 10 6.5 14 6.5 17 C6.5 18.9 8.1 20.5 10 20.5 C11.9 20.5 13.5 18.9 13.5 17 C13.5 14 10 10 10 10Z" />
        </svg>

        <span className={styles.logoText}>Aram{"\u00E8"}</span>
      </Link>

      <nav className={styles.navLinks} aria-label="Main navigation">
        <Link href="/">Home</Link>
        <Link href="/shop">Shop</Link>
        <Link href="/blog">Blog</Link>
      </nav>

      <div className={styles.rightSection}>
        <form
          className={styles.searchBar}
          onSubmit={(event) => {
            event.preventDefault();

            const query = new FormData(event.currentTarget)
              .get("q")
              ?.toString()
              .trim();

            router.push(
              query ? `/shop?search=${encodeURIComponent(query)}` : "/shop"
            );
          }}
        >
          <input
            suppressHydrationWarning
            autoComplete="off"
            name="q"
            type="text"
            placeholder="Search fragrance..."
            aria-label="Search"
          />

          <button
            suppressHydrationWarning
            className={styles.searchSubmit}
            type="submit"
            aria-label="Submit search"
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke={isShop ? "rgba(42,30,18,0.7)" : "rgba(255,255,255,0.7)"}
              strokeWidth="1.5"
              aria-hidden="true"
            >
              <circle cx="10" cy="10" r="7" />
              <path d="M15 15L21 21" strokeLinecap="round" />
            </svg>
          </button>
        </form>

        <div className={styles.accountMenuWrap} ref={accountRef}>
          {user ? (
            <button
              className={styles.accountButton}
              type="button"
              aria-label="Account menu"
              aria-expanded={accountOpen}
              onClick={() => setAccountOpen((open) => !open)}
            >
              <span className={styles.accountAvatar}>
                {profile.avatarUrl ? (
                  <img src={profile.avatarUrl} alt="" />
                ) : (
                  (profile.displayName || user.email || "A").charAt(0).toUpperCase()
                )}
              </span>
              <span className={styles.accountName}>{profile.displayName}</span>
            </button>
          ) : (
            <Link href="/account" className={styles.iconBtn} aria-label="Account">
              <svg viewBox="0 0 26 26" fill="none" aria-hidden="true">
                <circle
                  cx="13"
                  cy="13"
                  r="12"
                  stroke={isShop ? "#000" : "#fff"}
                  strokeWidth="1.5"
                />
                <circle cx="13" cy="10" r="4" fill={isShop ? "transparent" : "#fff"} />
                <path
                  d="M5 22C5 18.1 8.6 15 13 15C17.4 15 21 18.1 21 22"
                  stroke={isShop ? "#000" : "#fff"}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </Link>
          )}

          {user && accountOpen && (
            <div className={styles.accountDropdown}>
              <div className={styles.accountSummary}>
                <span className={styles.accountAvatar}>
                  {profile.avatarUrl ? (
                    <img src={profile.avatarUrl} alt="" />
                  ) : (
                    (profile.displayName || user.email || "A").charAt(0).toUpperCase()
                  )}
                </span>
                <div>
                  <strong>{profile.displayName}</strong>
                  <span>{user.email}</span>
                </div>
              </div>

              {isAdmin && (
                <Link
                  href="/admin"
                  onClick={() => setAccountOpen(false)}
                  style={{ color: "#97452f", fontWeight: "600" }}
                >
                  ⚙ Admin Panel
                </Link>
              )}
              <Link href="/account" onClick={() => setAccountOpen(false)}>
                Account Settings
              </Link>
              <Link href="/account?view=orders" onClick={() => setAccountOpen(false)}>
                My Orders
              </Link>
              <button type="button" onClick={logout}>
                Log Out
              </button>
            </div>
          )}
        </div>

        <Link href="/cart" className={`${styles.iconBtn} ${styles.cartIconBtn}`} aria-label={`Cart${cartCount ? `, ${cartCount} items` : ""}`}>
          <svg viewBox="0 0 26 26" fill="none" aria-hidden="true">
            <path
              d="M2 4H5L7 18H21L23 8H6.5"
              stroke={isShop ? "#000" : "#fff"}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle
              cx="9"
              cy="22"
              r="2"
              stroke={isShop ? "#000" : "#fff"}
              strokeWidth="1.2"
            />
            <circle
              cx="19"
              cy="22"
              r="2"
              stroke={isShop ? "#000" : "#fff"}
              strokeWidth="1.2"
            />
            <path
              d="M14 4V7"
              stroke={isShop ? "#000" : "#fff"}
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          {cartCount > 0 && <span className={styles.cartBadge}>{cartCount}</span>}
        </Link>
      </div>
    </header>
  );
}
