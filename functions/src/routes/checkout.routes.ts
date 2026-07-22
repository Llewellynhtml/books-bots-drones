import express from "express";

import {checkout} from "../controllers/checkout.controller";
import {protect} from "../middleware/auth";

const router = express.Router();

router.post("/", protect, checkout);

export default router;
