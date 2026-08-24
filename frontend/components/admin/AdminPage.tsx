"use client";

/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/frontend/supabase/browser";
import { useToast } from "@/frontend/context/ToastContext";
import { Header } from "@/frontend/components/shared/Header";
import { Footer } from "@/frontend/components/shared/Footer";
import {
  Plus,
  Search,
  Edit3,
  Trash2,
  Lock,
  X,
  AlertCircle,
  Home,
  Users,
  LogIn,
  ShoppingBag,
  ReceiptText,
  ImageIcon,
  Upload,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import {
  ADMIN_ORDER_STATUSES,
  getOrderStatusLabel,
  getTrackingHref,
  normalizeOrderStatus,
  type OrderStatus,
} from "@/frontend/orders/tracking";
import styles from "./admin-page.module.css";

const PRODUCT_IMAGE_BUCKET = "product-images";
const MAX_PRODUCT_IMAGE_SIZE = 5 * 1024 * 1024;

type DbProductRow = {
  id: string;
  slug: string;
  name: string;
  price: number;
  image_path: string;
  description: string;
  category: string;
  sizes: string[];
  category_tags: string[];
  concentration_tags: string[];
  scent_tags: string[];
  scent_profile_tags: string[];
  size_tags: string[];
  is_active: boolean;
};

type ProfileRow = {
  id: string;
  email: string | null;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type OrderRow = {
  id: string;
  items?: { name?: string; quantity?: number | string }[] | null;
  payment_reference?: string | null;
  shipping_address?: {
    address?: string;
    address_line_2?: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    phone?: string;
  } | null;
  status_updated_at?: string | null;
  tracking_code?: string | null;
  user_id: string | null;
  status: string;
  total: number | string;
  created_at: string | null;
};

type SalesPoint = {
  label: string;
  sales: number;
  orders: number;
};

type CustomerActivity = {
  id: string;
  name: string;
  email: string;
  action: string;
  createdAt: string;
  value?: number;
};

type AdminAnalytics = {
  newCustomers: number;
  signIns: number;
  totalSales: number;
  totalOrders: number;
  salesTrend: SalesPoint[];
  recentCustomers: CustomerActivity[];
  source: "live";
};

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

  return "Unexpected error";
}

function isSupabasePolicyError(error: unknown) {
  const message = getErrorMessage(error).toLowerCase();

  return (
    message.includes("row-level security") ||
    message.includes("permission denied") ||
    message.includes("bucket not found") ||
    message.includes("storage bucket")
  );
}

function getProductAdminErrorMessage(error: unknown, email?: string | null) {
  const message = getErrorMessage(error);

  if (!isSupabasePolicyError(error)) {
    return message;
  }

  const adminEmail = email || "your login email";
  return `Supabase blocked this admin action. Run supabase/product_catalog_policy_fix.sql and supabase/product_image_storage.sql, then make sure ${adminEmail} is listed in the admin email policy.`;
}

function getSafeSlug(value: string) {
  return (
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "product"
  );
}

function getFileExtension(file: File) {
  const nameExtension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "");

  if (nameExtension) {
    return nameExtension;
  }

  return file.type.split("/")[1] || "jpg";
}

function formatCustomerName(profile: ProfileRow) {
  const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(" ");
  return profile.display_name || fullName || profile.email?.split("@")[0] || "Customer";
}

function formatActivityDate(value: string | null) {
  if (!value) {
    return "Recently";
  }

  return new Date(value).toLocaleString("en-NG", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatOrderCustomer(order: OrderRow) {
  const shipping = order.shipping_address;
  const fullName = [shipping?.first_name, shipping?.last_name].filter(Boolean).join(" ");

  return fullName || shipping?.email || (order.user_id ? `Customer ${order.user_id.slice(0, 8)}` : "Guest customer");
}

function formatOrderLocation(order: OrderRow) {
  const shipping = order.shipping_address;
  const cityLine = [shipping?.city, shipping?.state, shipping?.postal_code].filter(Boolean).join(", ");
  const location = [shipping?.address, shipping?.address_line_2, cityLine].filter(Boolean).join(" - ");

  return location || shipping?.phone || "No delivery details";
}

function getLastSevenDays() {
  const today = new Date();

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (6 - index));

    return {
      key: date.toISOString().slice(0, 10),
      label: date.toLocaleDateString("en-US", { weekday: "short" }),
    };
  });
}

function createEmptyAnalytics(): AdminAnalytics {
  return {
    newCustomers: 0,
    signIns: 0,
    totalSales: 0,
    totalOrders: 0,
    salesTrend: getLastSevenDays().map((day) => ({
      label: day.label,
      sales: 0,
      orders: 0,
    })),
    recentCustomers: [],
    source: "live",
  };
}

