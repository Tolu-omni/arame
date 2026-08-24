"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { Header } from "@/frontend/components/shared/Header";
import { Footer } from "@/frontend/components/shared/Footer";
import { useCart } from "@/frontend/context/CartContext";
import { useCurrency } from "@/frontend/context/CurrencyContext";
import styles from "./cart-page.module.css";

export function CartPage() {
  const { items, subtotal, removeItem } = useCart();
  const { formatPrice } = useCurrency();

  return (
    <div className={styles.cartPage}>
      <Header variant="shop" />
      <main className={styles.cartMain}>
        <h1>Cart</h1>
        {items.length === 0 ? (
          <div className={styles.emptyState}>
            <p>Your cart is empty.</p>
            <Link className={styles.shopLink} href="/shop">
              Continue Shopping
            </Link>
          </div>
        ) : (
          <div className={styles.cartGrid}>
            <div className={styles.cartItems}>
              {items.map((item) => (
                <div className={styles.cartItem} key={`${item.product_id}-${item.size}`}>
                  <img src={item.image} alt={item.name} />
                  <div>
                    <h2>{item.name}</h2>
                    <p>{item.size}</p>
                    <p>Qty: {item.quantity}</p>
                    <button type="button" onClick={() => removeItem(item.product_id, item.size)}>
                      Remove
                    </button>
                  </div>
                  <strong>{formatPrice(item.price * item.quantity)}</strong>
                </div>
              ))}
            </div>

            <aside className={styles.summary}>
              <h2>Order Summary</h2>
              <div>
                <span>Subtotal</span>
                <strong>{formatPrice(subtotal)}</strong>
              </div>
              <Link href="/checkout" className={styles.checkoutBtn}>
                Checkout
              </Link>
            </aside>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
