/* eslint-disable max-len */
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
import {validatePromotionRecord} from "./promotion.service";

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
  let discountAmount = 0;
  let promotionCode = "";
  if (cleanText(body.promotionCode)) {
    const promotion = await validatePromotionRecord(body.promotionCode, subtotal);
    if (promotion.status !== 200 || !promotion.body.promotion) {
      return {status: promotion.status, body: {success: false, message: promotion.body.message}};
    }
    discountAmount = Number(promotion.body.discountAmount) || 0;
    promotionCode = promotion.body.promotion.code;
  }
  const total = subtotal - discountAmount + shippingFee + tax;
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
    paymentStatus: cleanText(body.paymentMethod) === "paystack" ? "unpaid" : "due_on_delivery",
    paymentMethod: cleanText(body.paymentMethod) === "paystack" ? "paystack" : "pay_on_delivery",
    promotionCode,
    discountAmount,
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
  if (status === "processing" && order.paymentStatus !== "paid" && order.paymentMethod !== "pay_on_delivery") {
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
    ...(status === "delivered" ? {deliveredAt: now, ...(order.paymentMethod === "pay_on_delivery" ? {paymentStatus: "paid", paidAt: now} : {})} : {}),
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

export const cancelCustomerOrderRecord = async (id: string, uid: string, reasonInput: unknown) => {
  const ref = ordersCollection.doc(id);
  const snapshot = await ref.get();
  if (!snapshot.exists) return {status: 404, body: {success: false, message: "Order not found"}};
  const order = snapshot.data() || {};
  if (order.uid !== uid) return {status: 403, body: {success: false, message: "You cannot cancel this order"}};
  if (["delivered", "cancelled"].includes(order.status)) return {status: 400, body: {success: false, message: "This order can no longer be cancelled"}};
  const reason = cleanText(reasonInput);
  if (!reason) return {status: 400, body: {success: false, message: "Cancellation reason is required"}};
  const now = new Date().toISOString();
  await ref.update({status: "cancelled", cancellationReason: reason, cancelledAt: now, refundRequired: order.paymentStatus === "paid", updatedAt: now,
    statusHistory: [...(Array.isArray(order.statusHistory) ? order.statusHistory : []), {from: order.status, to: "cancelled", note: reason, actorUid: uid, createdAt: now}]});
  return {status: 200, body: {success: true, message: "Order cancelled", refundRequired: order.paymentStatus === "paid"}};
};

export const createReturnRequestRecord = async (id: string, uid: string, input: Record<string, unknown>) => {
  const orderSnapshot = await ordersCollection.doc(id).get();
  if (!orderSnapshot.exists) return {status: 404, body: {success: false, message: "Order not found"}};
  const order = orderSnapshot.data() || {};
  if (order.uid !== uid) return {status: 403, body: {success: false, message: "You cannot return this order"}};
  if (order.status !== "delivered" || !order.deliveredAt) return {status: 400, body: {success: false, message: "Only delivered orders can be returned"}};
  const returnDeadline = new Date(order.deliveredAt).getTime() + 30 * 24 * 60 * 60 * 1000;
  if (Date.now() > returnDeadline) return {status: 400, body: {success: false, message: "The 30-day return period has ended"}};
  const reason = cleanText(input.reason);
  if (!reason) return {status: 400, body: {success: false, message: "Return reason is required"}};
  const existing = await db.collection("returns").where("orderId", "==", id).where("uid", "==", uid).limit(1).get();
  if (!existing.empty) return {status: 409, body: {success: false, message: "A return request already exists for this order"}};
  const now = new Date().toISOString();
  const ref = db.collection("returns").doc();
  const record = {id: ref.id, orderId: id, uid, reason, details: cleanText(input.details), status: "requested", refundStatus: "not_started", requestedAt: now, updatedAt: now};
  await ref.set(record);
  return {status: 201, body: {success: true, message: "Return request submitted", returnRequest: record}};
};

export const getReturnRequestsRecord = async (uid: string, role?: string) => {
  let query: FirebaseFirestore.Query = db.collection("returns");
  if (role !== "admin") query = query.where("uid", "==", uid);
  const snapshot = await query.get();
  return {success: true, count: snapshot.size, returns: snapshot.docs.map((doc) => doc.data()).sort((a, b) => String(b.requestedAt).localeCompare(String(a.requestedAt)))};
};

export const getInvoiceRecord = async (id: string, uid: string, role?: string) => {
  const result = await getOrderRecordById(id, uid, role);
  if (result.status !== 200 || !("order" in result.body)) return result;
  return {status: 200, body: {success: true, invoice: {invoiceNumber: `INV-${id.slice(0, 10).toUpperCase()}`, issuedAt: new Date().toISOString(), seller: {name: "Books Bots Drones", country: "South Africa"}, order: result.body.order}}};
};

export const updateReturnRequestRecord = async (id: string, input: Record<string, unknown>) => {
  const allowed = new Set(["approved", "rejected", "received", "refunded"]);
  const status = cleanText(input.status);
  if (!allowed.has(status)) return {status: 400, body: {success: false, message: "Invalid return status"}};
  const ref = db.collection("returns").doc(id);
  const snapshot = await ref.get();
  if (!snapshot.exists) return {status: 404, body: {success: false, message: "Return request not found"}};
  const now = new Date().toISOString();
  await ref.update({status, adminNote: cleanText(input.note), refundStatus: status === "refunded" ? "completed" : snapshot.data()?.refundStatus || "not_started", updatedAt: now});
  return {status: 200, body: {success: true, message: "Return request updated", returnRequest: (await ref.get()).data()}};
};
