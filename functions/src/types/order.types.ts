export interface ShippingAddress {
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  province?: string;
  postalCode?: string;
  country: string;
}

export interface CreateOrderInput {
  shippingAddress?: Partial<ShippingAddress>;
  paymentMethod?: string;
  notes?: string;
}

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl: string;
  lineTotal: number;
}

export type OrderStatus =
  | "pending"
  | "paid"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled";

export interface OrderStatusUpdateInput {
  status?: OrderStatus;
  note?: string;
  notifyCustomer?: boolean;
  courier?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  estimatedDeliveryAt?: string;
  cancellationReason?: string;
}
