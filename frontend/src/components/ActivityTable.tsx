import { resultBadge, resultFacts } from "../lib/checks";
import { formatUtc, shorten, timeAgo } from "../lib/format";
import { CHECKS_ENDPOINT } from "../hooks/useChecks";
import type { Connection } from "../hooks/useChecks";
import type { CheckRow } from "../types/checks";
import { Copyable } from "./Copyable";
import { StatusBadge } from "./StatusBadge";

const SERVICE_LABEL: Record<CheckRow["check_type"], string> = {
  risk: "Orbital risk",
  trust: "Agent trust",
};

type Props = {
  checks: CheckRow[];
  connection: Connection;
  now: number;
  /** True on a hosted deployment where no backend URL was configured at build time. */
  unconfigured: boolean;
};

function SkeletonRows() {
  return (
    <div className="table-state table-state--loading" aria-busy="true" aria-live="polite">
      <span className="visually-hidden">Loading recent checks</span>
      {[0, 1, 2, 3, 4].map((i) => (
        <div className="skeleton-row" key={i} aria-hidden="true">
          <span className="skeleton" style={{ width: "46px" }} />
          <span className="skeleton" style={{ width: "84px" }} />
          <span className="skeleton" style={{ width: "62px" }} />
          <span className="skeleton" style={{ width: "220px" }} />
          <span className="skeleton" style={{ width: "96px" }} />
          <span className="skeleton" style={{ width: "96px" }} />
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="table-state">
      <p className="table-state__title">No verification activity yet</p>
      <p className="table-state__body">
        Requests appear here as soon as the agent processes a paid check. Risk and trust results are
        recorded with their requester and x402 payment.
      </p>
    </div>
  );
}

function OfflineState({ unconfigured }: { unconfigured: boolean }) {
  return (
    <div className="table-state">
      <p className="table-state__title">Verification history unavailable</p>
      {unconfigured ? (
        <p className="table-state__body">
          No backend is configured for this deployment. Verification history appears here once a
          backend URL is supplied at build time (see the project README).
        </p>
      ) : (
        <p className="table-state__body">
          No records have been retrieved from <code>{CHECKS_ENDPOINT}</code>. Checks will appear
          here as soon as the backend responds.
        </p>
      )}
    </div>
  );
}

/** The core console view: every check the agent has processed, newest first. */
export function ActivityTable({ checks, connection, now, unconfigured }: Props) {
  const firstLoad = connection === "connecting" && checks.length === 0;

  return (
    <section className="panel panel--activity" aria-labelledby="activity-heading">
      <header className="panel__head">
        <h2 className="panel__title" id="activity-heading">
          Recent verification activity
        </h2>
        {checks.length > 0 && (
          <span className="panel__note">
            {checks.length} record{checks.length === 1 ? "" : "s"} · newest first
          </span>
        )}
      </header>

      {firstLoad ? (
        <SkeletonRows />
      ) : checks.length === 0 ? (
        connection === "offline" ? (
          <OfflineState unconfigured={unconfigured} />
        ) : (
          <EmptyState />
        )
      ) : (
        <div className="table-scroll">
          <table className="checks">
            <colgroup>
              <col className="col-time" />
              <col className="col-service" />
              <col className="col-result" />
              <col className="col-detail" />
              <col className="col-requester" />
              <col className="col-payment" />
            </colgroup>
            <thead>
              <tr>
                <th scope="col">Time</th>
                <th scope="col">Service</th>
                <th scope="col">Result</th>
                <th scope="col">Detail</th>
                <th scope="col">Requester</th>
                <th scope="col">x402 payment</th>
              </tr>
            </thead>
            <tbody>
              {checks.map((row) => {
                const badge = resultBadge(row);
                const facts = resultFacts(row);
                const pending = row.status !== "completed";
                return (
                  <tr key={row.id} className={pending ? "is-pending" : undefined}>
                    <td className="cell-time">
                      <time dateTime={row.created_at} title={formatUtc(row.created_at)}>
                        {timeAgo(row.created_at, now)}
                      </time>
                    </td>
                    <td>{SERVICE_LABEL[row.check_type]}</td>
                    <td>
                      <StatusBadge label={badge.label} severity={badge.severity} />
                    </td>
                    <td className="cell-detail">
                      {facts.length > 0 ? (
                        facts.map((fact, i) => (
                          <span key={fact}>
                            {i > 0 && (
                              <span className="cell-detail__sep" aria-hidden="true">
                                ·
                              </span>
                            )}
                            {fact}
                          </span>
                        ))
                      ) : (
                        <span className="muted">Awaiting result</span>
                      )}
                    </td>
                    <td>
                      {row.requester_addr ? (
                        <Copyable
                          value={row.requester_addr}
                          display={shorten(row.requester_addr)}
                          label="requester address"
                        />
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td>
                      {row.payment_tx_hash ? (
                        <Copyable
                          value={row.payment_tx_hash}
                          display={shorten(row.payment_tx_hash)}
                          label="payment transaction hash"
                        />
                      ) : (
                        <span className="muted">not recorded</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
