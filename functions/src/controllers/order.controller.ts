import {Response} from "express";

import {AuthRequest} from "../middleware/auth";
import {
  createOrderRecord,
  getOrderRecordById,
  getOrderRecords,
  updateOrderStatusRecord,
} from "../services/order.service";

const getUid = (req: AuthRequest) => req.user?.uid;
const getParam = (value: string | string[]) =>
  Array.isArray(value) ? value[0] : value;

export const createOrder = async (req: AuthRequest, res: Response) => {
  try {
    const uid = getUid(req);

    if (!uid) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const result = await createOrderRecord(uid, req.user?.email, req.body);
    return res.status(result.status).json(result.body);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create order";

    return res.status(500).json({
      success: false,
      message,
    });
  }
};

export const getOrders = async (req: AuthRequest, res: Response) => {
  try {
    const uid = getUid(req);

    if (!uid) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const result = await getOrderRecords(uid, req.user?.role);
    return res.status(200).json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to get orders";

    return res.status(500).json({
      success: false,
      message,
    });
  }
};

export const getOrderById = async (req: AuthRequest, res: Response) => {
  try {
    const uid = getUid(req);

    if (!uid) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const result = await getOrderRecordById(
      getParam(req.params.id),
      uid,
      req.user?.role
    );

    return res.status(result.status).json(result.body);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to get order";

    return res.status(500).json({
      success: false,
      message,
    });
  }
};

export const updateOrderStatus = async (req: AuthRequest, res: Response) => {
  try {
    const result = await updateOrderStatusRecord(
      getParam(req.params.id),
      req.body.status
    );

    return res.status(result.status).json(result.body);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update order status";

    return res.status(500).json({
      success: false,
      message,
    });
  }
};