function buildLiveAnalytics(
  profiles: ProfileRow[],
  orders: OrderRow[],
  signIns?: number
): AdminAnalytics {
  const days = getLastSevenDays();
  const validOrders = orders.filter((order) => order.status?.toLowerCase() !== "cancelled");
  const salesTrend = days.map((day) => {
    const dayOrders = validOrders.filter((order) => order.created_at?.startsWith(day.key));

    return {
      label: day.label,
      sales: dayOrders.reduce((sum, order) => sum + Number(order.total || 0), 0),
      orders: dayOrders.length,
    };
  });

  const profileActivities: CustomerActivity[] = profiles.map((profile) => ({
    id: `profile-${profile.id}`,
    name: formatCustomerName(profile),
    email: profile.email || "No email saved",
    action: "New customer",
    createdAt: formatActivityDate(profile.created_at),
  }));

  const orderActivities: CustomerActivity[] = validOrders.slice(0, 4).map((order) => ({
    id: `order-${order.id}`,
    name: order.user_id ? `Customer ${order.user_id.slice(0, 8)}` : "Guest customer",
    email: order.user_id || "Guest checkout",
    action: "Placed order",
    createdAt: formatActivityDate(order.created_at),
    value: Number(order.total || 0),
  }));

  return {
    newCustomers: profiles.length,
    signIns: signIns ?? profiles.length,
    totalSales: validOrders.reduce((sum, order) => sum + Number(order.total || 0), 0),
    totalOrders: validOrders.length,
    salesTrend,
    recentCustomers: [...profileActivities, ...orderActivities].slice(0, 6),
    source: "live",
  };
}

