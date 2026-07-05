import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes";
import cartRoutes from "./routes/cart.routes";
import categoryRoutes from "./routes/category.routes";
import contactRoutes from "./routes/contact.routes";
import orderRoutes from "./routes/order.routes";
import productRoutes from "./routes/product.routes";
import storageRoutes from "./routes/storage.routes";
import wishlistRoutes from "./routes/wishlist.routes";

const app = express();

app.use(cors({ origin: true }));
app.use(express.json({limit: "10mb"}));

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Books Bots Drones API is running",
  });
});

app.use("/auth", authRoutes);
app.use("/cart", cartRoutes);
app.use("/categories", categoryRoutes);
app.use("/contact", contactRoutes);
app.use("/orders", orderRoutes);
app.use("/products", productRoutes);
app.use("/storage", storageRoutes);
app.use("/wishlist", wishlistRoutes);

export default app;
