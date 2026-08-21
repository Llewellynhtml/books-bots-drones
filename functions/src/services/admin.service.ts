import {db} from "../config/firebase";

import * as firebaseAdmin from "firebase-admin";

const collections = {
  users: db.collection("users"),
  categories: db.collection("categories"),
  products: db.collection("products"),
  orders: db.collection("orders"),
  payments: db.collection("payments"),
  contactMessages: db.collection("contactMessages"),
  carts: db.collection("carts"),
  wishlists: db.collection("wishlists"),
  reviews: db.collection("reviews"),
  notifications: db.collection("notifications"),
};

export const adminCollectionNames = [
  "carts",
  "contactMessages",
  "notifications",
  "payments",
  "reviews",
  "wishlists",
] as const;

export type AdminCollectionName = typeof adminCollectionNames[number];

export const isAdminCollectionName = (
  value: string
): value is AdminCollectionName =>
  adminCollectionNames.includes(value as AdminCollectionName);

const countCollection = async (
  collection: FirebaseFirestore.CollectionReference
) => {
  const snapshot = await collection.get();
  return snapshot.size;
};

const sumOrders = (orders: FirebaseFirestore.DocumentData[]) => {
  const paidOrders = orders.filter((order) => order.paymentStatus === "paid");
  const pendingOrders = orders.filter((order) => order.status === "pending");
  const processingOrders = orders.filter(
    (order) => order.status === "processing"
  );
  const shippedOrders = orders.filter((order) => order.status === "shipped");
  const deliveredOrders = orders.filter(
    (order) => order.status === "delivered"
  );
  const cancelledOrders = orders.filter(
    (order) => order.status === "cancelled"
  );
  const totalRevenue = paidOrders.reduce(
    (total, order) => total + (Number(order.total) || 0),
    0
  );

  return {
    totalOrders: orders.length,
    paidOrders: paidOrders.length,
    pendingOrders: pendingOrders.length,
    processingOrders: processingOrders.length,
    shippedOrders: shippedOrders.length,
    deliveredOrders: deliveredOrders.length,
    cancelledOrders: cancelledOrders.length,
    totalRevenue,
  };
};

export const getAdminDashboardRecord = async () => {
  const [
    totalUsers,
    totalCategories,
    totalProducts,
    totalCarts,
    totalWishlists,
    totalPayments,
    totalReviews,
    totalNotifications,
    ordersSnapshot,
    contactSnapshot,
  ] = await Promise.all([
    countCollection(collections.users),
    countCollection(collections.categories),
    countCollection(collections.products),
    countCollection(collections.carts),
    countCollection(collections.wishlists),
    countCollection(collections.payments),
    countCollection(collections.reviews),
    countCollection(collections.notifications),
    collections.orders.get(),
    collections.contactMessages.get(),
  ]);
  const orders = ordersSnapshot.docs.map((doc) => doc.data());
  const contactMessages = contactSnapshot.docs.map((doc) => doc.data());
  const orderStats = sumOrders(orders);
  const newMessages = contactMessages.filter(
    (message) => message.status === "new"
  ).length;
  const resolvedMessages = contactMessages.filter(
    (message) => message.status === "resolved"
  ).length;

  return {
    success: true,
    dashboard: {
      totalUsers,
      totalCategories,
      totalProducts,
      totalCarts,
      totalWishlists,
      totalPayments,
      totalReviews,
      totalNotifications,
      totalContactMessages: contactMessages.length,
      newMessages,
      resolvedMessages,
      ...orderStats,
    },
  };
};

export const getAdminUserRecords = async () => {
  const [snapshot, ordersSnapshot] = await Promise.all([
    collections.users.orderBy("createdAt", "desc").get(),
    collections.orders.get(),
  ]);
  const orders = ordersSnapshot.docs.map((doc) => doc.data());
  const users = snapshot.docs.map((doc) => {
    const user = doc.data();
    const userOrders = orders.filter((order) => order.uid === user.uid);
    return {
      ...user,
      totalOrders: userOrders.length,
      totalSpent: userOrders
        .filter((order) => order.paymentStatus === "paid")
        .reduce((total, order) => total + (Number(order.total) || 0), 0),
    };
  });

  return {
    success: true,
    count: users.length,
    users,
  };
};

export const updateAdminUserRoleRecord = async (
  uid: string,
  roleInput: unknown,
  actorUid: string
) => {
  const role = typeof roleInput === "string" ?
    roleInput.trim().toLowerCase() : "";

  if (role !== "admin" && role !== "customer") {
    return {
      status: 400,
      body: {success: false, message: "Role must be admin or customer"},
    };
  }

  if (uid === actorUid && role !== "admin") {
    return {
      status: 400,
      body: {success: false, message: "You cannot remove your own admin role"},
    };
  }

  const userRef = collections.users.doc(uid);
  const currentUser = await userRef.get();

  if (!currentUser.exists) {
    return {
      status: 404,
      body: {success: false, message: "User not found"},
    };
  }

  await userRef.update({role, updatedAt: new Date().toISOString()});
  const updatedUser = await userRef.get();

  return {
    status: 200,
    body: {
      success: true,
      message: "User role updated successfully",
      user: updatedUser.data(),
    },
  };
};

