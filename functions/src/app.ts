import express from "express";
import cors from "cors";
import { requireAuth } from "./middleware/auth";
import tracksRouter from "./routes/tracks";
import uploadRouter from "./routes/upload";

const app = express();

app.use(cors({ origin: true }));
app.use(express.json({ limit: "15mb" }));

// All routes require a valid Firebase ID token
app.use(requireAuth);

app.use("/api/tracks", tracksRouter);
app.use("/api/upload", uploadRouter);

export default app;
