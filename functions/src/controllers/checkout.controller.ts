import {Response} from "express";

import {AuthRequest} from "../middleware/auth";
import {createOrderRecord} from "../services/order.service";
import {initializePaystackPaymentRecord} from "../services/payment.service";

interface CheckoutBody {
  paymentMethod?: string;
  callbackUrl?: string;
  [key: string]: unknown;
}

const getUid = (req: AuthRequest) => req.user?.uid;
const isPaystackCheckout = (body: CheckoutBody) =>
  body.paymentMethod?.trim().toLowerCase() === "paystack";

export const checkout = async (req: AuthRequest, res: Response) => {
  try {
    const uid = getUid(req);

    if (!uid) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const body = req.body as CheckoutBody;
    const orderResult = await createOrderRecord(uid, req.user?.email, body);

    if (orderResult.status !== 201) {
      return res.status(orderResult.status).json(orderResult.body);
    }

    const order = orderResult.body.order;

    if (!order) {
      return res.status(500).json({
        success: false,
        message: "Order was not returned after checkout",
      });
    }

    if (!isPaystackCheckout(body)) {
      return res.status(201).json({
        success: true,
        message: "Checkout completed successfully",
        order,
      });
    }

    const paymentResult = await initializePaystackPaymentRecord(
      uid,
      req.user?.role,
      {
        orderId: order.id,
        callbackUrl: typeof body.callbackUrl === "string" ? body.callbackUrl : "",
      }
    );

    if (paymentResult.status < 200 || paymentResult.status >= 300) {
      return res.status(201).json({
        success: true,
        message: "Order created, but payment initialization failed",
        order,
        paymentError: paymentResult.body,
      });
    }

    return res.status(201).json({
      success: true,
      message: "Checkout initialized successfully",
      order,
      payment: paymentResult.body.payment,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Checkout failed";

    return res.status(500).json({
      success: false,
      message,
    });
  }
};

