import express from "express";
import {
  forgotPassword,
  getProfile,
  loginUser,
  updateProfile,
  getAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  sendVerificationEmail,
  refreshSession,
  registerUser,
} from "../controllers/auth.controller";
import {protect} from "../middleware/auth";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/refresh", refreshSession);
router.post("/forgot-password", forgotPassword);
router.post("/email-verification", protect, sendVerificationEmail);
router.get("/profile", protect, getProfile);
router.put("/profile", protect, updateProfile);
router.get("/addresses", protect, getAddresses);
router.post("/addresses", protect, createAddress);
router.put("/addresses/:id", protect, updateAddress);
router.delete("/addresses/:id", protect, deleteAddress);

export default router;
