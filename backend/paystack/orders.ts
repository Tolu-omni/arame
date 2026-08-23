import { getShopProducts } from "@/backend/shop/products";

export type CheckoutItemInput = {
  product_id: string | number;
  quantity: string | number;
  size?: string;
};

export type ShippingInput = {
  first_name?: string;
  last_name?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  phone?: string;
};

export type OrderItem = {
  product_id: string;
  image: string;
  name: string;
  price: number;
  quantity: number;
  size: string;
};

export function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization") || "";
  const [scheme, token] = authorization.split(" ");

  if (scheme.toLowerCase() !== "bearer" || !token) {
    return "";
  }

  return token;
}

export async function buildVerifiedOrderItems(items: CheckoutItemInput[]) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("Cart is empty.");
  }

  const products = await getShopProducts();
  const productsById = new Map(products.map((product) => [String(product.id), product]));

  const orderItems = items.map((item) => {
    const product = productsById.get(String(item.product_id));

    if (!product) {
      throw new Error("A cart product is no longer available.");
    }

    const quantity = Math.max(1, Math.floor(Number(item.quantity || 1)));

    return {
      product_id: String(product.id),
      image: product.image,
      name: product.name,
      price: product.price,
      quantity,
      size: item.size || product.sizes[0] || "100ml",
    };
  });

  const total = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return { orderItems, total };
}
