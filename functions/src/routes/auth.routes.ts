import express from "express";
import {
  getProfile,
  loginUser,
  registerUser,
} from "../controllers/auth.controller";
import { protect } from "../middleware/auth";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/profile", protect, getProfile);

export default router;
