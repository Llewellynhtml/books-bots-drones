import {db} from "../config/firebase";

const contactMessagesCollection = db.collection("contactMessages");

export interface ContactMessageInput {
  name?: string;
  email?: string;
  phone?: string;
  subject?: string;
  message?: string;
}

const cleanText = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export const createContactMessageRecord = async (
  body: ContactMessageInput
) => {
  const name = cleanText(body.name);
  const email = cleanText(body.email).toLowerCase();
  const phone = cleanText(body.phone);
  const subject = cleanText(body.subject);
  const message = cleanText(body.message);

  if (!name || !email || !subject || !message) {
    return {
      status: 400,
      body: {
        success: false,
        message: "name, email, subject and message are required",
      },
    };
  }

  if (!isEmail(email)) {
    return {
      status: 400,
      body: {
        success: false,
        message: "Valid email is required",
      },
    };
  }

  const now = new Date().toISOString();
  const docRef = contactMessagesCollection.doc();
  const contactMessage = {
    id: docRef.id,
    name,
    email,
    phone,
    subject,
    message,
    status: "new",
    createdAt: now,
    updatedAt: now,
  };

  await docRef.set(contactMessage);

  return {
    status: 201,
    body: {
      success: true,
      message: "Contact message submitted successfully",
      contactMessage,
    },
  };
};

export const getContactMessageRecords = async () => {
  const snapshot = await contactMessagesCollection
    .orderBy("createdAt", "desc")
    .get();
  const contactMessages = snapshot.docs.map((doc) => doc.data());

  return {
    success: true,
    count: contactMessages.length,
    contactMessages,
  };
};

export const getContactMessageRecordById = async (id: string) => {
  const contactMessageDoc = await contactMessagesCollection.doc(id).get();

  if (!contactMessageDoc.exists) {
    return {
      status: 404,
      body: {
        success: false,
        message: "Contact message not found",
      },
    };
  }

  return {
    status: 200,
    body: {
      success: true,
      contactMessage: contactMessageDoc.data(),
    },
  };
};

export const updateContactMessageStatusRecord = async (
  id: string,
  statusInput: unknown
) => {
  const status = cleanText(statusInput);
  const allowedStatuses = new Set(["new", "read", "resolved"]);

  if (!allowedStatuses.has(status)) {
    return {
      status: 400,
      body: {
        success: false,
        message: "Invalid contact message status",
      },
    };
  }

  const contactMessageDoc = contactMessagesCollection.doc(id);
  const currentMessage = await contactMessageDoc.get();

  if (!currentMessage.exists) {
    return {
      status: 404,
      body: {
        success: false,
        message: "Contact message not found",
      },
    };
  }

  await contactMessageDoc.update({
    status,
    updatedAt: new Date().toISOString(),
  });

  const updatedMessage = await contactMessageDoc.get();

  return {
    status: 200,
    body: {
      success: true,
      message: "Contact message status updated successfully",
      contactMessage: updatedMessage.data(),
    },
  };
};
