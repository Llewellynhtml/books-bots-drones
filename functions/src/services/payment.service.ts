import {db} from "../config/firebase";

const ordersCollection = db.collection("orders");
const paymentsCollection = db.collection("payments");
const paystackBaseUrl = "https://api.paystack.co";

interface InitializePaymentInput {
  orderId?: string;
  callbackUrl?: string;
}

interface PaystackInitializeData {
  authorization_url: string;
  access_code: string;
  reference: string;
}

interface PaystackVerifyData {
  id: number;
  status: string;
  reference: string;
  amount: number;
  currency: string;
  channel?: string;
  gateway_response?: string;
  paid_at?: string;
}

interface PaystackResponse<T> {
  status: boolean;
  message: string;
  data: T;
}

const cleanText = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const getPaystackSecretKey = () => {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;

  if (!secretKey) {
    throw new Error("PAYSTACK_SECRET_KEY is missing");
  }

  return secretKey;
};

const getOrderById = async (orderId: string) => {
  const orderDoc = await ordersCollection.doc(orderId).get();

  if (!orderDoc.exists) {
    return null;
  }

  return {
    ref: orderDoc.ref,
    data: orderDoc.data() || {},
  };
};

const userCanAccessOrder = (
  order: FirebaseFirestore.DocumentData,
  uid: string,
  role?: string
) => role === "admin" || order.uid === uid;

const toPaystackAmount = (amount: unknown) => {
  const value = Number(amount);

  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }

  return Math.round(value * 100);
};

const createPaymentReference = (orderId: string) => {
  const random = Math.random().toString(36).slice(2, 10);
  return `bbd-${orderId}-${Date.now()}-${random}`.replace(/[^a-zA-Z0-9-]/g, "");
};

