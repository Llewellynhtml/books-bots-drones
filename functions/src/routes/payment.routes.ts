import express from "express";

import {
  initializePaystackPayment,
  verifyPaystackPayment,
} from "../controllers/payment.controller";
import {protect} from "../middleware/auth";

const router = express.Router();

router.post("/initialize", protect, initializePaystackPayment);
router.get("/verify/:reference", protect, verifyPaystackPayment);

export default router;
