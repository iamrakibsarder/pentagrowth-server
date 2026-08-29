import { env } from "./config/env.js";
import { app } from "./app.js";

const server = app.listen(env.port, env.host, () => {
  console.log(`Pentagrowth API listening on http://${env.host}:${env.port}`);
});

server.on("error", (error) => {
  console.error("Pentagrowth API server failed:", error);
  process.exit(1);
});

server.on("close", () => {
  console.log("Pentagrowth API server closed.");
});

process.on("SIGTERM", () => {
  server.close(() => {
    process.exit(0);
  });
});
