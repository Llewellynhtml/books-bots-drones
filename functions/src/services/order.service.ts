import {db} from "../config/firebase";
import {CartItemWithProduct} from "../types/cart.types";
import {
  CreateOrderInput,
  OrderItem,
  OrderStatus,
  ShippingAddress,
} from "../types/order.types";
import {clearCartRecord, getCartRecord} from "./cart.service";

const ordersCollection = db.collection("orders");

const allowedStatuses = new Set<OrderStatus>([
  "pending",
  "paid",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
]);

const cleanText = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const cleanShippingAddress = (input: CreateOrderInput) => {
  const address = input.shippingAddress || {};
  const shippingAddress: ShippingAddress = {
    fullName: cleanText(address.fullName),
    phone: cleanText(address.phone),
    addressLine1: cleanText(address.addressLine1),
    addressLine2: cleanText(address.addressLine2),
    city: cleanText(address.city),
    province: cleanText(address.province),
    postalCode: cleanText(address.postalCode),
    country: cleanText(address.country) || "South Africa",
  };

  if (
    !shippingAddress.fullName ||
    !shippingAddress.phone ||
    !shippingAddress.addressLine1 ||
    !shippingAddress.city ||
    !shippingAddress.country
  ) {
    return null;
  }

  return shippingAddress;
};

const toOrderItem = (item: CartItemWithProduct): OrderItem => {
  const name = cleanText(item.product.name) || "Product";
  const images = Array.isArray(item.product.images) ? item.product.images : [];

  return {
    productId: item.productId,
    name,
    price: Number(item.product.price) || 0,
    quantity: item.quantity,
    imageUrl: images[0] || "",
    lineTotal: item.lineTotal,
  };
};

export const createOrderRecord = async (
  uid: string,
  email: string | undefined,
  body: CreateOrderInput
) => {
  const shippingAddress = cleanShippingAddress(body);

  if (!shippingAddress) {
    return {
      status: 400,
      body: {
        success: false,
        message: "Complete shipping address is required",
      },
    };
  }

  const cart = await getCartRecord(uid);

  if (!cart.cart.length) {
    return {
      status: 400,
      body: {
        success: false,
        message: "Cart is empty",
      },
    };
  }

  const now = new Date().toISOString();
  const docRef = ordersCollection.doc();
  const subtotal = cart.subtotal;
  const shippingFee = subtotal > 0 ? 0 : 0;
  const tax = 0;
  const total = subtotal + shippingFee + tax;
  const order = {
    id: docRef.id,
    uid,
    email: email || "",
    items: cart.cart.map(toOrderItem),
    itemCount: cart.count,
    totalQuantity: cart.totalQuantity,
    subtotal,
    shippingFee,
    tax,
    total,
    status: "pending" as OrderStatus,
    paymentStatus: "unpaid",
    paymentMethod: cleanText(body.paymentMethod) || "manual",
    shippingAddress,
    notes: cleanText(body.notes),
    createdAt: now,
    updatedAt: now,
  };

  await docRef.set(order);
  await clearCartRecord(uid);

  return {
    status: 201,
    body: {
      success: true,
      message: "Order created successfully",
      order,
    },
  };
};

export const getOrderRecords = async (uid: string, role?: string) => {
  let query: FirebaseFirestore.Query = ordersCollection;

  if (role !== "admin") {
    query = query.where("uid", "==", uid);
  }

  const snapshot = await query.orderBy("createdAt", "desc").get();
  const orders = snapshot.docs.map((doc) => doc.data());

  return {
    success: true,
    count: orders.length,
    orders,
  };
};

export const getOrderRecordById = async (
  id: string,
  uid: string,
  role?: string
) => {
  const orderDoc = await ordersCollection.doc(id).get();

  if (!orderDoc.exists) {
    return {
      status: 404,
      body: {
        success: false,
        message: "Order not found",
      },
    };
  }

  const order = orderDoc.data();

  if (role !== "admin" && order?.uid !== uid) {
    return {
      status: 403,
      body: {
        success: false,
        message: "You cannot access this order",
      },
    };
  }

  return {
    status: 200,
    body: {
      success: true,
      order,
    },
  };
};

export const updateOrderStatusRecord = async (
  id: string,
  statusInput: unknown
) => {
  const status = cleanText(statusInput) as OrderStatus;

  if (!allowedStatuses.has(status)) {
    return {
      status: 400,
      body: {
        success: false,
        message: "Invalid order status",
      },
    };
  }

  const orderDoc = ordersCollection.doc(id);
  const currentOrder = await orderDoc.get();

  if (!currentOrder.exists) {
    return {
      status: 404,
      body: {
        success: false,
        message: "Order not found",
      },
    };
  }

  await orderDoc.update({
    status,
    updatedAt: new Date().toISOString(),
  });

  const updatedOrder = await orderDoc.get();

  return {
    status: 200,
    body: {
      success: true,
      message: "Order status updated successfully",
      order: updatedOrder.data(),
    },
  };
};
