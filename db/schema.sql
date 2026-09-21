-- ShieldGuard core schema

CREATE TABLE IF NOT EXISTS checks (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_addr  TEXT NOT NULL,          -- calling agent's wallet address
    check_type      TEXT NOT NULL CHECK (check_type IN ('risk', 'trust')),
    input_payload   JSONB NOT NULL,         -- e.g. { "norad_id": ..., "target_norad_id": ... } or { "agent_id": ... }
    result_payload  JSONB,                  -- computed result once processed
    payment_tx_hash TEXT,                   -- x402 settlement tx
    status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'completed', 'failed')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at    TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS tle_cache (
    norad_id        TEXT PRIMARY KEY,
    tle_line1       TEXT NOT NULL,
    tle_line2       TEXT NOT NULL,
    source          TEXT NOT NULL DEFAULT 'celestrak',
    fetched_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at      TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS agent_trust (
    agent_id            TEXT PRIMARY KEY,      -- ERC-8004 registered agent identifier
    onchain_address     TEXT NOT NULL,
    reputation_score    NUMERIC,
    last_verified_at    TIMESTAMPTZ,
    source_notes        TEXT,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_checks_requester ON checks (requester_addr);
CREATE INDEX IF NOT EXISTS idx_checks_status ON checks (status);
