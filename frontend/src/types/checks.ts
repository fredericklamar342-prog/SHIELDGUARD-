/**
 * Shape of the records returned by `GET /v1/checks` on the ShieldGuard backend.
 * Payload fields are optional because older rows (or rows still in flight) may
 * not carry a complete result yet.
 */

export type CheckType = "risk" | "trust";

export type RiskPayload = {
  riskLevel: string | null;
  minDistanceKm: number | null;
  noradIdA: string | null;
  noradIdB: string | null;
};

export type TrustPayload = {
  trustLevel: string | null;
  reputationScore: number | null;
  registered: boolean | null;
};

export type CheckPayload = RiskPayload & TrustPayload;

export type CheckRow = {
  id: string;
  requester_addr: string;
  check_type: CheckType;
  result_payload: CheckPayload | null;
  payment_tx_hash: string | null;
  status: string;
  created_at: string;
};

/** Semantic tone used for status colours. `neutral` means "no signal yet". */
export type Severity = "ok" | "warn" | "alert" | "neutral";

export type ServiceSummary = {
  kind: CheckType;
  requests: number;
  completed: number;
  latest: CheckRow | null;
};

export type ChecksSummary = {
  total: number;
  risk: number;
  trust: number;
  completed: number;
  pending: number;
  requesters: number;
  /** `created_at` of the oldest record in view, or null when there are none. */
  oldestAt: string | null;
  riskService: ServiceSummary;
  trustService: ServiceSummary;
};
