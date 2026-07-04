import express from "express";

import {
  addCartItem,
  clearCart,
  getCart,
  removeCartItem,
  updateCartItem,
} from "../controllers/cart.controller";
import {protect} from "../middleware/auth";

const router = express.Router();

router.get("/", protect, getCart);
router.post("/", protect, addCartItem);
router.put("/:productId", protect, updateCartItem);
router.delete("/clear", protect, clearCart);
router.delete("/:productId", protect, removeCartItem);

export default router;
