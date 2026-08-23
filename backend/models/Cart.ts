export type CartItemModel = {
  product_id: string | number;
  name: string;
  price: number;
  image: string;
  size: string;
  quantity: number;
};

export type CartModel = {
  items: CartItemModel[];
  subtotal: number;
};
