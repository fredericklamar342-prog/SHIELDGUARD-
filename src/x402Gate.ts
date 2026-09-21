import type { MiddlewareHandler } from "hono";
import { paymentMiddleware, x402ResourceServer, type Network } from "@x402/hono";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { ExactEvmScheme } from "@x402/evm/exact/server";

import { setCheckPaymentTx } from "./db.js";

/**
 * Services ShieldGuard sells, and the route each one protects.
 * Each service has its own x402 price (see the X402_PRICE_* vars in .env).
 */
export type PaidService = "risk" | "trust";

const SERVICES: Record<
  PaidService,
  { route: string; description: string; priceEnvVar: string }
> = {
  risk: {
    route: "POST /v1/risk-check",
    description:
      "Orbital collision-risk assessment (Celestrak TLEs + SGP4, 24 h proximity screen)",
    priceEnvVar: "X402_PRICE_RISK_CHECK",
  },
  trust: {
    route: "POST /v1/trust-check",
    description: "ERC-8004 agent trust verification",
    priceEnvVar: "X402_PRICE_TRUST_CHECK",
  },
};

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `Missing ${name}: the x402 gate refuses to serve paid routes unconfigured, ` +
        `otherwise every request would pass through unpaid.`
    );
  }
  return value;
}

/**
 * x402 payment gate (exact scheme, facilitator-backed).
 *
 * Flow per the x402 spec and BUILD_GUIDE step 5:
 *  1. Unpaid request → 402 Payment Required advertising price, network and pay-to.
 *  2. Client retries with a signed payment header (X-PAYMENT / PAYMENT-SIGNATURE).
 *  3. Payment is verified through the facilitator (X402_FACILITATOR_URL) before the
 *     handler runs, so unpaid work never executes.
 *  4. Settlement happens after the handler returns 2xx; the settlement tx hash and
 *     verified payer are written to the check row (checks.payment_tx_hash) so the
 *     console shows real payment evidence, not fabricated data.
 *
 * Configuration is resolved lazily on the first paid request, not at import time:
 * on Vercel the module is loaded on every cold start, and a missing env var must
 * fail *that paid route* closed (500), never crash the whole function — /health and
 * /v1/checks must stay up either way. Silently passing requests through unpaid is
 * the one failure mode this project must never have.
 */
const middlewareCache = new Map<PaidService, MiddlewareHandler>();

export function x402Gate(service: PaidService): MiddlewareHandler {
  // Return a stable wrapper so route registration never touches env vars; the
  // real middleware is built once per service on first use.
  return async (c, next) => {
    let gate = middlewareCache.get(service);
    if (!gate) {
      try {
        gate = buildGate(service);
      } catch (err) {
        console.error(`x402: ${service} gate unavailable — failing closed:`, err);
        return c.json(
          {
            error: "payment gate misconfigured",
            detail: err instanceof Error ? err.message : String(err),
          },
          500
        );
      }
      middlewareCache.set(service, gate);
    }
    return gate(c, next);
  };
}

function buildGate(service: PaidService): MiddlewareHandler {
  const config = SERVICES[service];
  const facilitatorUrl = requireEnv("X402_FACILITATOR_URL");
  const payTo = requireEnv("X402_PAY_TO_ADDRESS");
  const price = requireEnv(config.priceEnvVar);
  // CAIP-2 network id. Default is GOAT Testnet3 (chain id 48816); override if the
  // configured facilitator settles on a different network.
  const network = (process.env.X402_NETWORK?.trim() || "eip155:48816") as Network;

  const facilitator = new HTTPFacilitatorClient({ url: facilitatorUrl });
  const resourceServer = new x402ResourceServer(facilitator).register(
    network,
    new ExactEvmScheme()
  );

  // Settlement completes only after the handler returned 2xx. The middleware passes the
  // handler's response body (our JSON, containing checkId) into this hook, so the
  // settlement tx hash can be bound to the right check row.
  resourceServer.onAfterSettle(async (context) => {
    if (context.phase !== "after-handler" || !context.result.success) return;
    const checkId = checkIdFromResponse(context.transportContext);
    if (!checkId) return;
    try {
      await setCheckPaymentTx(checkId, context.result.transaction, {
        payer: context.result.payer ?? null,
        network: context.result.network,
      });
    } catch (err) {
      console.error(`x402: settled but failed to record tx for check ${checkId}:`, err);
    }
  });

  // Settlement failed after the work was done: the middleware replaces the response with
  // a 402, so the caller never receives the result. The row keeps its computed result
  // but no payment evidence — log loudly for reconciliation.
  resourceServer.onSettleFailure(async (context) => {
    const checkId = checkIdFromResponse(context.transportContext);
    console.error(
      `x402: settlement failed${checkId ? ` for check ${checkId}` : ""}: ` +
        `${context.error.message} — row left unpaid, reconcile manually.`
    );
  });

  return paymentMiddleware(
    {
      [config.route]: {
        accepts: {
          scheme: "exact",
          price,
          network,
          payTo,
          maxTimeoutSeconds: 60,
        },
        description: config.description,
        mimeType: "application/json",
      },
    },
    resourceServer
  );
}

function checkIdFromResponse(transportContext: unknown): string | null {
  const ctx = transportContext as { responseBody?: Buffer } | undefined;
  if (!ctx?.responseBody) return null;
  try {
    const body = JSON.parse(ctx.responseBody.toString("utf8")) as { checkId?: unknown };
    return typeof body.checkId === "string" ? body.checkId : null;
  } catch {
    return null;
  }
}
