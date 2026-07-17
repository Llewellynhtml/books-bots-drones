import express from "express";

import {
  createNotification,
  deleteNotification,
  getNotifications,
  markNotificationRead,
} from "../controllers/notification.controller";
import {protect, requireAdmin} from "../middleware/auth";

const router = express.Router();

router.get("/", protect, getNotifications);
router.post("/", protect, requireAdmin, createNotification);
router.put("/:id/read", protect, markNotificationRead);
router.delete("/:id", protect, deleteNotification);

export default router;
