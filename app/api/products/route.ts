import { getShopProducts } from "@/backend/shop/products";

export const dynamic = "force-dynamic";

export async function GET() {
  const products = await getShopProducts();

  return Response.json({ products });
}
