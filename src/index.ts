import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { cors } from "hono/cors";
import { z } from "zod";
import "dotenv/config";

import { assessCollisionRisk } from "./riskService.js";
import { verifyAgentTrust } from "./trustService.js";
import { x402Gate } from "./x402Gate.js";
import { insertCheck, completeCheck, listRecentChecks } from "./db.js";

const app = new Hono();

app.use(
  "/*",
  cors({
    origin: (origin) => (origin && origin.startsWith("http://localhost:") ? origin : null),
  })
);

app.get("/health", (c) => c.json({ status: "ok" }));

app.get("/v1/checks", async (c) => {
  const checks = await listRecentChecks(50);
  return c.json({ checks });
});

const riskInput = z.object({
  requesterAddr: z.string(),
  noradIdA: z.string(),
  noradIdB: z.string(),
  windowMinutes: z.number().optional(),
});

app.post("/v1/risk-check", x402Gate("X402_PRICE_RISK_CHECK"), async (c) => {
  const body = riskInput.parse(await c.req.json());
  const checkId = await insertCheck({
    requesterAddr: body.requesterAddr,
    checkType: "risk",
    inputPayload: body,
  });

  const result = await assessCollisionRisk(body.noradIdA, body.noradIdB, body.windowMinutes);
  await completeCheck(checkId, result);

  return c.json({ checkId, result });
});

const trustInput = z.object({
  requesterAddr: z.string(),
  agentAddress: z.string(),
});

app.post("/v1/trust-check", x402Gate("X402_PRICE_TRUST_CHECK"), async (c) => {
  const body = trustInput.parse(await c.req.json());
  const checkId = await insertCheck({
    requesterAddr: body.requesterAddr,
    checkType: "trust",
    inputPayload: body,
  });

  const result = await verifyAgentTrust(body.agentAddress);
  await completeCheck(checkId, result);

  return c.json({ checkId, result });
});

const port = Number(process.env.PORT ?? 8787);
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`ShieldGuard backend listening on :${info.port}`);
});