export function AdminPage() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const { addToast } = useToast();

  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState("");
  const [rawProducts, setRawProducts] = useState<DbProductRow[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AdminAnalytics>(() => createEmptyAnalytics());
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [analyticsError, setAnalyticsError] = useState("");
  const [adminOrders, setAdminOrders] = useState<OrderRow[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState("");
  const [updatingOrderId, setUpdatingOrderId] = useState("");

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState("");

  // CRUD Modals
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [activeProduct, setActiveProduct] = useState<DbProductRow | null>(null);

  // Form Fields
  const [formName, setFormName] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formCategory, setFormCategory] = useState("Women's Perfumes");
  const [formImage, setFormImage] = useState("/images/shop/fresh-fruity-mist.jpg");
  const [formImageFile, setFormImageFile] = useState<File | null>(null);
  const [formImagePreview, setFormImagePreview] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formSizes, setFormSizes] = useState<string[]>(["100ml"]);
  const [formIsActive, setFormIsActive] = useState(true);
  const [savingProduct, setSavingProduct] = useState(false);

  // Tag Form Fields
  const [formConcentration, setFormConcentration] = useState("Eau de Parfum");
  const [formScentTags, setFormScentTags] = useState("");
  const [formScentProfileTags, setFormScentProfileTags] = useState("");

  // Check Admin Authorization
  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "toluomoniyi@gmail.com";
  const ADMIN_EMAILS = useMemo(() => {
    return [
      adminEmail.toLowerCase().trim(),
      "toluomoniyi9@gmail.com",
      "toluomoniyi@gmail.com",
      "tolu@arame.com",
    ];
  }, [adminEmail]);

  const isAdmin = useMemo(() => {
    if (!user || !user.email) return false;
    return ADMIN_EMAILS.includes(user.email.toLowerCase().trim());
  }, [user, ADMIN_EMAILS]);

  // Load Auth Session
  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false);
      return;
    }

    let cancelled = false;
    const client = supabase;

    async function loadSession() {
      try {
        const { data, error } = await client.auth.getSession();

        if (error) {
          throw error;
        }

        if (!cancelled) {
          setAuthError("");
          setUser(data.session?.user ?? null);
        }
      } catch (error) {
        console.error("Error verifying admin access:", error);

        if (!cancelled) {
          setUser(null);
          setAuthError(`Unable to verify admin access: ${getErrorMessage(error)}`);
        }
      } finally {
        if (!cancelled) {
          setAuthLoading(false);
        }
      }
    }

    void loadSession();

    const { data: authListener } = client.auth.onAuthStateChange((_event, session) => {
      if (!cancelled) {
        setAuthError("");
        setUser(session?.user ?? null);
        setAuthLoading(false);
      }
    });

    return () => {
      cancelled = true;
      authListener.subscription.unsubscribe();
    };
  }, [supabase]);

  const fetchAnalytics = useCallback(async () => {
    if (!supabase) {
      setAnalytics(createEmptyAnalytics());
      setAnalyticsError("Supabase is not configured. Add the Supabase environment keys to load live dashboard data.");
      setAnalyticsLoading(false);
      return;
    }

    const since = new Date();
    since.setDate(since.getDate() - 6);
    since.setHours(0, 0, 0, 0);
    const sinceIso = since.toISOString();

    try {
      setAnalyticsLoading(true);
      setAnalyticsError("");

      const [profilesResult, ordersResult, signInsResult] = await Promise.all([
        supabase
          .from("profiles")
          .select("id,email,display_name,first_name,last_name,created_at,updated_at")
          .gte("created_at", sinceIso)
          .order("created_at", { ascending: false })
          .limit(8),
        supabase
          .from("orders")
          .select("id,user_id,status,total,created_at")
          .gte("created_at", sinceIso)
          .order("created_at", { ascending: false })
          .limit(100),
        supabase
          .from("sign_in_events")
          .select("id", { count: "exact", head: true })
          .gte("created_at", sinceIso),
      ]);

      if (profilesResult.error || ordersResult.error) {
        throw profilesResult.error || ordersResult.error;
      }

      setAnalytics(
        buildLiveAnalytics(
          (profilesResult.data ?? []) as ProfileRow[],
          (ordersResult.data ?? []) as OrderRow[],
          signInsResult.error ? 0 : signInsResult.count ?? 0
        )
      );

      if (signInsResult.error) {
        setAnalyticsError(`Sign-in tracking is not live yet: ${signInsResult.error.message}`);
      }
    } catch (error) {
      console.error("Error loading live admin analytics:", error);
      setAnalytics(createEmptyAnalytics());
      setAnalyticsError(`Live dashboard data unavailable: ${getErrorMessage(error)}`);
    } finally {
      setAnalyticsLoading(false);
    }
  }, [supabase]);

  // Load Products (Admins can view ALL active and inactive products)
  const fetchProducts = useCallback(async () => {
    if (!supabase) {
      setRawProducts([]);
      setDataLoading(false);
      addToast({
        message: "Supabase is not configured. Product catalog requires live Supabase data.",
        type: "error",
      });
      return;
    }

    try {
      setDataLoading(true);
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("sort_order", { ascending: true });

      if (error) {
        throw error;
      }

      if (data) {
        setRawProducts(data as DbProductRow[]);
      }
    } catch (error) {
      console.error("Error loading products:", error);
      addToast({
        message: `Failed to load products: ${getProductAdminErrorMessage(error, user?.email)}`,
        type: "error",
      });
    } finally {
      setDataLoading(false);
    }
  }, [addToast, supabase, user?.email]);

  const fetchOrders = useCallback(async () => {
    if (!supabase) {
      setAdminOrders([]);
      setOrdersError("Supabase is not configured. Order tracking requires live Supabase data.");
      setOrdersLoading(false);
      return;
    }

    try {
      setOrdersLoading(true);
      setOrdersError("");

      const { data, error } = await supabase
        .from("orders")
        .select("id,user_id,status,total,created_at,status_updated_at,tracking_code,payment_reference,shipping_address,items")
        .order("created_at", { ascending: false })
        .limit(8);

      if (error) {
        throw error;
      }

      setAdminOrders((data ?? []) as OrderRow[]);
    } catch (error) {
      console.error("Error loading admin orders:", error);
      setAdminOrders([]);
      setOrdersError(`Order tracking unavailable: ${getErrorMessage(error)}`);
    } finally {
      setOrdersLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    if (isAdmin) {
      void fetchAnalytics();
      void fetchProducts();
      void fetchOrders();
    }
  }, [fetchAnalytics, fetchOrders, fetchProducts, isAdmin]);

  // Auto-generate slug from name
  useEffect(() => {
    if (!activeProduct) {
      const generated = formName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      setFormSlug(generated);
    }
  }, [formName, activeProduct]);

  // Open Form for Add
  const handleOpenAdd = () => {
    setActiveProduct(null);
    setFormName("");
    setFormSlug("");
    setFormPrice("");
    setFormCategory("Women's Perfumes");
    setFormImage("/images/shop/fresh-fruity-mist.jpg");
    setFormImageFile(null);
    setFormImagePreview("");
    setFormDesc("");
    setFormSizes(["100ml"]);
    setFormIsActive(true);
    setFormConcentration("Eau de Parfum");
    setFormScentTags("");
    setFormScentProfileTags("");
    setFormOpen(true);
  };

  // Open Form for Edit
  const handleOpenEdit = (prod: DbProductRow) => {
    setActiveProduct(prod);
    setFormName(prod.name);
    setFormSlug(prod.slug);
    setFormPrice(String(prod.price));
    setFormCategory(prod.category);
    setFormImage(prod.image_path);
    setFormImageFile(null);
    setFormImagePreview("");
    setFormDesc(prod.description || "");
    setFormSizes(prod.sizes || ["100ml"]);
    setFormIsActive(prod.is_active);
    setFormConcentration(prod.concentration_tags?.[0] || "Eau de Parfum");
    setFormScentTags((prod.scent_tags || []).join(", "));
    setFormScentProfileTags((prod.scent_profile_tags || []).join(", "));
    setFormOpen(true);
  };

  // Toggle Sizes
  const handleToggleSize = (size: string) => {
    setFormSizes((prev) =>
      prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]
    );
  };

  const handleProductImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      addToast({ message: "Please choose an image file.", type: "error" });
      event.target.value = "";
      return;
    }

    if (file.size > MAX_PRODUCT_IMAGE_SIZE) {
      addToast({ message: "Product image must be 5MB or smaller.", type: "error" });
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setFormImagePreview(reader.result);
      }
    };

    reader.readAsDataURL(file);
    setFormImageFile(file);
  };

  const uploadProductImage = async (file: File) => {
    if (!supabase) {
      throw new Error("Supabase is not configured. Product image was not uploaded.");
    }

    const extension = getFileExtension(file);
    const productSlug = getSafeSlug(formSlug || formName);
    const filePath = `${productSlug}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 10)}.${extension}`;

    const { error } = await supabase.storage.from(PRODUCT_IMAGE_BUCKET).upload(filePath, file, {
      contentType: file.type || "image/jpeg",
      upsert: true,
    });

    if (error) {
      throw error;
    }

    const { data } = supabase.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(filePath);

    if (!data.publicUrl) {
      throw new Error("Unable to get uploaded product image URL.");
    }

    return data.publicUrl;
  };

  // Save Product (Insert or Update)
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formName.trim() || !formSlug.trim() || !formPrice.trim()) {
      addToast({ message: "Please fill in all required fields.", type: "error" });
      return;
    }

    if (!formImage.trim() && !formImageFile) {
      addToast({ message: "Please choose a product image or enter an image path.", type: "error" });
      return;
    }

    if (formSizes.length === 0) {
      addToast({ message: "Please choose at least one product size.", type: "error" });
      return;
    }

    const priceNum = Number(formPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      addToast({ message: "Price must be a valid positive number.", type: "error" });
      return;
    }

    const scentArray = formScentTags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const profileArray = formScentProfileTags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    if (!supabase) {
      addToast({
        message: "Supabase is not configured. Product changes were not saved.",
        type: "error",
      });
      return;
    }

    try {
      setSavingProduct(true);

      const imagePath = formImageFile ? await uploadProductImage(formImageFile) : formImage.trim();
      const payload = {
        name: formName.trim(),
        slug: formSlug.trim(),
        price: priceNum,
        category: formCategory,
        image_path: imagePath,
        description: formDesc.trim(),
        sizes: formSizes,
        is_active: formIsActive,
        category_tags: [formCategory],
        concentration_tags: [formConcentration],
        scent_tags: scentArray,
        scent_profile_tags: profileArray,
        size_tags: formSizes,
        updated_at: new Date().toISOString(),
      };

      if (activeProduct) {
        // Edit existing product
        const { error } = await supabase
          .from("products")
          .update(payload)
          .eq("id", activeProduct.id);

        if (error) throw error;
        addToast({ message: "Product updated successfully!", type: "success" });
      } else {
        // Insert new product
        const { error } = await supabase.from("products").insert(payload);

        if (error) throw error;
        addToast({ message: "New product created successfully!", type: "success" });
      }

      setFormImage(imagePath);
      setFormImageFile(null);
      setFormImagePreview("");
      setFormOpen(false);
      void fetchProducts();
    } catch (error) {
      console.error("Error saving product:", error);
      addToast({
        message: `Failed to save product: ${getProductAdminErrorMessage(error, user?.email)}`,
        type: "error",
      });
    } finally {
      setSavingProduct(false);
    }
  };

  // Open Delete Confirmation
  const handleOpenDelete = (prod: DbProductRow) => {
    setActiveProduct(prod);
    setDeleteOpen(true);
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!activeProduct) return;

    if (!supabase) {
      addToast({
        message: "Supabase is not configured. Product was not deleted.",
        type: "error",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", activeProduct.id);

      if (error) throw error;

      addToast({ message: "Product deleted successfully.", type: "success" });
      setDeleteOpen(false);
      void fetchProducts();
    } catch (error) {
      console.error("Error deleting product:", error);
      addToast({
        message: `Failed to delete product: ${getProductAdminErrorMessage(error, user?.email)}`,
        type: "error",
      });
    }
  };

  const handleOrderStatusChange = async (orderId: string, status: OrderStatus) => {
    if (!supabase) {
      addToast({
        message: "Supabase is not configured. Order status was not updated.",
        type: "error",
      });
      return;
    }

    try {
      setUpdatingOrderId(orderId);

      const { error } = await supabase
        .from("orders")
        .update({
          status,
          status_updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);

      if (error) {
        throw error;
      }

      setAdminOrders((current) =>
        current.map((order) =>
          order.id === orderId
            ? { ...order, status, status_updated_at: new Date().toISOString() }
            : order
        )
      );
      addToast({ message: "Order status updated.", type: "success" });
      void fetchAnalytics();
      void fetchOrders();
    } catch (error) {
      console.error("Error updating order status:", error);
      addToast({
        message: `Failed to update order: ${getErrorMessage(error)}`,
        type: "error",
      });
    } finally {
      setUpdatingOrderId("");
    }
  };

  // Calculations
  const stats = useMemo(() => {
    const total = rawProducts.length;
    const active = rawProducts.filter((p) => p.is_active).length;
    const avgPrice = total > 0 ? rawProducts.reduce((sum, p) => sum + Number(p.price), 0) / total : 0;
    return { total, active, avgPrice };
  }, [rawProducts]);

  const maxTrendSales = useMemo(() => {
    return Math.max(...analytics.salesTrend.map((point) => point.sales), 1);
  }, [analytics.salesTrend]);

  // Filtered List
  const filteredProducts = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return rawProducts;

    return rawProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        p.category.toLowerCase().includes(term) ||
        (p.description && p.description.toLowerCase().includes(term))
    );
  }, [rawProducts, searchTerm]);

  const productImagePreviewSrc = formImagePreview || formImage;

  // Format Currency
  const formatPrice = (price: number) => `₦${price.toFixed(2)}`;
  const formatCompactPrice = (price: number) => {
    if (price < 1000) {
      return formatPrice(price);
    }

    return `₦${new Intl.NumberFormat("en-NG", {
      maximumFractionDigits: 1,
      notation: "compact",
    }).format(price)}`;
  };

  // Loading Screen
  if (authLoading) {
    return (
      <div className={styles.adminPage}>
        <Header variant="shop" />
        <div className={styles.loadingScreen}>
          <div className={styles.spinner} />
          <p>Verifying access...</p>
        </div>
        <Footer />
      </div>
    );
  }

  // Access Denied Screen
  if (!isAdmin) {
    return (
      <div className={styles.adminPage}>
        <Header variant="shop" />
        <main className={styles.adminMain}>
          <div className={styles.accessDenied}>
            <div className={styles.deniedIconBox}>
              <Lock size={36} />
            </div>
            <h2>Access Denied</h2>
            <p>
              This is a restricted administration panel. If you are the store owner,
              please log in using your administrator email account on the Settings page.
            </p>
            {authError && <div className={styles.errorMsg}>{authError}</div>}
            <div style={{ display: "flex", gap: "16px" }}>
              <Link href="/" className={`${styles.btn} ${styles.btnPrimary}`}>
                <Home size={16} /> Return Home
              </Link>
              <Link href="/account" className={`${styles.btn} ${styles.btnSecondary}`}>
                Go to Sign In
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className={styles.adminPage}>
      <Header variant="shop" />

      <main className={styles.adminMain}>
        <div className={styles.topBar}>
          <div>
            <h1>Admin Panel</h1>
            <p style={{ margin: "4px 0 0", color: "#605149" }}>
              Welcome back, <strong>{user?.email}</strong>. Manage your shop catalog.
            </p>
          </div>

          <button
            type="button"
            className={`${styles.btn} ${styles.btnPrimary}`}
            onClick={handleOpenAdd}
          >
            <Plus size={18} /> Add New Product
          </button>
        </div>

        <section className={styles.dashboardGrid}>
          <div className={styles.metricCard}>
            <div className={styles.metricIcon}>
              <Users size={20} />
            </div>
            <span className={styles.metricLabel}>New Customers</span>
            <strong className={styles.metricValue}>
              {analyticsLoading ? "..." : analytics.newCustomers}
            </strong>
            <span className={styles.metricMeta}>Last 7 days</span>
          </div>

          <div className={styles.metricCard}>
            <div className={styles.metricIcon}>
              <LogIn size={20} />
            </div>
            <span className={styles.metricLabel}>Sign Ins</span>
            <strong className={styles.metricValue}>
              {analyticsLoading ? "..." : analytics.signIns}
            </strong>
            <span className={styles.metricMeta}>Last 7 days</span>
          </div>

          <div className={styles.metricCard}>
            <div className={styles.metricIcon}>
              <ShoppingBag size={20} />
            </div>
            <span className={styles.metricLabel}>Total Sales</span>
            <strong
              className={styles.metricValue}
              title={analyticsLoading ? undefined : formatPrice(analytics.totalSales)}
            >
              {analyticsLoading ? "..." : formatCompactPrice(analytics.totalSales)}
            </strong>
            <span className={styles.metricMeta}>Last 7 days</span>
          </div>

          <div className={styles.metricCard}>
            <div className={styles.metricIcon}>
              <ReceiptText size={20} />
            </div>
            <span className={styles.metricLabel}>Orders</span>
            <strong className={styles.metricValue}>
              {analyticsLoading ? "..." : analytics.totalOrders}
            </strong>
            <span className={styles.metricMeta}>Last 7 days</span>
          </div>
        </section>

        <section className={styles.dashboardPanels}>
          <div className={styles.chartPanel}>
            <div className={styles.panelHeader}>
              <div>
                <h2>Sales Graph</h2>
                <p>Daily revenue and order movement.</p>
              </div>
              <span className={styles.sourceBadge}>Live</span>
            </div>

            {analyticsError && (
              <div className={styles.liveDataNotice}>
                <AlertCircle size={16} />
                <span>{analyticsError}</span>
              </div>
            )}

            {analyticsLoading ? (
              <div className={styles.panelLoading}>
                <div className={styles.spinner} />
              </div>
            ) : (
              <div className={styles.barChart} aria-label="Sales graph for the last 7 days">
                {analytics.salesTrend.map((point) => {
                  const height = point.sales > 0 ? Math.max((point.sales / maxTrendSales) * 100, 12) : 4;

                  return (
                    <div className={styles.barColumn} key={point.label}>
                      <div className={styles.barValue}>{point.orders}</div>
                      <div className={styles.barTrack}>
                        <div
                          className={styles.barFill}
                          style={{ height: `${height}%` }}
                          title={`${formatPrice(point.sales)} across ${point.orders} orders`}
                        />
                      </div>
                      <div className={styles.barLabel}>{point.label}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className={styles.activityPanel}>
            <div className={styles.panelHeader}>
              <div>
                <h2>Customer Activity</h2>
                <p>New customers, sign-ins and orders.</p>
              </div>
            </div>

            <div className={styles.activityList}>
              {analytics.recentCustomers.length === 0 ? (
                <div className={styles.emptyActivity}>No customer activity yet.</div>
              ) : (
                analytics.recentCustomers.map((customer) => (
                  <div className={styles.activityItem} key={customer.id}>
                    <div className={styles.activityAvatar}>
                      {customer.name.charAt(0).toUpperCase()}
                    </div>
                    <div className={styles.activityText}>
                      <strong>{customer.name}</strong>
                      <span>{customer.action} - {customer.createdAt}</span>
                      <small>{customer.email}</small>
                    </div>
                    {customer.value ? (
                      <div className={styles.activityAmount}>{formatPrice(customer.value)}</div>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        <section className={`${styles.tableCard} ${styles.orderTrackingCard}`}>
          <div className={styles.tableHeader}>
            <div>
              <h2>Order Tracking</h2>
              <p className={styles.tableSubtext}>Recent receipts and delivery movement.</p>
            </div>

            <button
              type="button"
              className={`${styles.btn} ${styles.btnSecondary}`}
              onClick={() => void fetchOrders()}
              disabled={ordersLoading}
            >
              <RefreshCw size={16} className={ordersLoading ? styles.spinning : ""} /> Refresh
            </button>
          </div>

          {ordersError && (
            <div className={styles.liveDataNotice}>
              <AlertCircle size={16} />
              <span>{ordersError}</span>
            </div>
          )}

          {ordersLoading ? (
            <div className={styles.tableLoading}>
              <div className={styles.spinner} />
            </div>
          ) : adminOrders.length === 0 ? (
            <div className={styles.emptyTableState}>No orders to track yet.</div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.productTable}>
                <thead>
                  <tr>
                    <th>Receipt</th>
                    <th>Customer</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Track</th>
                  </tr>
                </thead>
                <tbody>
                  {adminOrders.map((order) => (
                    <tr key={order.id}>
                      <td>
                        <div className={styles.orderRefCell}>
                          <strong>{order.id.slice(0, 8).toUpperCase()}</strong>
                          <span>{formatActivityDate(order.created_at)}</span>
                          {order.tracking_code && <small>{order.tracking_code}</small>}
                        </div>
                      </td>
                      <td>
                        <div className={styles.orderCustomerCell}>
                          <strong>{formatOrderCustomer(order)}</strong>
                          <span>{formatOrderLocation(order)}</span>
                        </div>
                      </td>
                      <td><strong>{formatPrice(Number(order.total || 0))}</strong></td>
                      <td>
                        <div className={styles.statusControl}>
                          <span className={`${styles.badge} ${styles[`orderStatus_${normalizeOrderStatus(order.status)}`] || styles.orderStatus_pending}`}>
                            {getOrderStatusLabel(order.status)}
                          </span>
                          <select
                            aria-label={`Update order ${order.id} status`}
                            value={normalizeOrderStatus(order.status) === "fulfilled" ? "delivered" : normalizeOrderStatus(order.status)}
                            onChange={(event) => handleOrderStatusChange(order.id, event.target.value as OrderStatus)}
                            disabled={updatingOrderId === order.id}
                          >
                            {ADMIN_ORDER_STATUSES.map((status) => (
                              <option key={status} value={status}>
                                {getOrderStatusLabel(status)}
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>
                      <td>
                        <Link className={styles.trackLink} href={getTrackingHref(order.id, order.tracking_code)}>
                          <ExternalLink size={15} /> Open
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div className={styles.sectionTitleRow}>
          <h2>Catalog Health</h2>
        </div>

        {/* Stats Row */}
        <section className={styles.statsRow}>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Total Products</div>
            <div className={styles.statValue}>{stats.total}</div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statLabel}>Active in Catalog</div>
            <div className={styles.statValue}>{stats.active}</div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statLabel}>Average Price</div>
            <div className={styles.statValue} title={formatPrice(stats.avgPrice)}>
              {formatCompactPrice(stats.avgPrice)}
            </div>
          </div>
        </section>

        {/* Inventory Table Card */}
        <section className={styles.tableCard}>
          <div className={styles.tableHeader}>
            <h2>Product Catalog</h2>

            <div className={styles.tableSearch}>
              <span className={styles.searchIcon}>
                <Search size={16} />
              </span>
              <input
                type="text"
                placeholder="Search products by name or category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {dataLoading ? (
            <div style={{ padding: "48px", display: "flex", justifyContent: "center" }}>
              <div className={styles.spinner} />
            </div>
          ) : filteredProducts.length === 0 ? (
            <div style={{ padding: "48px 24px", textAlign: "center", color: "#605149" }}>
              <AlertCircle style={{ margin: "0 auto 12px", color: "#8b7c72" }} size={32} />
              <p>No products found matching your search.</p>
            </div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.productTable}>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Category</th>
                    <th>Price</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product) => (
                    <tr key={product.id}>
                      <td>
                        <div className={styles.productRowCell}>
                          <img
                            className={styles.productThumb}
                            src={product.image_path}
                            alt=""
                          />
                          <div>
                            <span className={styles.productTitle}>{product.name}</span>
                            <div style={{ fontSize: "12px", color: "#8b7c72", marginTop: "2px" }}>
                              {product.sizes?.join(", ") || "100ml"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>{product.category}</td>
                      <td><strong>{formatPrice(Number(product.price))}</strong></td>
                      <td>
                        <span
                          className={`${styles.badge} ${
                            product.is_active ? styles.badgeActive : styles.badgeInactive
                          }`}
                        >
                          {product.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td>
                        <div className={styles.actionsCell}>
                          <button
                            type="button"
                            className={styles.btnIcon}
                            title="Edit Product"
                            onClick={() => handleOpenEdit(product)}
                          >
                            <Edit3 size={16} />
                          </button>
                          <button
                            type="button"
                            className={`${styles.btnIcon} ${styles.btnIconDanger}`}
                            title="Delete Product"
                            onClick={() => handleOpenDelete(product)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {/* ADD / EDIT MODAL */}
      {formOpen && (
        <div
          className={styles.modalOverlay}
          onClick={() => {
            if (!savingProduct) setFormOpen(false);
          }}
        >
          <form
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleSaveProduct}
          >
            <div className={styles.modalHeader}>
              <h3>{activeProduct ? "Edit Product" : "Add New Product"}</h3>
              <button
                type="button"
                className={styles.btnClose}
                onClick={() => setFormOpen(false)}
                disabled={savingProduct}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.formGrid}>
                {/* Name */}
                <div className={styles.formGroup}>
                  <label htmlFor="prodName">Product Name *</label>
                  <input
                    id="prodName"
                    type="text"
                    required
                    placeholder="e.g. Celestial Scent"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                  />
                </div>

                {/* Slug & Price */}
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label htmlFor="prodSlug">Slug (Auto-generated) *</label>
                    <input
                      id="prodSlug"
                      type="text"
                      required
                      placeholder="e.g. celestial-scent"
                      value={formSlug}
                      onChange={(e) => setFormSlug(e.target.value)}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="prodPrice">Price (NGN) *</label>
                    <input
                      id="prodPrice"
                      type="number"
                      required
                      min="1"
                      step="0.01"
                      placeholder="130"
                      value={formPrice}
                      onChange={(e) => setFormPrice(e.target.value)}
                    />
                  </div>
                </div>

                {/* Category & Image */}
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label htmlFor="prodCat">Category *</label>
                    <select
                      id="prodCat"
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                    >
                      <option value="Women's Perfumes">Women&apos;s Perfumes</option>
                      <option value="Men's Perfumes">Men&apos;s Perfumes</option>
                      <option value="Body Oils">Body Oils</option>
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="prodImg">Product Image *</label>
                    <div className={styles.imageUploadBox}>
                      <div className={styles.imagePreviewBox}>
                        {productImagePreviewSrc ? (
                          <img src={productImagePreviewSrc} alt={formName || "Product preview"} />
                        ) : (
                          <ImageIcon size={24} />
                        )}
                      </div>

                      <div className={styles.imageUploadControls}>
                        <input
                          id="prodImageFile"
                          type="file"
                          accept="image/*"
                          hidden
                          onChange={handleProductImageChange}
                        />
                        <label
                          htmlFor="prodImageFile"
                          className={`${styles.btn} ${styles.btnSecondary} ${styles.fileUploadButton}`}
                        >
                          <Upload size={16} /> Choose File
                        </label>
                        {formImageFile && (
                          <span className={styles.fileName}>{formImageFile.name}</span>
                        )}
                      </div>
                    </div>
                    <input
                      id="prodImg"
                      type="text"
                      placeholder="Image URL or /images/shop/file.jpg"
                      value={formImage}
                      onChange={(e) => {
                        setFormImage(e.target.value);
                        setFormImageFile(null);
                        setFormImagePreview("");
                      }}
                    />
                  </div>
                </div>

                {/* Description */}
                <div className={styles.formGroup}>
                  <label htmlFor="prodDesc">Description</label>
                  <textarea
                    id="prodDesc"
                    rows={3}
                    placeholder="Enter product description, notes, sillage details..."
                    value={formDesc}
                    onChange={(e) => setFormDesc(e.target.value)}
                  />
                </div>

                {/* Sizes Checkbox */}
                <div className={styles.formGroup}>
                  <label>Available Sizes *</label>
                  <div className={styles.checkboxList}>
                    <label className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={formSizes.includes("100ml")}
                        onChange={() => handleToggleSize("100ml")}
                      />
                      100ml
                    </label>
                    <label className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={formSizes.includes("200ml")}
                        onChange={() => handleToggleSize("200ml")}
                      />
                      200ml
                    </label>
                  </div>
                </div>

                {/* Concentration, Scents and Profile Tags (Accordion filtering support) */}
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label htmlFor="prodConcentration">Concentration</label>
                    <select
                      id="prodConcentration"
                      value={formConcentration}
                      onChange={(e) => setFormConcentration(e.target.value)}
                    >
                      <option value="Eau de Parfum">Eau de Parfum (EDP)</option>
                      <option value="Eau de Toilette">Eau de Toilette (EDT)</option>
                      <option value="Parfum">Parfum / Extrait</option>
                      <option value="Cologne">Cologne (EDC)</option>
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="prodScent">Scent Ingredients (comma separated)</label>
                    <input
                      id="prodScent"
                      type="text"
                      placeholder="e.g. Jasmine, Vanilla, Lavender"
                      value={formScentTags}
                      onChange={(e) => setFormScentTags(e.target.value)}
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="prodScentProfile">Scent Profiles (comma separated)</label>
                  <input
                    id="prodScentProfile"
                    type="text"
                    placeholder="e.g. Rose, Woody, Sweet"
                    value={formScentProfileTags}
                    onChange={(e) => setFormScentProfileTags(e.target.value)}
                  />
                </div>

                {/* Status Toggle */}
                <label className={styles.toggleLabel}>
                  <input
                    type="checkbox"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                  />
                  <span>Active in Store Catalog (visible to customers)</span>
                </label>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnSecondary}`}
                onClick={() => setFormOpen(false)}
                disabled={savingProduct}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`${styles.btn} ${styles.btnPrimary}`}
                disabled={savingProduct}
              >
                {savingProduct ? "Saving..." : "Save Product"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* DELETE CONFIRM MODAL */}
      {deleteOpen && activeProduct && (
        <div className={styles.modalOverlay} onClick={() => setDeleteOpen(false)}>
          <div
            className={`${styles.modalContent} ${styles.confirmModalContent}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h3>Delete Product</h3>
              <button
                type="button"
                className={styles.btnClose}
                onClick={() => setDeleteOpen(false)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className={styles.modalBody}>
              <p style={{ margin: 0, fontSize: "16px", lineHeight: "1.5" }}>
                Are you sure you want to delete <strong>{activeProduct.name}</strong>?
                This action is permanent and cannot be undone.
              </p>
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnSecondary}`}
                onClick={() => setDeleteOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnDanger}`}
                onClick={handleConfirmDelete}
              >
                Delete Product
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
