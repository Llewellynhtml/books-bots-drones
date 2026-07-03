import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes";
import categoryRoutes from "./routes/category.routes";

const app = express();

app.use(cors({ origin: true }));
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Books Bots Drones API is running",
  });
});

app.use("/auth", authRoutes);
app.use("/categories", categoryRoutes);

export default app;
