import { AGENT_ID, IDENTITY_STANDARD, NETWORK, WALLET } from "../lib/identity";
import { CopyButton } from "./Copyable";
import { StatusBadge } from "./StatusBadge";

/** On-chain identity of the agent operating the services. */
export function AgentIdentity() {
  return (
    <article className="panel identity">
      <header className="panel__head">
        <h2 className="panel__title">Agent identity</h2>
        <StatusBadge label="REGISTERED" severity="ok" />
      </header>

      <p className="identity__agent">
        <span className="identity__hash">#</span>
        {AGENT_ID}
      </p>

      <dl className="kv">
        <div className="kv__row">
          <dt>Registry</dt>
          <dd>{IDENTITY_STANDARD} identity</dd>
        </div>
        <div className="kv__row">
          <dt>Network</dt>
          <dd>{NETWORK}</dd>
        </div>
      </dl>

      <div className="identity__wallet">
        <div className="identity__wallet-head">
          <span className="label">Operator wallet</span>
          <CopyButton value={WALLET} label="wallet address" />
        </div>
        <p className="identity__address">{WALLET}</p>
      </div>
    </article>
  );
}
