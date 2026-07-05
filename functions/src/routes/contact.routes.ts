import express from "express";

import {
  createContactMessage,
  getContactMessageById,
  getContactMessages,
  updateContactMessageStatus,
} from "../controllers/contact.controller";
import {protect, requireAdmin} from "../middleware/auth";

const router = express.Router();

router.post("/", createContactMessage);
router.get("/", protect, requireAdmin, getContactMessages);
router.get("/:id", protect, requireAdmin, getContactMessageById);
router.put("/:id/status", protect, requireAdmin, updateContactMessageStatus);

export default router;
