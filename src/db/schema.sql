CREATE TABLE checks (
    id SERIAL PRIMARY KEY,
    requester_agent_id TEXT NOT NULL,
    check_type TEXT NOT NULL CHECK (check_type IN ('orbital_risk', 'trust_verification')),
    input_payload JSONB NOT NULL,
    result JSONB,
    payment_tx_hash TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ
);

CREATE TABLE tle_cache (
    id SERIAL PRIMARY KEY,
    norad_id TEXT NOT NULL,
    tle_line1 TEXT NOT NULL,
    tle_line2 TEXT NOT NULL,
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (norad_id, fetched_at)
);

CREATE TABLE agent_trust (
    id SERIAL PRIMARY KEY,
    agent_id TEXT NOT NULL UNIQUE,
    erc8004_address TEXT,
    reputation_score NUMERIC,
    last_verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
