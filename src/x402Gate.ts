import type { Context, Next } from "hono";
import "dotenv/config";

/**
 * x402 payment-gate middleware.
 *
 * TODO (x402 step): wire this to the real x402 facilitator flow:
 *  1. On first request without payment, respond 402 with the price + payment
 *     instructions (facilitator URL, pay-to address, asset, amount).
 *  2. Client resubmits with an X-PAYMENT header containing the signed payment.
 *  3. Verify + settle via X402_FACILITATOR_URL before calling next().
 *
 * This stub currently passes every request through unpaid so backend logic
 * can be built and tested first, per the agreed build order. Do not deploy
 * to any real grant-reviewer demo until this is replaced.
 */
export function x402Gate(priceEnvVar: string) {
  return async (c: Context, next: Next) => {
    const price = process.env[priceEnvVar];
    const payment = c.req.header("X-PAYMENT");

    if (!payment) {
      // Real implementation: return c.json({ ...x402 challenge... }, 402)
      c.header("X-ShieldGuard-Price", price ?? "unset");
      c.header("X-ShieldGuard-PayTo", process.env.X402_PAY_TO_ADDRESS ?? "unset");
    }

    await next();
  };
}
