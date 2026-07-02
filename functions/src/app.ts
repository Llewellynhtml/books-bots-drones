import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes";

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

export default app;