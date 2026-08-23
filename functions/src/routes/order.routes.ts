import express from "express";

import {
  createOrder,
  getOrderById,
  getOrders,
  updateOrderStatus,
  cancelOrder,
  createReturnRequest,
  getReturnRequests,
  getInvoice,
  updateReturnRequest,
} from "../controllers/order.controller";
import {protect, requireAdmin, requireVerifiedEmail} from "../middleware/auth";

const router = express.Router();

router.get("/", protect, getOrders);
router.post("/", protect, requireVerifiedEmail, createOrder);
router.get("/returns", protect, getReturnRequests);
router.put("/returns/:returnId/status", protect, requireAdmin, updateReturnRequest);
router.post("/:id/cancel", protect, cancelOrder);
router.post("/:id/returns", protect, createReturnRequest);
router.get("/:id/invoice", protect, getInvoice);
router.get("/:id", protect, getOrderById);
router.put("/:id/status", protect, requireAdmin, updateOrderStatus);

export default router;
