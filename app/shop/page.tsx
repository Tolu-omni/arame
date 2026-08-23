import { Suspense } from "react";
import { ShopPage } from "@/frontend/components/shop/ShopPage";
import { getShopProducts } from "@/backend/shop/products";

export const dynamic = "force-dynamic";

export default async function Page() {
  const products = await getShopProducts();

  return (
    <Suspense>
      <ShopPage products={products} />
    </Suspense>
  );
}
