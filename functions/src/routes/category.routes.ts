import express from "express";

import {
  createCategory,
  deleteCategory,
  getCategories,
  getCategoryById,
  updateCategory,
} from "../controllers/category.controller";
import {protect, requireAdmin} from "../middleware/auth";

const router = express.Router();

router.get("/", getCategories);
router.get("/:id", getCategoryById);
router.post("/", protect, requireAdmin, createCategory);
router.put("/:id", protect, requireAdmin, updateCategory);
router.delete("/:id", protect, requireAdmin, deleteCategory);

export default router;