const callPaystack = async <T>(
  path: string,
  options: RequestInit = {}
): Promise<PaystackResponse<T>> => {
  const response = await fetch(`${paystackBaseUrl}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${getPaystackSecretKey()}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const payload = (await response.json()) as PaystackResponse<T>;

  if (!response.ok || !payload.status) {
    throw new Error(payload.message || "Paystack request failed");
  }

  return payload;
};

export const initializePaystackPaymentRecord = async (
  uid: string,
  role: string | undefined,
  body: InitializePaymentInput
) => {
  const orderId = cleanText(body.orderId);

  if (!orderId) {
    return {
      status: 400,
      body: {
        success: false,
        message: "orderId is required",
      },
    };
  }

  const orderResult = await getOrderById(orderId);

  if (!orderResult) {
    return {
      status: 404,
      body: {
        success: false,
        message: "Order not found",
      },
    };
  }

  const order = orderResult.data;

  if (!userCanAccessOrder(order, uid, role)) {
    return {
      status: 403,
      body: {
        success: false,
        message: "You cannot pay for this order",
      },
    };
  }

  if (order.paymentStatus === "paid") {
    return {
      status: 400,
      body: {
        success: false,
        message: "Order has already been paid",
      },
    };
  }

  const amount = toPaystackAmount(order.total);

  if (!amount) {
    return {
      status: 400,
      body: {
        success: false,
        message: "Order total must be greater than zero",
      },
    };
  }

  const reference = createPaymentReference(orderId);
  const currency = process.env.PAYSTACK_CURRENCY || "ZAR";
  const callbackUrl = cleanText(body.callbackUrl);
  const payload: Record<string, unknown> = {
    email: order.email,
    amount,
    currency,
    reference,
    metadata: JSON.stringify({
      orderId,
      uid,
      source: "books-bots-drones",
    }),
  };

  if (callbackUrl) {
    payload.callback_url = callbackUrl;
  }

  const paystackResponse = await callPaystack<PaystackInitializeData>(
    "/transaction/initialize",
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
  const now = new Date().toISOString();
  const paymentDoc = paymentsCollection.doc(paystackResponse.data.reference);

  const payment = {
    id: paymentDoc.id,
    orderId,
    uid,
    email: order.email || "",
    provider: "paystack",
    reference: paystackResponse.data.reference,
    accessCode: paystackResponse.data.access_code,
    authorizationUrl: paystackResponse.data.authorization_url,
    amount: Number(order.total) || 0,
    currency,
    status: "pending",
    createdAt: now,
    updatedAt: now,
  };

  await paymentDoc.set(payment);

  await orderResult.ref.update({
    paymentId: paymentDoc.id,
    paymentProvider: "paystack",
    paymentMethod: "paystack",
    paymentStatus: "pending",
    paymentReference: paystackResponse.data.reference,
    paymentAccessCode: paystackResponse.data.access_code,
    paymentAuthorizationUrl: paystackResponse.data.authorization_url,
    paymentInitializedAt: now,
    updatedAt: now,
  });

  return {
    status: 200,
    body: {
      success: true,
      message: "Payment initialized successfully",
      payment: {
        orderId,
        reference: paystackResponse.data.reference,
        accessCode: paystackResponse.data.access_code,
        authorizationUrl: paystackResponse.data.authorization_url,
      },
    },
  };
};

export const verifyPaystackPaymentRecord = async (
  uid: string,
  role: string | undefined,
  referenceInput: unknown
) => {
  const reference = cleanText(referenceInput);

  if (!reference) {
    return {
      status: 400,
      body: {
        success: false,
        message: "reference is required",
      },
    };
  }

  const paymentDoc = paymentsCollection.doc(reference);
  const currentPayment = await paymentDoc.get();
  const orderSnapshot = await ordersCollection
    .where("paymentReference", "==", reference)
    .limit(1)
    .get();

  if (orderSnapshot.empty) {
    return {
      status: 404,
      body: {
        success: false,
        message: "Order not found for payment reference",
      },
    };
  }

  const orderDoc = orderSnapshot.docs[0];
  const order = orderDoc.data();

  if (!userCanAccessOrder(order, uid, role)) {
    return {
      status: 403,
      body: {
        success: false,
        message: "You cannot verify this payment",
      },
    };
  }

  const paystackResponse = await callPaystack<PaystackVerifyData>(
    `/transaction/verify/${encodeURIComponent(reference)}`
  );
  const expectedAmount = toPaystackAmount(order.total);
  const verifiedAmountMatches = expectedAmount === paystackResponse.data.amount;
  const isPaid =
    paystackResponse.data.status === "success" && verifiedAmountMatches;
  const now = new Date().toISOString();
  const updateData: Record<string, unknown> = {
    paystackTransactionId: paystackResponse.data.id,
    paystackStatus: paystackResponse.data.status,
    paystackCurrency: paystackResponse.data.currency,
    paystackChannel: paystackResponse.data.channel || "",
    paystackGatewayResponse: paystackResponse.data.gateway_response || "",
    paymentVerifiedAt: now,
    updatedAt: now,
  };

  if (isPaid) {
    updateData.paymentStatus = "paid";
    updateData.status = "paid";
    updateData.paidAt = paystackResponse.data.paid_at || now;
  }

  await orderDoc.ref.update(updateData);

  await paymentDoc.set(
    {
      ...(currentPayment.exists ? {} : {
        id: reference,
        orderId: order.id || orderDoc.id,
        uid: order.uid || uid,
        email: order.email || "",
        provider: "paystack",
        reference,
        amount: Number(order.total) || 0,
        createdAt: now,
      }),
      status: isPaid ? "paid" : paystackResponse.data.status,
      currency: paystackResponse.data.currency,
      channel: paystackResponse.data.channel || "",
      gatewayResponse: paystackResponse.data.gateway_response || "",
      paystackTransactionId: paystackResponse.data.id,
      paidAt: isPaid ? paystackResponse.data.paid_at || now : null,
      verifiedAt: now,
      updatedAt: now,
    },
    {merge: true}
  );

  const updatedOrder = await orderDoc.ref.get();

  return {
    status: 200,
    body: {
      success: true,
      message: isPaid ?
        "Payment verified successfully" :
        "Payment verification completed but payment is not successful",
      payment: {
        reference,
        status: paystackResponse.data.status,
        amountMatches: verifiedAmountMatches,
        paid: isPaid,
      },
      order: updatedOrder.data(),
    },
  };
};
