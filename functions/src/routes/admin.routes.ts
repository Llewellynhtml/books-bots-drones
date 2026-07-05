import express from "express";

import {
  getAdminDashboard,
  getAdminOrders,
  getAdminRevenue,
  getAdminUsers,
} from "../controllers/admin.controller";
import {protect, requireAdmin} from "../middleware/auth";

const router = express.Router();

router.get("/dashboard", protect, requireAdmin, getAdminDashboard);
router.get("/users", protect, requireAdmin, getAdminUsers);
router.get("/orders", protect, requireAdmin, getAdminOrders);
router.get("/revenue", protect, requireAdmin, getAdminRevenue);

export default router;
