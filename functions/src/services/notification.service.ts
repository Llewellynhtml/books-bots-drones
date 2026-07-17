import {db} from "../config/firebase";

const notificationsCollection = db.collection("notifications");

interface NotificationInput {
  uid?: string;
  title?: string;
  message?: string;
  type?: string;
}

const cleanText = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

export const createNotificationRecord = async (body: NotificationInput) => {
  const uid = cleanText(body.uid);
  const title = cleanText(body.title);
  const message = cleanText(body.message);
  const type = cleanText(body.type) || "general";

  if (!uid || !title || !message) {
    return {
      status: 400,
      body: {
        success: false,
        message: "uid, title and message are required",
      },
    };
  }

  const now = new Date().toISOString();
  const docRef = notificationsCollection.doc();
  const notification = {
    id: docRef.id,
    uid,
    title,
    message,
    type,
    isRead: false,
    createdAt: now,
    updatedAt: now,
  };

  await docRef.set(notification);

  return {
    status: 201,
    body: {
      success: true,
      message: "Notification created successfully",
      notification,
    },
  };
};

export const getNotificationRecords = async (uid: string, role?: string) => {
  let query: FirebaseFirestore.Query = notificationsCollection;

  if (role !== "admin") {
    query = query.where("uid", "==", uid);
  }

  const snapshot = await query.orderBy("createdAt", "desc").get();
  const notifications = snapshot.docs.map((doc) => doc.data());

  return {
    success: true,
    count: notifications.length,
    notifications,
  };
};

export const markNotificationReadRecord = async (
  id: string,
  uid: string,
  role?: string
) => {
  const notificationDoc = notificationsCollection.doc(id);
  const currentNotification = await notificationDoc.get();

  if (!currentNotification.exists) {
    return {
      status: 404,
      body: {
        success: false,
        message: "Notification not found",
      },
    };
  }

  const notification = currentNotification.data();

  if (role !== "admin" && notification?.uid !== uid) {
    return {
      status: 403,
      body: {
        success: false,
        message: "You cannot update this notification",
      },
    };
  }

  await notificationDoc.update({
    isRead: true,
    updatedAt: new Date().toISOString(),
  });

  const updatedNotification = await notificationDoc.get();

  return {
    status: 200,
    body: {
      success: true,
      message: "Notification marked as read",
      notification: updatedNotification.data(),
    },
  };
};

export const deleteNotificationRecord = async (
  id: string,
  uid: string,
  role?: string
) => {
  const notificationDoc = notificationsCollection.doc(id);
  const currentNotification = await notificationDoc.get();

  if (!currentNotification.exists) {
    return {
      status: 404,
      body: {
        success: false,
        message: "Notification not found",
      },
    };
  }

  const notification = currentNotification.data();

  if (role !== "admin" && notification?.uid !== uid) {
    return {
      status: 403,
      body: {
        success: false,
        message: "You cannot delete this notification",
      },
    };
  }

  await notificationDoc.delete();

  return {
    status: 200,
    body: {
      success: true,
      message: "Notification deleted successfully",
    },
  };
};
