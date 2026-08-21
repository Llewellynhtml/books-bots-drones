import express from "express";

import {
  getAdminDashboard,
  getAdminCollection,
  getAdminOrders,
  getAdminRevenue,
  getAdminUsers,
  deleteAdminUser,
  updateAdminUserRole,
} from "../controllers/admin.controller";
import {protect, requireAdmin} from "../middleware/auth";

const router = express.Router();

router.get("/dashboard", protect, requireAdmin, getAdminDashboard);
router.get("/users", protect, requireAdmin, getAdminUsers);
router.put("/users/:uid/role", protect, requireAdmin, updateAdminUserRole);
router.delete("/users/:uid", protect, requireAdmin, deleteAdminUser);
router.get("/orders", protect, requireAdmin, getAdminOrders);
router.get("/revenue", protect, requireAdmin, getAdminRevenue);
router.get(
  "/collections/:collectionName",
  protect,
  requireAdmin,
  getAdminCollection
);

export default router;
