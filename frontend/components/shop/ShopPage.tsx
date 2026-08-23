"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { useRouter, useSearchParams } from "next/navigation";
import { Header } from "@/frontend/components/shared/Header";
import { Footer } from "@/frontend/components/shared/Footer";
import { useCart } from "@/frontend/context/CartContext";
import { getSupabaseBrowserClient } from "@/frontend/supabase/browser";
import { useToast } from "@/frontend/context/ToastContext";
import { catalog, categoryFilters, sortOptions } from "@/frontend/shop/catalog";
import type { Filter, Product } from "@/frontend/shop/types";
import styles from "./shop-page.module.css";

const formatCurrency = (price: number) => `\u20A6${Number(price).toFixed(2)}`;

const buildFilterState = (filters: Filter[]) => {
  const open: Record<string, boolean> = {};
  const selected: Record<string, string[]> = {};
  const prices: Record<string, { min: number; max: number }> = {};

  filters.forEach((filter) => {
    open[filter.title] = filter.defaultOpen;

    if (filter.type === "options") {
      selected[filter.title] = [];
    }

    if (filter.type === "range") {
      prices[filter.title] = {
        min: Number(filter.min.replace(/[^\d]/g, "")) || 0,
        max: Number(filter.max.replace(/[^\d]/g, "")) || 200,
      };
    }
  });

  return { open, selected, prices };
};

const defaultFilterState = buildFilterState(categoryFilters["All Products"]);

function Checkbox({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button type="button" onClick={onChange} className={styles.checkbox}>
      {checked ? "\u2713" : ""}
    </button>
  );
}

function QuantitySelector({
  quantity,
  setQuantity,
}: {
  quantity: number;
  setQuantity: (value: number) => void;
}) {
  return (
    <div className={styles.quantity}>
      <button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))}>
        {"\u2212"}
      </button>
      <div>{quantity}</div>
      <button type="button" onClick={() => setQuantity(quantity + 1)}>
        +
      </button>
    </div>
  );
}

function PriceRange({
  min,
  max,
  minValue,
  maxValue,
  onMinChange,
  onMaxChange,
}: {
  min: string;
  max: string;
  minValue: number;
  maxValue: number;
  onMinChange: (value: number) => void;
  onMaxChange: (value: number) => void;
}) {
  const rangeMin = Number(min.replace(/[^\d]/g, "")) || 0;
  const rangeMax = Number(max.replace(/[^\d]/g, "")) || 200;

  return (
    <div className={styles.priceRange}>
      <input type="range" min={rangeMin} max={rangeMax} value={minValue} onChange={(event) => onMinChange(Number(event.target.value))} />
      <input type="range" min={rangeMin} max={rangeMax} value={maxValue} onChange={(event) => onMaxChange(Number(event.target.value))} />
      <div className={styles.priceValues}>
        <span>NGN {minValue}</span>
        <span>NGN {maxValue}</span>
      </div>
    </div>
  );
}

