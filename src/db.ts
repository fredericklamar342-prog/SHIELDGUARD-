import { Pool } from "pg";
import "dotenv/config";

/**
 * Pool sizing: on Vercel every serverless instance opens its own pool, so the
 * per-instance max must stay small (PGPOOL_MAX × concurrent instances must fit
 * the database's connection budget — use a pooler endpoint for hosted Postgres).
 * For hosted databases append ?sslmode=require to DATABASE_URL; pg parses it
 * from the connection string.
 */
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: Number(process.env.PGPOOL_MAX ?? 3),
});

export async function insertCheck(params: {
  requesterAddr: string;
  checkType: "risk" | "trust";
  inputPayload: unknown;
}) {
  const { rows } = await pool.query(
    `INSERT INTO checks (requester_addr, check_type, input_payload)
     VALUES ($1, $2, $3) RETURNING id`,
    [params.requesterAddr, params.checkType, params.inputPayload]
  );
  return rows[0].id as string;
}

/**
 * Record x402 settlement evidence on a completed check. The tx hash goes into the
 * dedicated column (console + CheckRow contract); payer and network are merged into
 * result_payload.payment so the verified payer wallet is distinguishable from the
 * self-reported requester_addr.
 */
export async function setCheckPaymentTx(
  id: string,
  txHash: string,
  meta: { payer: string | null; network: string }
) {
  await pool.query(
    `UPDATE checks
     SET payment_tx_hash = $2,
         result_payload = jsonb_set(
           COALESCE(result_payload, '{}'::jsonb),
           '{payment}',
           jsonb_build_object('txHash', $2, 'payer', $3, 'network', $4)
         )
     WHERE id = $1`,
    [id, txHash, meta.payer, meta.network]
  );
}

export async function completeCheck(id: string, resultPayload: unknown, paymentTxHash?: string) {
  await pool.query(
    `UPDATE checks
     SET result_payload = $2, status = 'completed', completed_at = now(), payment_tx_hash = COALESCE($3, payment_tx_hash)
     WHERE id = $1`,
    [id, resultPayload, paymentTxHash ?? null]
  );
}

export async function listRecentChecks(limit = 50) {
  const { rows } = await pool.query(
    `SELECT id, requester_addr, check_type, result_payload, payment_tx_hash, status, created_at, completed_at
     FROM checks
     ORDER BY created_at DESC
     LIMIT $1`,
    [limit]
  );
  return rows;
}

export async function getCachedTle(noradId: string) {
  const { rows } = await pool.query(
    `SELECT * FROM tle_cache WHERE norad_id = $1 AND expires_at > now()`,
    [noradId]
  );
  return rows[0] ?? null;
}

export async function upsertTle(noradId: string, line1: string, line2: string, ttlSeconds: number) {
  await pool.query(
    `INSERT INTO tle_cache (norad_id, tle_line1, tle_line2, fetched_at, expires_at)
     VALUES ($1, $2, $3, now(), now() + ($4 || ' seconds')::interval)
     ON CONFLICT (norad_id) DO UPDATE
       SET tle_line1 = $2, tle_line2 = $3, fetched_at = now(), expires_at = now() + ($4 || ' seconds')::interval`,
    [noradId, line1, line2, ttlSeconds]
  );
}
