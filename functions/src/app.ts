import express from "express";
import cors from "cors";
import type {NextFunction, Request, Response} from "express";
import adminRoutes from "./routes/admin.routes";
import authRoutes from "./routes/auth.routes";
import cartRoutes from "./routes/cart.routes";
import categoryRoutes from "./routes/category.routes";
import checkoutRoutes from "./routes/checkout.routes";
import contactRoutes from "./routes/contact.routes";
import notificationRoutes from "./routes/notification.routes";
import orderRoutes from "./routes/order.routes";
import paymentRoutes from "./routes/payment.routes";
import productRoutes from "./routes/product.routes";
import reviewRoutes from "./routes/review.routes";
import storageRoutes from "./routes/storage.routes";
import wishlistRoutes from "./routes/wishlist.routes";
import promotionRoutes from "./routes/promotion.routes";

const app = express();
const configuredOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim().replace(/\/$/, ""))
  .filter(Boolean);
const developmentOrigins = new Set([
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
  "http://localhost:5174",
  "http://127.0.0.1:5174",
]);

app.use(cors({
  origin: (origin, callback) => {
    if (
      !origin ||
      configuredOrigins.length === 0 ||
      configuredOrigins.includes(origin.replace(/\/$/, "")) ||
      (process.env.NODE_ENV !== "production" && developmentOrigins.has(origin))
    ) {
      callback(null, true);
      return;
    }

    callback(new Error("Origin is not allowed by CORS"));
  },
}));
app.use(express.json({limit: "10mb"}));

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Books Bots Drones API is running",
  });
});

app.use("/admin", adminRoutes);
app.use("/auth", authRoutes);
app.use("/cart", cartRoutes);
app.use("/categories", categoryRoutes);
app.use("/checkout", checkoutRoutes);
app.use("/contact", contactRoutes);
app.use("/notifications", notificationRoutes);
app.use("/orders", orderRoutes);
app.use("/payments", paymentRoutes);
app.use("/products", productRoutes);
app.use("/promotions", promotionRoutes);
app.use("/reviews", reviewRoutes);
app.use("/storage", storageRoutes);
app.use("/wishlist", wishlistRoutes);

app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: `API route not found: ${req.method} ${req.path}`,
  });
});

app.use((
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  void _next;
  const message = error instanceof Error ? error.message : "Internal server error";
  const isCorsError = message === "Origin is not allowed by CORS";

  if (!isCorsError) {
    console.error("Unhandled API error:", error);
  }

  res.status(isCorsError ? 403 : 500).json({
    success: false,
    message: isCorsError ? message : "Internal server error",
  });
});

export default app;
