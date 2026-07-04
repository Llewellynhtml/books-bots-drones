import express from "express";

import {
  deleteImage,
  uploadImage,
} from "../controllers/storage.controller";
import {protect, requireAdmin} from "../middleware/auth";

const router = express.Router();

router.post("/upload", protect, requireAdmin, uploadImage);
router.delete("/delete", protect, requireAdmin, deleteImage);

export default router;
