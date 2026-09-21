import { IDENTITY_STANDARD, NETWORK, PAYMENT_RAIL } from "../lib/identity";
import { timeAgo } from "../lib/format";
import type { Connection } from "../hooks/useChecks";

type Props = {
  connection: Connection;
  lastUpdated: number | null;
  now: number;
  /** Hosted build with no backend URL baked in — "unreachable" would be misleading. */
  unconfigured: boolean;
};

const CONNECTION_LABEL: Record<Connection, string> = {
  live: "LIVE",
  offline: "OFFLINE",
  connecting: "CONNECTING",
};

export function Header({ connection, lastUpdated, now, unconfigured }: Props) {
  const detail =
    connection === "live"
      ? `updated ${timeAgo(new Date(lastUpdated ?? now).toISOString(), now)}`
      : connection === "offline"
        ? unconfigured
          ? "backend not configured"
          : "backend unreachable"
        : "awaiting first response";

  return (
    <header className="topbar">
      <div className="topbar__inner">
        <div className="wordmark">
          <svg className="wordmark__glyph" viewBox="0 0 20 20" width="17" height="17" aria-hidden="true">
            <path
              d="M10 1.7 3.3 4.4v5c0 4.1 2.8 7.2 6.7 8.9 3.9-1.7 6.7-4.8 6.7-8.9v-5L10 1.7Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.35"
            />
            <path
              d="m6.9 9.9 2.1 2.1 4-4.3"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.35"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="wordmark__name">ShieldGuard</span>
          <span className="wordmark__tag">Autonomous verification network</span>
        </div>

        <div className="topbar__right">
          <ul className="chips" aria-label="Network and standards">
            <li className="chip">{NETWORK}</li>
            <li className="chip">{PAYMENT_RAIL}</li>
            <li className="chip">{IDENTITY_STANDARD}</li>
          </ul>
          <div className={`conn conn--${connection}`} role="status">
            <span className="conn__dot" aria-hidden="true" />
            <span className="conn__label">{CONNECTION_LABEL[connection]}</span>
            <span className="conn__detail">{detail}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
