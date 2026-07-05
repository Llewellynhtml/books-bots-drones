import express from "express";

import {
  createOrder,
  getOrderById,
  getOrders,
  updateOrderStatus,
} from "../controllers/order.controller";
import {protect, requireAdmin} from "../middleware/auth";

const router = express.Router();

router.get("/", protect, getOrders);
router.post("/", protect, createOrder);
router.get("/:id", protect, getOrderById);
router.put("/:id/status", protect, requireAdmin, updateOrderStatus);

export default router;
