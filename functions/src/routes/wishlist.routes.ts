import express from "express";

import {
  addWishlistItem,
  getWishlist,
  removeWishlistItem,
} from "../controllers/wishlist.controller";
import {protect} from "../middleware/auth";

const router = express.Router();

router.get("/", protect, getWishlist);
router.post("/", protect, addWishlistItem);
router.delete("/:productId", protect, removeWishlistItem);

export default router;
