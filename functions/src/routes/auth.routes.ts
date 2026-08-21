import express from "express";
import {
  forgotPassword,
  getProfile,
  loginUser,
  refreshSession,
  registerUser,
} from "../controllers/auth.controller";
import {protect} from "../middleware/auth";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/refresh", refreshSession);
router.post("/forgot-password", forgotPassword);
router.get("/profile", protect, getProfile);

export default router;
