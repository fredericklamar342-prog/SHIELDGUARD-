import "dotenv/config";
import { serve } from "@hono/node-server";

import { app } from "./app.js";

/**
 * Local / VM entrypoint: long-running node server. The app itself lives in
 * src/app.ts so the identical route stack can also be served by the Vercel
 * serverless function in api/index.ts.
 */
const port = Number(process.env.PORT ?? 8787);
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`ShieldGuard backend listening on :${info.port}`);
});