export const deleteAdminUserRecord = async (uid: string, actorUid: string) => {
  if (uid === actorUid) {
    return {status: 400, body: {success: false, message: "You cannot delete your own account"}};
  }
  const userRef = collections.users.doc(uid);
  const userSnapshot = await userRef.get();
  if (!userSnapshot.exists) {
    return {status: 404, body: {success: false, message: "User not found"}};
  }
  await firebaseAdmin.auth().deleteUser(uid).catch((error: unknown) => {
    const code = typeof error === "object" && error && "code" in error ?
      String(error.code) : "";
    if (code !== "auth/user-not-found") throw error;
  });
  await userRef.delete();
  return {
    status: 200,
    body: {
      success: true,
      message: "User account deleted successfully",
      deletedUid: uid,
    },
  };
};

export const getAdminOrderRecords = async () => {
  const snapshot = await collections.orders.orderBy("createdAt", "desc").get();
  const orders = snapshot.docs.map((doc) => doc.data());

  return {
    success: true,
    count: orders.length,
    orders,
  };
};

export const getAdminRevenueRecord = async () => {
  const snapshot = await collections.orders.get();
  const orders = snapshot.docs.map((doc) => doc.data());
  const paidOrders = orders.filter((order) => order.paymentStatus === "paid");
  const unpaidOrders = orders.filter((order) => order.paymentStatus !== "paid");
  const totalRevenue = paidOrders.reduce(
    (total, order) => total + (Number(order.total) || 0),
    0
  );

  return {
    success: true,
    revenue: {
      totalRevenue,
      paidOrders: paidOrders.length,
      unpaidOrders: unpaidOrders.length,
      currency: process.env.PAYSTACK_CURRENCY || "ZAR",
    },
  };
};

export const getAdminCollectionRecords = async (
  collectionName: AdminCollectionName
) => {
  const needsRelationships = ["payments", "carts", "wishlists", "reviews"].includes(
    collectionName
  );
  const [snapshot, usersSnapshot, productsSnapshot] = await Promise.all([
    collections[collectionName].get(),
    needsRelationships ? collections.users.get() : Promise.resolve(null),
    collectionName === "carts" || collectionName === "wishlists" ||
      collectionName === "reviews" ?
      collections.products.get() : Promise.resolve(null),
  ]);
  const usersById = new Map(
    usersSnapshot?.docs.map((doc) => [doc.id, doc.data()]) || []
  );
  const productsById = new Map(
    productsSnapshot?.docs.map((doc) => [doc.id, doc.data()]) || []
  );
  const records: Array<Record<string, unknown> & {id: string}> = snapshot.docs
    .map((doc): Record<string, unknown> & {id: string} => {
      const data = doc.data();
      const uid = String(data.uid || doc.id);
      const user = usersById.get(uid) || {};
      const rawItems = Array.isArray(data.items) ? data.items : [];
      const items = rawItems.map((item: Record<string, unknown>) => {
        const productId = String(item.productId || "");
        const product = productsById.get(productId) || {};
        const quantity = Number(item.quantity) || 1;
        const price = Number(product.price) || 0;
        return {
          ...item,
          productId,
          quantity,
          product: {
            id: productId,
            name: product.name || "Unavailable product",
            sku: product.sku || "",
            price,
            imageUrl: Array.isArray(product.images) ? product.images[0] || "" : "",
          },
          lineTotal: price * quantity,
        };
      });
      return {
        id: doc.id,
        ...data,
        customer: {
          uid,
          displayName: user.displayName || user.name || "Unknown customer",
          email: user.email || data.email || "",
        },
        ...(collectionName === "carts" || collectionName === "wishlists" ? {
          items,
          itemCount: items.reduce(
            (total: number, item: Record<string, unknown>) =>
              total + (collectionName === "carts" ? Number(item.quantity) || 0 : 1),
            0
          ),
          subtotal: items.reduce(
            (total: number, item: Record<string, unknown>) =>
              total + Number(item.lineTotal || 0),
            0
          ),
        } : {}),
        ...(collectionName === "reviews" ? {
          product: (() => {
            const productId = String(data.productId || "");
            const product = productsById.get(productId) || {};
            return {
              id: productId,
              name: product.name || "Unavailable product",
              sku: product.sku || "",
              imageUrl: Array.isArray(product.images) ? product.images[0] || "" : "",
            };
          })(),
        } : {}),
      };
    })
    .sort((left, right) => {
      const leftDate = Date.parse(String(left.createdAt || left.updatedAt || ""));
      const rightDate = Date.parse(String(right.createdAt || right.updatedAt || ""));
      return (Number.isNaN(rightDate) ? 0 : rightDate) -
        (Number.isNaN(leftDate) ? 0 : leftDate);
    });

  return {
    success: true,
    collection: collectionName,
    count: records.length,
    records,
  };
};
