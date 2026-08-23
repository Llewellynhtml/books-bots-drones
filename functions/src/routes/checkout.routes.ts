import express from "express";

import {checkout} from "../controllers/checkout.controller";
import {protect, requireVerifiedEmail} from "../middleware/auth";

const router = express.Router();

router.post("/", protect, requireVerifiedEmail, checkout);

export default router;
