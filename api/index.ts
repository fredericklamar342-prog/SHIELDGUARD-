import "dotenv/config";
import { handle } from "hono/vercel";

import { app } from "../src/app.js";

/**
 * Vercel serverless entrypoint. vercel.json rewrites /v1/* and /health to
 * this function; the static console is served from frontend/dist.
 *
 * dotenv is harmless on Vercel (no .env file is deployed, env vars come from
 * project settings) but keeps parity with local `vercel dev`.
 */
export default handle(app);
