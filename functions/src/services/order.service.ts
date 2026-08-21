import {db} from "../config/firebase";
import {CartItemWithProduct} from "../types/cart.types";
import {
  CreateOrderInput,
  OrderItem,
  OrderStatus,
  OrderStatusUpdateInput,
  ShippingAddress,
} from "../types/order.types";
import {clearCartRecord, getCartRecord} from "./cart.service";
import {createNotificationRecord} from "./notification.service";

const ordersCollection = db.collection("orders");

const allowedStatuses = new Set<OrderStatus>([
  "pending",
  "paid",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
]);

const allowedTransitions: Record<OrderStatus, OrderStatus[]> = {
  pending: ["processing", "cancelled"],
  paid: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};

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
  body: CreateOrderInput,
  options: {clearCart?: boolean} = {}
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

  if (options.clearCart !== false) {
    await clearCartRecord(uid);
  }

  return {
    status: 201,
    body: {
      success: true,
      message: "Order created successfully",
      order,
    },
  };
};

export const completeCheckoutCartRecord = async (uid: string) => {
  await clearCartRecord(uid);
};

export const rollbackCheckoutOrderRecord = async (
  orderId: string,
  uid: string
) => {
  const orderRef = ordersCollection.doc(orderId);
  const snapshot = await orderRef.get();

  if (!snapshot.exists) {
    return;
  }

  const order = snapshot.data();

  if (order?.uid === uid && order?.paymentStatus !== "paid") {
    await orderRef.delete();
  }
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
  input: OrderStatusUpdateInput,
  actorUid: string,
  actorEmail?: string
) => {
  const status = cleanText(input.status) as OrderStatus;

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

  const order = currentOrder.data() || {};
  const previousStatus = cleanText(order.status) as OrderStatus;
  if (!allowedTransitions[previousStatus]?.includes(status)) {
    return {
      status: 400,
      body: {
        success: false,
        message: `Order cannot move from ${previousStatus} to ${status}`,
      },
    };
  }
  const courier = cleanText(input.courier);
  const trackingNumber = cleanText(input.trackingNumber);
  const cancellationReason = cleanText(input.cancellationReason);
  if (status === "processing" && order.paymentStatus !== "paid") {
    return {
      status: 400,
      body: {success: false, message: "Only paid orders can be processed"},
    };
  }
  if (status === "shipped" && (!courier || !trackingNumber)) {
    return {
      status: 400,
      body: {
        success: false,
        message: "Courier and tracking number are required",
      },
    };
  }
  if (status === "cancelled" && !cancellationReason) {
    return {
      status: 400,
      body: {success: false, message: "Cancellation reason is required"},
    };
  }
  const now = new Date().toISOString();
  const historyEntry = {
    from: previousStatus,
    to: status,
    note: cleanText(input.note),
    actorUid,
    actorEmail: actorEmail || "",
    createdAt: now,
  };

  await orderDoc.update({
    status,
    ...(status === "shipped" ? {
      courier,
      trackingNumber,
      trackingUrl: cleanText(input.trackingUrl),
      estimatedDeliveryAt: cleanText(input.estimatedDeliveryAt),
      shippedAt: now,
    } : {}),
    ...(status === "delivered" ? {deliveredAt: now} : {}),
    ...(status === "cancelled" ? {
      cancellationReason,
      cancelledAt: now,
      refundRequired: order.paymentStatus === "paid",
    } : {}),
    statusHistory: [
      ...(Array.isArray(order.statusHistory) ? order.statusHistory : []),
      historyEntry,
    ],
    updatedAt: now,
  });

  if (input.notifyCustomer !== false && order.uid) {
    const trackingMessage = trackingNumber ?
      ` Tracking: ${trackingNumber}` : "";
    await createNotificationRecord({
      uid: String(order.uid),
      title: `Order ${status}`,
      message: `Your order ${id.slice(0, 8)} is now ${status}.` +
        trackingMessage,
      type: "order",
    });
  }

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
