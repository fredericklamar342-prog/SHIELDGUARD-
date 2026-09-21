import { resultBadge, resultFacts } from "../lib/checks";
import { timeAgo } from "../lib/format";
import type { ServiceSummary } from "../types/checks";
import { StatusBadge } from "./StatusBadge";

type Props = {
  index: string;
  name: string;
  blurb: string;
  endpoint: string;
  summary: ServiceSummary;
  now: number;
  /** False while no data has been retrieved from the backend. */
  available: boolean;
};

/** One paid x402 service, described by what actually flows through it. */
export function ServicePanel({ index, name, blurb, endpoint, summary, now, available }: Props) {
  const latest = summary.latest;
  const badge = latest && available ? resultBadge(latest) : null;
  const facts = latest && available ? resultFacts(latest) : [];

  return (
    <article className="panel service">
      <header className="panel__head">
        <h2 className="panel__title">{name}</h2>
        <span className="service__index">Service {index}</span>
      </header>

      <div className="service__latest">
        <span className="label">Latest result</span>
        {latest && badge ? (
          <div className="service__result">
            <StatusBadge label={badge.label} severity={badge.severity} />
            {facts.length > 0 && <span className="service__facts">{facts.join(" · ")}</span>}
          </div>
        ) : (
          <p className="service__idle">{available ? "No requests recorded" : "No data received"}</p>
        )}
      </div>

      <dl className="service__stats">
        <div>
          <dt>Requests</dt>
          <dd className={available ? undefined : "is-unknown"}>{available ? summary.requests : "—"}</dd>
        </div>
        <div>
          <dt>Last check</dt>
          <dd className={`service__time${available && latest ? "" : " is-unknown"}`}>
            {available && latest ? timeAgo(latest.created_at, now) : "—"}
          </dd>
        </div>
      </dl>

      <footer className="service__meta">
        <span className="service__blurb">{blurb}</span>
        <code className="service__endpoint">POST {endpoint}</code>
      </footer>
    </article>
  );
}
