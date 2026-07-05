import {Response} from "express";

import {AuthRequest} from "../middleware/auth";
import {
  initializePaystackPaymentRecord,
  verifyPaystackPaymentRecord,
} from "../services/payment.service";

const getUid = (req: AuthRequest) => req.user?.uid;
const getParam = (value: string | string[]) =>
  Array.isArray(value) ? value[0] : value;

export const initializePaystackPayment = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const uid = getUid(req);

    if (!uid) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const result = await initializePaystackPaymentRecord(
      uid,
      req.user?.role,
      req.body
    );

    return res.status(result.status).json(result.body);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to initialize payment";

    return res.status(500).json({
      success: false,
      message,
    });
  }
};

export const verifyPaystackPayment = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const uid = getUid(req);

    if (!uid) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const result = await verifyPaystackPaymentRecord(
      uid,
      req.user?.role,
      getParam(req.params.reference)
    );

    return res.status(result.status).json(result.body);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to verify payment";

    return res.status(500).json({
      success: false,
      message,
    });
  }
};