export function ShopPage({ products = [] }: { products?: Product[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const { addItem } = useCart();
  const { addToast } = useToast();

  const [user, setUser] = useState<User | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("All Products");
  const [sortBy, setSortBy] = useState("Recommended");
  const [sortOpen, setSortOpen] = useState(false);
  const [openFilters, setOpenFilters] = useState<Record<string, boolean>>(defaultFilterState.open);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string[]>>(defaultFilterState.selected);
  const [priceValues, setPriceValues] = useState<Record<string, { min: number; max: number }>>(defaultFilterState.prices);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedSize, setSelectedSize] = useState("100ml");
  const [quantity, setQuantity] = useState(1);

  const mergedFilters = useMemo(() => categoryFilters[selectedCategory], [selectedCategory]);
  const searchTerm = searchParams.get("search") || "";

  useEffect(() => {
    if (!supabase) return;

    let cancelled = false;

    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled) {
        setUser(data.session?.user ?? null);
      }
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      cancelled = true;
      data.subscription.unsubscribe();
    };
  }, [supabase]);

  const visibleProducts = useMemo(() => {
    let items = [...products];

    if (selectedCategory !== "All Products") {
      items = items.filter((product) => product.category === selectedCategory);
    }

    const productType = selectedOptions["Product type"] ?? [];
    const concentration = selectedOptions["Concentration"] ?? [];
    const scent = selectedOptions["Scent"] ?? [];
    const profile = selectedOptions["Scent Profile"] ?? [];
    const size = selectedOptions["Size"] ?? [];
    const price = priceValues["Price"];

    if (selectedCategory === "All Products" && productType.length > 0) {
      items = items.filter((product) => productType.some((x) => product.categoryTags.includes(x)));
    }

    if (concentration.length > 0) {
      items = items.filter((product) => concentration.some((x) => product.concentrationTags.includes(x)));
    }

    if (scent.length > 0) {
      items = items.filter((product) => scent.some((x) => product.scentTags.includes(x)));
    }

    if (profile.length > 0) {
      items = items.filter((product) => profile.some((x) => product.scentProfileTags.includes(x)));
    }

    if (size.length > 0) {
      items = items.filter((product) => size.some((x) => product.sizeTags.includes(x)));
    }

    if (price) {
      items = items.filter((product) => product.price >= price.min && product.price <= price.max);
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      items = items.filter(
        (product) =>
          product.name.toLowerCase().includes(term) ||
          product.category.toLowerCase().includes(term) ||
          product.description.toLowerCase().includes(term)
      );
    }

    if (sortBy === "Price (low to high)") items.sort((a, b) => a.price - b.price);
    if (sortBy === "Price (high to low)") items.sort((a, b) => b.price - a.price);
    if (sortBy === "Name A-Z") items.sort((a, b) => a.name.localeCompare(b.name));

    return items;
  }, [products, selectedCategory, selectedOptions, priceValues, sortBy, searchTerm]);

  const toggleOption = (filterTitle: string, option: string) => {
    setSelectedOptions((prev) => {
      const current = prev[filterTitle] ?? [];
      return {
        ...prev,
        [filterTitle]: current.includes(option)
          ? current.filter((item) => item !== option)
          : [...current, option],
      };
    });
  };

  const updatePrice = (filterTitle: string, type: "min" | "max", value: number) => {
    setPriceValues((prev) => {
      const current = prev[filterTitle];
      if (!current) return prev;

      return {
        ...prev,
        [filterTitle]: {
          min: type === "min" ? Math.min(value, current.max) : current.min,
          max: type === "max" ? Math.max(value, current.min) : current.max,
        },
      };
    });
  };

  const selectCategory = (category: string) => {
    const nextFilterState = buildFilterState(categoryFilters[category]);

    setSelectedCategory(category);
    setOpenFilters(nextFilterState.open);
    setSelectedOptions(nextFilterState.selected);
    setPriceValues(nextFilterState.prices);
    setSelectedProduct(null);
  };

  const selectProduct = (product: Product) => {
    setSelectedProduct(product);
    setSelectedSize(product.sizes[0]);
    setQuantity(1);
  };

  const addSelectedProductToCart = () => {
    if (!selectedProduct) return false;

    if (!user) {
      router.push("/account");
      return false;
    }

    addItem({
      product_id: selectedProduct.id,
      name: selectedProduct.name,
      price: selectedProduct.price,
      image: selectedProduct.image,
      size: selectedSize,
      quantity,
    });

    addToast({
      message: `Added ${selectedProduct.name} (${selectedSize}) to cart!`,
      type: "success",
    });

    return true;
  };

  return (
    <>
      <Header variant="shop" />

      <main className={styles.shop}>
        {selectedProduct ? (
          <section className={styles.productDetail}>
            <button className={styles.backBtn} onClick={() => setSelectedProduct(null)}>
              {"\u2190"} Back to shop
            </button>

            <div className={styles.productDetailGrid}>
              <div className={styles.productImageBox}>
                <img src={selectedProduct.image} alt={selectedProduct.name} />
              </div>

              <div className={styles.productInfo}>
                <h1>{selectedProduct.name}</h1>
                <p className={styles.price}>{formatCurrency(selectedProduct.price)}</p>

                <div className={styles.optionGroup}>
                  <p>Size *</p>
                  <div className={styles.sizeButtons}>
                    {selectedProduct.sizes.map((size) => (
                      <button
                        key={size}
                        onClick={() => setSelectedSize(size)}
                        className={selectedSize === size ? styles.selectedSize : ""}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>

                <div className={styles.optionGroup}>
                  <p>Quantity *</p>
                  <QuantitySelector quantity={quantity} setQuantity={setQuantity} />
                </div>

                <button className={styles.addBtn} onClick={addSelectedProductToCart}>
                  Add to Cart
                </button>

                <button
                  className={styles.buyBtn}
                  onClick={() => {
                    if (addSelectedProductToCart()) {
                      router.push("/cart");
                    }
                  }}
                >
                  Buy Now
                </button>

                <p className={styles.description}>{selectedProduct.description}</p>
              </div>
            </div>
          </section>
        ) : (
          <section className={styles.shopWrap}>
            <div className={styles.banner}>
              <img src={catalog[selectedCategory].banner} alt={catalog[selectedCategory].title} />
            </div>

            <div className={styles.categoryIntro}>
              <h1>{catalog[selectedCategory].title}</h1>
              {catalog[selectedCategory].description && <p>{catalog[selectedCategory].description}</p>}
            </div>

            <div className={styles.shopGrid}>
              <aside className={styles.sidebar}>
                <h2>Browse by</h2>

                <div className={styles.line} />

                <div className={styles.browseList}>
                  {["All Products", "Men's Perfumes", "Body Oils", "Women's Perfumes"].map((item) => (
                    <button
                      key={item}
                      onClick={() => selectCategory(item)}
                      className={selectedCategory === item ? styles.activeBrowse : ""}
                    >
                      {item}
                    </button>
                  ))}
                </div>

                <h2 className={styles.filterTitle}>Filter by</h2>

                <div className={styles.line} />

                {mergedFilters.map((filter) => (
                  <div key={filter.title} className={styles.filterItem}>
                    <button
                      className={styles.filterHeader}
                      onClick={() =>
                        setOpenFilters((prev) => ({
                          ...prev,
                          [filter.title]: !prev[filter.title],
                        }))
                      }
                    >
                      <span>{filter.title}</span>
                      <span>{openFilters[filter.title] ? "\u2212" : "+"}</span>
                    </button>

                    {openFilters[filter.title] && filter.type === "options" && (
                      <div className={styles.filterOptions}>
                        {filter.options.map((option) => (
                          <div key={option} className={styles.filterOption}>
                            <Checkbox
                              checked={selectedOptions[filter.title]?.includes(option) || false}
                              onChange={() => toggleOption(filter.title, option)}
                            />
                            <button onClick={() => toggleOption(filter.title, option)}>
                              {option}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {openFilters[filter.title] && filter.type === "range" && (
                      <PriceRange
                        min={filter.min}
                        max={filter.max}
                        minValue={priceValues[filter.title]?.min ?? 0}
                        maxValue={priceValues[filter.title]?.max ?? 0}
                        onMinChange={(value) => updatePrice(filter.title, "min", value)}
                        onMaxChange={(value) => updatePrice(filter.title, "max", value)}
                      />
                    )}
                  </div>
                ))}
              </aside>

              <section className={styles.productsArea}>
                <div className={styles.productsTop}>
                  <p>{visibleProducts.length} products</p>

                  <div className={styles.sortBox}>
                    <button onClick={() => setSortOpen((prev) => !prev)}>
                      Sort by: {sortBy} <span>{sortOpen ? "\u2303" : "\u2304"}</span>
                    </button>

                    {sortOpen && (
                      <div className={styles.sortDropdown}>
                        {sortOptions.map((option) => (
                          <button
                            key={option}
                            onClick={() => {
                              setSortBy(option);
                              setSortOpen(false);
                            }}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className={styles.productGrid}>
                  {visibleProducts.length > 0 ? (
                    visibleProducts.map((product) => (
                      <button
                        key={product.id}
                        className={styles.productCard}
                        onClick={() => selectProduct(product)}
                      >
                        <div className={styles.cardImage}>
                          <img src={product.image} alt={product.name} />
                        </div>

                        <h3>{product.name}</h3>
                        <p>{formatCurrency(product.price)}</p>
                      </button>
                    ))
                  ) : (
                    <div className={styles.emptyProducts}>No live products found.</div>
                  )}
                </div>
              </section>
            </div>
          </section>
        )}
      </main>

      <Footer />
    </>
  );
}
