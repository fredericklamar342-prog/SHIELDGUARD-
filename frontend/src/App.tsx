import "./App.css";
import { ActivityTable } from "./components/ActivityTable";
import { AgentIdentity } from "./components/AgentIdentity";
import { Header } from "./components/Header";
import { MetricsBar } from "./components/MetricsBar";
import { ServicePanel } from "./components/ServicePanel";
import {
  API_BASE_CONFIGURED,
  CHECKS_ENDPOINT,
  IS_LOCAL_HOST,
  POLL_INTERVAL_MS,
  useChecks,
} from "./hooks/useChecks";
import { summarizeChecks } from "./lib/checks";
import { timeAgo } from "./lib/format";

export default function App() {
  const { checks, connection, lastUpdated, now, refresh } = useChecks();
  const summary = summarizeChecks(checks);
  // "Live with zero checks" is a fact; "offline with zero checks" is not.
  const dataKnown = connection === "live" || summary.total > 0;
  // On a hosted deployment the API is co-located (same domain, via rewrites),
  // so "unconfigured" only applies to localhost without a running dev server.
  const unconfiguredDeployment = IS_LOCAL_HOST && !API_BASE_CONFIGURED;

  return (
    <div className="app">
      <Header
        connection={connection}
        lastUpdated={lastUpdated}
        now={now}
        unconfigured={unconfiguredDeployment}
      />

      <main className="page">
        {connection === "offline" && (
          <div className="notice notice--alert" role="alert">
            <div className="notice__body">
              <strong className="notice__title">Backend connection unavailable</strong>
              <span className="notice__detail">
                {lastUpdated
                  ? `Live polling paused — last successful response ${timeAgo(
                      new Date(lastUpdated).toISOString(),
                      now
                    )}. Figures below are not current.`
                  : unconfiguredDeployment
                    ? "This deployment has no backend configured, so live verification data cannot be loaded."
                    : `No response from ${CHECKS_ENDPOINT}.`}
              </span>
            </div>
            <button type="button" className="btn" onClick={() => void refresh()}>
              Retry now
            </button>
          </div>
        )}

        <section className="band" aria-label="Agent identity and services">
          <AgentIdentity />
          <ServicePanel
            index="01"
            name="Orbital risk"
            blurb="Satellite collision-risk assessment"
            endpoint="/v1/risk-check"
            summary={summary.riskService}
            now={now}
            available={dataKnown}
          />
          <ServicePanel
            index="02"
            name="Agent trust"
            blurb="ERC-8004 reputation verification"
            endpoint="/v1/trust-check"
            summary={summary.trustService}
            now={now}
            available={dataKnown}
          />
        </section>

        <MetricsBar summary={summary} now={now} known={dataKnown} />

        <ActivityTable
          checks={checks}
          connection={connection}
          now={now}
          unconfigured={unconfiguredDeployment}
        />

        <footer className="pagefoot">
          <span>
            {unconfiguredDeployment ? (
              <>Backend URL not configured</>
            ) : (
              <>
                Source <code>GET {CHECKS_ENDPOINT}</code>
              </>
            )}
          </span>
          <span>Polled every {POLL_INTERVAL_MS / 1000}s · newest first</span>
        </footer>
      </main>
    </div>
  );
}
