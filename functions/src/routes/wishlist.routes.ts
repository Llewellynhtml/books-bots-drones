import express from "express";

import {
  addWishlistItem,
  getWishlist,
  removeWishlistItem,
  clearWishlist,
} from "../controllers/wishlist.controller";
import {protect} from "../middleware/auth";

const router = express.Router();

router.get("/", protect, getWishlist);
router.post("/", protect, addWishlistItem);
router.delete("/clear", protect, clearWishlist);
router.delete("/:productId", protect, removeWishlistItem);

export default router;
