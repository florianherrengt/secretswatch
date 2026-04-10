import { Hono } from "hono";
import healthzRoutes from "./healthz/index.js";
import homeRoutes from "./home/index.js";
import sandboxWebsiteRoutes from "./sandbox/website/index.js";
import scanRoutes from "./scan/index.js";
import qualifyRoutes from "./qualify/index.js";
import dedupeRoutes from "./dedupe/index.js";
import adminQueueRoutes from "./admin/queues/index.js";
import debugRoutes from "./debug/index.js";
import authRoutes from "./auth/index.js";

const app = new Hono();

app.route("/", healthzRoutes);
app.route("/", authRoutes);
app.route("/", homeRoutes);
app.route("/sandbox/website", sandboxWebsiteRoutes);
app.route("/scan", scanRoutes);
app.route("/qualify", qualifyRoutes);
app.route("/dedupe", dedupeRoutes);
app.route("/admin/queues", adminQueueRoutes);

if (process.env.NODE_ENV !== "production") {
  app.route("/debug", debugRoutes);
}

export default app;
