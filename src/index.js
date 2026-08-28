import express from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config/env.js";
import { blogsRouter } from "./routes/blogs.js";
import { contactsRouter } from "./routes/contacts.js";
import { seoRouter } from "./routes/seo.js";

const app = express();

app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || env.corsOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error("Blocked by CORS."));
    },
  }),
);
app.use(express.json({ limit: "2mb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "pentagrowth-server" });
});

app.use("/api", blogsRouter);
app.use("/api", contactsRouter);
app.use(seoRouter);

app.use((error, _req, res, _next) => {
  const status = error.status ?? 500;
  res.status(status).json({
    error: error.message ?? "Unexpected server error.",
    details: env.nodeEnv === "production" ? undefined : error.details ?? error.stack,
  });
});

app.listen(env.port, () => {
  console.log(`Pentagrowth API listening on http://localhost:${env.port}`);
});
