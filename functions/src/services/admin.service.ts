import {db} from "../config/firebase";

const collections = {
  users: db.collection("users"),
  categories: db.collection("categories"),
  products: db.collection("products"),
  orders: db.collection("orders"),
  payments: db.collection("payments"),
  contactMessages: db.collection("contactMessages"),
  blogPosts: db.collection("blogPosts"),
  carts: db.collection("carts"),
  wishlists: db.collection("wishlists"),
  reviews: db.collection("reviews"),
  notifications: db.collection("notifications"),
};

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
    blogSnapshot,
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
    collections.blogPosts.get(),
  ]);
  const orders = ordersSnapshot.docs.map((doc) => doc.data());
  const contactMessages = contactSnapshot.docs.map((doc) => doc.data());
  const blogPosts = blogSnapshot.docs.map((doc) => doc.data());
  const orderStats = sumOrders(orders);
  const newMessages = contactMessages.filter(
    (message) => message.status === "new"
  ).length;
  const resolvedMessages = contactMessages.filter(
    (message) => message.status === "resolved"
  ).length;
  const publishedBlogPosts = blogPosts.filter(
    (post) => post.isPublished === true
  ).length;
  const draftBlogPosts = blogPosts.filter(
    (post) => post.isPublished !== true
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
      totalBlogPosts: blogPosts.length,
      publishedBlogPosts,
      draftBlogPosts,
      ...orderStats,
    },
  };
};

export const getAdminUserRecords = async () => {
  const snapshot = await collections.users.orderBy("createdAt", "desc").get();
  const users = snapshot.docs.map((doc) => doc.data());

  return {
    success: true,
    count: users.length,
    users,
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
