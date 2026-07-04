export interface CartItem {
  productId: string;
  quantity: number;
  addedAt: string;
  updatedAt: string;
}

export interface CartProduct {
  id?: string;
  name?: string;
  price?: number;
  stock?: number;
  images?: string[];
  [key: string]: unknown;
}

export interface CartItemWithProduct {
  productId: string;
  quantity: number;
  addedAt: string;
  updatedAt: string;
  product: CartProduct;
  lineTotal: number;
}
