import express from "express";
import cors from "cors";
import adminRoutes from "./routes/admin.routes";
import authRoutes from "./routes/auth.routes";
import blogRoutes from "./routes/blog.routes";
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

const app = express();

app.use(cors({origin: true}));
app.use(express.json({limit: "10mb"}));

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Books Bots Drones API is running",
  });
});

app.use("/admin", adminRoutes);
app.use("/auth", authRoutes);
app.use("/blog", blogRoutes);
app.use("/cart", cartRoutes);
app.use("/categories", categoryRoutes);
app.use("/checkout", checkoutRoutes);
app.use("/contact", contactRoutes);
app.use("/notifications", notificationRoutes);
app.use("/orders", orderRoutes);
app.use("/payments", paymentRoutes);
app.use("/products", productRoutes);
app.use("/reviews", reviewRoutes);
app.use("/storage", storageRoutes);
app.use("/wishlist", wishlistRoutes);

export default app;
