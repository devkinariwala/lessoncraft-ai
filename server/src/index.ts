import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import mongoose from "mongoose";
import lessons from "./routes/lessons.js";
const app = express();
app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN?.split(",") || "http://localhost:5173",
  }),
);
app.use(express.json({ limit: "5mb" }));
app.use(
  "/api",
  rateLimit({
    windowMs: 60_000,
    max: 40,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);
app.get("/api/health", (_req, res) =>
  res.json({
    status: "ok",
    database:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  }),
);
app.use("/api/lessons", lessons);
app.use(
  (
    err: any,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    if (err?.name === "ZodError")
      return res
        .status(400)
        .json({
          error: "Please check the supplied inputs.",
          details: err.issues,
        });
    console.error(err);
    res.status(500).json({ error: err?.message || "Unexpected server error." });
  },
);
const port = Number(process.env.PORT || 4000);
mongoose
  .connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/lessoncraft")
  .then(() => console.log("MongoDB connected"))
  .catch((e) =>
    console.warn(
      "MongoDB unavailable; persistence endpoints will fail until configured:",
      e.message,
    ),
  );
app.listen(port, () =>
  console.log(`LessonCraft API listening on http://localhost:${port}`),
);
