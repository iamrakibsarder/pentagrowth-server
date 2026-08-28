import express from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config/env.js";
import { blogsRouter } from "./routes/blogs.js";
import { contactsRouter } from "./routes/contacts.js";
import { seoRouter } from "./routes/seo.js";
import { backendHomePage, backendNotFoundPage } from "./lib/server-pages.js";

export function createApp() {
  const app = express();

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          ...helmet.contentSecurityPolicy.getDefaultDirectives(),
          "style-src": ["'self'", "'unsafe-inline'"],
        },
      },
    }),
  );
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

  app.get("/", (_req, res) => {
    res.type("html").send(backendHomePage());
  });

  app.get("/health", (_req, res) => {
    res.json({ ok: true, service: "pentagrowth-server" });
  });

  app.use("/api", blogsRouter);
  app.use("/api", contactsRouter);
  app.use(seoRouter);

  app.use((req, res) => {
    const wantsJson = req.path.startsWith("/api") || (req.accepts("json") && !req.accepts("html"));

    if (wantsJson) {
      res.status(404).json({
        error: "Route not found.",
        path: req.path,
      });
      return;
    }

    res.status(404).type("html").send(backendNotFoundPage(req.path));
  });

  app.use((error, _req, res, _next) => {
    const status = error.status ?? 500;
    res.status(status).json({
      error: error.message ?? "Unexpected server error.",
      details: env.nodeEnv === "production" ? undefined : error.details ?? error.stack,
    });
  });

  return app;
}
