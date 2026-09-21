import type { ChecksSummary } from "../types/checks";
import { formatNumber, timeAgo } from "../lib/format";

type Props = {
  summary: ChecksSummary;
  now: number;
  /** False while nothing has been retrieved (first load, or a failed fetch). */
  known: boolean;
};

/** Volume and span of the verification traffic currently on screen. */
export function MetricsBar({ summary, now, known }: Props) {
  const cells = [
    {
      label: "Checks observed",
      value: known ? formatNumber(summary.total) : "—",
      hint: known ? "last 50 records" : "no data retrieved",
    },
    {
      label: "Completed",
      value: known ? formatNumber(summary.completed) : "—",
      hint: !known ? "unavailable" : summary.pending > 0 ? `${summary.pending} pending` : "all results returned",
    },
    {
      label: "Requesters",
      value: known ? formatNumber(summary.requesters) : "—",
      hint: "distinct addresses",
    },
    {
      label: "Oldest record",
      value: known && summary.oldestAt ? timeAgo(summary.oldestAt, now) : "—",
      hint: "current view",
    },
  ];

  return (
    <dl className="metrics" aria-label="Verification volume">
      {cells.map((cell) => (
        <div className="metrics__cell" key={cell.label}>
          <dt className="metrics__label">{cell.label}</dt>
          <dd className={`metrics__value${cell.value === "—" ? " is-unknown" : ""}`}>{cell.value}</dd>
          <dd className="metrics__hint">{cell.hint}</dd>
        </div>
      ))}
    </dl>
  );
}
