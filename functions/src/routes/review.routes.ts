import express from "express";

import {
  createReview,
  deleteReview,
  getReviews,
} from "../controllers/review.controller";
import {protect} from "../middleware/auth";

const router = express.Router();

router.get("/", getReviews);
router.post("/", protect, createReview);
router.delete("/:id", protect, deleteReview);

export default router;
