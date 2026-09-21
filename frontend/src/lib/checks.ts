import type { CheckRow, ChecksSummary, CheckType, Severity, ServiceSummary } from "../types/checks";
import { formatKm, formatNumber } from "./format";

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/**
 * Defensive parse of the `/v1/checks` response: the backend is the source of
 * truth and may add fields, so unknown values are dropped rather than trusted.
 */
export function parseChecks(raw: unknown): CheckRow[] {
  const list = asRecord(raw).checks;
  if (!Array.isArray(list)) return [];

  const rows: CheckRow[] = [];
  for (const item of list) {
    const row = asRecord(item);
    const id = asString(row.id);
    const createdAt = asString(row.created_at);
    if (!id || !createdAt) continue;

    const payload = asRecord(row.result_payload);
    const hasPayload = typeof row.result_payload === "object" && row.result_payload !== null;

    rows.push({
      id,
      requester_addr: asString(row.requester_addr) ?? "",
      check_type: row.check_type === "trust" ? "trust" : "risk",
      status: asString(row.status) ?? "unknown",
      payment_tx_hash: asString(row.payment_tx_hash),
      created_at: createdAt,
      result_payload: hasPayload
        ? {
            riskLevel: asString(payload.riskLevel),
            minDistanceKm: asNumber(payload.minDistanceKm),
            noradIdA: asString(payload.noradIdA),
            noradIdB: asString(payload.noradIdB),
            trustLevel: asString(payload.trustLevel),
            reputationScore: asNumber(payload.reputationScore),
            registered: typeof payload.registered === "boolean" ? payload.registered : null,
          }
        : null,
    });
  }
  return rows;
}

const RISK_SEVERITY: Record<string, Severity> = {
  low: "ok",
  moderate: "warn",
  high: "alert",
  critical: "alert",
};

const TRUST_SEVERITY: Record<string, Severity> = {
  high: "ok",
  moderate: "warn",
  low: "alert",
  unverified: "alert",
};

/** Result column: a short operational verdict rather than the raw payload. */
export function resultBadge(row: CheckRow): { label: string; severity: Severity } {
  if (row.status !== "completed") return { label: "PENDING", severity: "neutral" };

  const payload = row.result_payload;
  if (!payload) return { label: "NO RESULT", severity: "neutral" };

  if (row.check_type === "risk") {
    const level = payload.riskLevel?.toLowerCase();
    if (!level) return { label: "NO RESULT", severity: "neutral" };
    return { label: level.toUpperCase(), severity: RISK_SEVERITY[level] ?? "neutral" };
  }

  if (payload.registered === false) return { label: "UNREGISTERED", severity: "alert" };
  const level = payload.trustLevel?.toLowerCase();
  if (level) return { label: level.toUpperCase(), severity: TRUST_SEVERITY[level] ?? "neutral" };
  if (payload.registered === true) return { label: "REGISTERED", severity: "ok" };
  return { label: "NO RESULT", severity: "neutral" };
}

/** Supporting facts for a result, already human-readable. */
export function resultFacts(row: CheckRow): string[] {
  const payload = row.result_payload;
  if (!payload || row.status !== "completed") return [];

  if (row.check_type === "risk") {
    const facts: string[] = [];
    if (payload.minDistanceKm !== null) facts.push(`min distance ${formatKm(payload.minDistanceKm)}`);
    if (payload.noradIdA && payload.noradIdB) {
      facts.push(`NORAD ${payload.noradIdA} ↔ ${payload.noradIdB}`);
    } else if (payload.noradIdA || payload.noradIdB) {
      facts.push(`NORAD ${payload.noradIdA ?? payload.noradIdB}`);
    }
    return facts;
  }

  const facts: string[] = [];
  if (payload.reputationScore !== null) {
    facts.push(`${formatNumber(payload.reputationScore)} reputation`);
  }
  if (payload.registered === true) facts.push("registered");
  if (payload.registered === false) facts.push("not registered");
  return facts;
}

function summarizeService(kind: CheckType, rows: CheckRow[]): ServiceSummary {
  const mine = rows.filter((row) => row.check_type === kind);
  const completed = mine.filter((row) => row.status === "completed").length;
  const latest = mine.find((row) => row.result_payload !== null) ?? mine[0] ?? null;
  return { kind, requests: mine.length, completed, latest };
}

export function summarizeChecks(rows: CheckRow[]): ChecksSummary {
  const risk = rows.filter((row) => row.check_type === "risk").length;
  const trust = rows.length - risk;
  return {
    total: rows.length,
    risk,
    trust,
    completed: rows.filter((row) => row.status === "completed").length,
    pending: rows.filter((row) => row.status !== "completed").length,
    requesters: new Set(rows.map((row) => row.requester_addr).filter(Boolean)).size,
    oldestAt: rows.reduce<string | null>(
      (oldest, row) => (oldest === null || row.created_at < oldest ? row.created_at : oldest),
      null
    ),
    riskService: summarizeService("risk", rows),
    trustService: summarizeService("trust", rows),
  };
}
