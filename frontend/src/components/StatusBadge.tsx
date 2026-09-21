import type { Severity } from "../types/checks";

type Props = {
  label: string;
  severity: Severity;
};

/** Text-first status marker; colour reinforces the label instead of replacing it. */
export function StatusBadge({ label, severity }: Props) {
  return (
    <span className={`badge badge--${severity}`}>
      <span className="badge__dot" aria-hidden="true" />
      {label}
    </span>
  );
}
