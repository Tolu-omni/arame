import { getShopProduct } from "@/backend/shop/products";

export async function GET(_request: Request, context: RouteContext<"/api/products/[id]">) {
  const { id } = await context.params;
  const product = await getShopProduct(id);

  if (!product) {
    return Response.json({ product: null, id }, { status: 404 });
  }

  return Response.json({ product });
}
