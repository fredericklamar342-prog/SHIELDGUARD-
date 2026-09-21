# ShieldGuard — Build Guide & Checklist

Build order: **backend logic → database → ERC-8004 identity → x402 payment gating → frontend last.**
This scaffold already contains stubbed code for every stage in that order so you can build incrementally.

## 0. Prerequisites (do these first, on your laptop)

- [ ] Node.js 20+ and npm installed (`node -v`, `npm -v`)
- [ ] PostgreSQL installed and running locally (or a hosted testnet-friendly instance)
- [ ] A dedicated **testnet-only** EVM wallet + private key for the agent (never reuse a mainnet key)
- [ ] Testnet funds for that wallet (via GOAT Network faucet — confirm faucet URL with devrel)
- [ ] GOAT Network testnet RPC URL and chain ID
- [ ] Reach out to your GOAT Network dev relations contact through **verified official channels only** (Discord/X) to confirm:
  - [ ] x402 patterns for off-chain compute
  - [ ] ERC-8004 reputation thresholds
  - [ ] Existing ecosystem agents (to avoid overlap / find integration partners)
  - [ ] Testnet demo conventions expected by reviewers
  - [ ] Grant review timeline

## 1. Install & run the scaffold

```bash
cd shieldguard
npm install
cp .env.example .env
# fill in .env with your RPC URL, wallet key, DB URL, etc.
createdb shieldguard          # or use an existing Postgres instance
psql $DATABASE_URL -f db/schema.sql
npm run dev
```

`GET /health` should return `{"status":"ok"}` once it's running.

### Deploying to Vercel (console + API together)

The same Hono app runs two ways: `npx tsx src/index.ts` locally, and as the
serverless function `api/index.ts` on Vercel (`vercel.json` rewrites `/v1/*` and
`/health` to it, and serves the console from `frontend/dist`).

- [ ] Push the repo and import it as a Vercel project (root `vercel.json` is already set up)
- [ ] Set env vars in Project → Settings → Environment Variables:
  `DATABASE_URL`, `X402_FACILITATOR_URL`, `X402_PAY_TO_ADDRESS`,
  `X402_PRICE_RISK_CHECK`, `X402_PRICE_TRUST_CHECK`, `X402_NETWORK`
  (plus the ERC-8004 vars when trust-check goes live)
- [ ] Use a **pooler** Postgres endpoint (e.g. Neon/Supabase pooler) with `?sslmode=require`
  and keep `PGPOOL_MAX` small (default 3) — every serverless instance opens its own pool
- [ ] Verify after deploy: `GET /health` → 200, unpaid `POST /v1/risk-check` → 402,
  and with x402 vars unset the paid route returns 500 (fails closed, never free)

## 2. Backend logic (build first)

- [x] Scaffold created: `src/riskService.ts` (Celestrak fetch + satellite.js propagation) and `src/trustService.ts` (ERC-8004 read stub)
- [ ] Test `assessCollisionRisk()` against two known NORAD IDs and sanity-check the minimum-distance output
- [ ] Decide on a real conjunction-assessment tolerance (the current sampling is a coarse proximity screen, not a covariance-based CA — good enough for MVP, flag as a known limitation in the demo)
- [ ] Confirm rate limits / usage terms for the Celestrak endpoint you're hitting

## 3. Database

- [x] Schema drafted in `db/schema.sql` (`checks`, `tle_cache`, `agent_trust`)
- [ ] Run the migration against your local/dev Postgres
- [ ] Verify `insertCheck` / `completeCheck` round-trip correctly from `/v1/risk-check` and `/v1/trust-check`

## 4. ERC-8004 identity

- [ ] Get the confirmed ERC-8004 Identity Registry + Reputation Registry testnet contract addresses from GOAT devrel
- [ ] Replace the placeholder ABI fragments in `src/trustService.ts` with the real ABI (or import from an official package if GOAT provides one)
- [ ] Register ShieldGuard itself as an agent on the Identity Registry (so other agents can verify *it*, not just the ones it checks)
- [ ] Test `verifyAgentTrust()` against a known registered test agent address

## 5. x402 payment gating

- [x] Replace the stub in `src/x402Gate.ts`:
  - [x] Return a real `402 Payment Required` with price + pay-to + facilitator `accepts` when `X-PAYMENT` is missing (x402 v2 `payment-required` header)
  - [x] Verify and settle via the facilitator (`@x402/hono` `paymentMiddleware`) after a 2xx handler response; settlement tx hash is captured in `onAfterSettle` and written to `checks.payment_tx_hash`
- [x] Fail fast at startup when `X402_PAY_TO_ADDRESS` / `X402_FACILITATOR_URL` / network config is missing — paid routes must never silently serve for free
- [ ] Confirm the x402 facilitator URL and settlement flow for GOAT Network testnet with devrel (`.env` still has placeholders)
- [ ] Set real prices in `.env` (`X402_PRICE_RISK_CHECK`, `X402_PRICE_TRUST_CHECK`)
- [ ] End-to-end test: a paying test client should be able to call both endpoints and see a settled tx hash in `checks.payment_tx_hash` (smoke-tested so far: 402 challenge verified, no paid round-trip yet)

## 6. Frontend (build last)

- [ ] React dashboard showing live `checks` (poll or subscribe to the DB/API)
- [ ] Display: requester, check type, result summary, payment tx hash, status
- [ ] This is a grant-reviewer artifact, not a technical dependency — keep it simple

## 7. Demo prep

- [ ] Seed a few real risk-checks and trust-checks on testnet so the dashboard isn't empty at review time
- [ ] Write a short README/demo script: what ShieldGuard does, how a caller pays via x402, how ERC-8004 trust scoring works
- [ ] Record a fallback screen-capture in case live testnet demo has issues during review
