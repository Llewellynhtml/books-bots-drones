/* eslint-disable max-len */
import express from "express";
import {createPromotion, deletePromotion, getPromotions, updatePromotion, validatePromotion} from "../controllers/promotion.controller";
import {protect, requireAdmin} from "../middleware/auth";
const router = express.Router();
router.post("/validate", protect, validatePromotion);
router.get("/", protect, requireAdmin, getPromotions);
router.post("/", protect, requireAdmin, createPromotion);
router.put("/:id", protect, requireAdmin, updatePromotion);
router.delete("/:id", protect, requireAdmin, deletePromotion);
export default router;
