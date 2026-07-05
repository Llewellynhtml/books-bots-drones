import express from "express";

import {
  createBlogPost,
  deleteBlogPost,
  getBlogPostById,
  getBlogPosts,
  updateBlogPost,
} from "../controllers/blog.controller";
import {protect, requireAdmin} from "../middleware/auth";

const router = express.Router();

router.get("/", getBlogPosts);
router.get("/:id", getBlogPostById);
router.post("/", protect, requireAdmin, createBlogPost);
router.put("/:id", protect, requireAdmin, updateBlogPost);
router.delete("/:id", protect, requireAdmin, deleteBlogPost);

export default router;
