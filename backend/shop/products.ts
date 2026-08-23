import { getSupabaseServerClient } from "@/backend/supabase/server";
import type { Product } from "@/frontend/shop/types";

type ProductRow = {
  id: string;
  name: string;
  price: number | string;
  image_path: string | null;
  description: string | null;
  category: string;
  sizes: string[] | null;
  category_tags: string[] | null;
  concentration_tags: string[] | null;
  scent_tags: string[] | null;
  scent_profile_tags: string[] | null;
  size_tags: string[] | null;
};

function mapProduct(row: ProductRow): Product {
  const sizes = row.sizes ?? ["100ml", "200ml"];

  return {
    id: row.id,
    name: row.name,
    price: Number(row.price),
    image: row.image_path || "/images/shop/fresh-fruity-mist.jpg",
    description: row.description ?? "",
    category: row.category,
    sizes,
    categoryTags: row.category_tags ?? [row.category],
    concentrationTags: row.concentration_tags ?? [],
    scentTags: row.scent_tags ?? [],
    scentProfileTags: row.scent_profile_tags ?? [],
    sizeTags: row.size_tags ?? sizes,
  };
}

export async function getShopProducts(): Promise<Product[]> {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("products")
    .select("id,name,price,image_path,description,category,sizes,category_tags,concentration_tags,scent_tags,scent_profile_tags,size_tags")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Error loading shop products:", error);
    return [];
  }

  if (!data?.length) {
    return [];
  }

  return (data as ProductRow[]).map(mapProduct);
}

export async function getShopProduct(id: string): Promise<Product | null> {
  const products = await getShopProducts();

  return products.find((product) => String(product.id) === id) ?? null;
}
