"use client";

import Link from "next/link";
import styles from "@/frontend/components/home/home-page.module.css";
import { useToast } from "@/frontend/context/ToastContext";

export function Footer() {
  const { addToast } = useToast();

  return (
    <footer className={styles.footer}>
      <div className={styles.footerGrid}>
        <div>
          <div className={styles.footerBrand}>
            <h3>ARAM{"\u00C8"}</h3>
            <p>
              House of Rare Fragrance - where every scent tells a story.
            </p>
          </div>

          <div className={styles.footerNewsletter}>
            <h4>Stay Inspired</h4>
            <p>
              Subscribe for exclusive offers, new fragrance previews, and
              stories from our atelier.
            </p>

            <div className={styles.socialIcons}>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.socialIcon}
                aria-label="Instagram"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="3" width="18" height="18" rx="5" />
                  <circle cx="12" cy="12" r="4" />
                  <circle cx="17.5" cy="6.5" r="1" />
                </svg>
              </a>

              <a
                href="https://x.com"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.socialIcon}
                aria-label="Twitter / X"
              >
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>

              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.socialIcon}
                aria-label="Facebook"
              >
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </a>
            </div>

            <form
              className={styles.newsletterForm}
              onSubmit={(event) => {
                event.preventDefault();
                addToast({
                  message: "Thank you for subscribing to our newsletter!",
                  type: "success",
                });
                event.currentTarget.reset();
              }}
            >
              <input
                suppressHydrationWarning
                autoComplete="off"
                type="email"
                placeholder="Enter your email"
                required
              />

              <button type="submit">
                Subscribe {"\u2192"}
              </button>
            </form>
          </div>
        </div>

        <div className={styles.footerCol}>
          <h5>SHOP</h5>
          <ul>
            <li><Link href="/shop">All Fragrances</Link></li>
            <li><Link href="/shop">Eau de Parfum</Link></li>
            <li><Link href="/shop">Discovery Sets</Link></li>
            <li><Link href="/shop">Candles &amp; Home</Link></li>
          </ul>
        </div>

        <div className={styles.footerCol}>
          <h5>COMPANY</h5>
          <ul>
            <li><Link href="/#story">Our Story</Link></li>
            <li><Link href="/blog">Sustainability</Link></li>
            <li><Link href="/blog">Press</Link></li>
            <li><Link href="/blog">Careers</Link></li>
          </ul>
        </div>

        <div className={styles.footerCol}>
          <h5>SUPPORT</h5>
          <ul>
            <li><Link href="/#contact">Contact Us</Link></li>
            <li><Link href="/#faq">FAQs</Link></li>
            <li><Link href="/shipping">Shipping</Link></li>
            <li><Link href="/returns">Returns</Link></li>
          </ul>
        </div>
      </div>

      <div className={styles.footerBottom}>
        <div>{"\u00A9"} 2026 ARAM{"\u00C8"}. ALL RIGHTS RESERVED.</div>

        <div className={styles.footerBottomLinks}>
          <Link href="/privacy">Privacy Policy</Link>
          <Link href="/terms">Terms of Service</Link>
        </div>
      </div>
    </footer>
  );
}
