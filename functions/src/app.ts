import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes";
import categoryRoutes from "./routes/category.routes";
import productRoutes from "./routes/product.routes";
import storageRoutes from "./routes/storage.routes";

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
app.use("/categories", categoryRoutes);
app.use("/products", productRoutes);
app.use("/storage", storageRoutes);

export default app;
