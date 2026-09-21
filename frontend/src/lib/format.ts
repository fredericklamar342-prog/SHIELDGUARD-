/** Formatting helpers. Deterministic output (explicit locales), no external deps. */

const NUM = new Intl.NumberFormat("en-US");

/** `0x3a3c2989c16F5e0eD6A52FaF517FFc39e6a6EcFb` -> `0x3a3c…cFb` (full value stays available via title/copy). */
export function shorten(value: string, lead = 6, tail = 4): string {
  if (!value) return "—";
  if (value.length <= lead + tail + 1) return value;
  return `${value.slice(0, lead)}…${value.slice(-tail)}`;
}

/** Orbital distances span a few km to tens of thousands of km. */
export function formatKm(km: number | null): string {
  if (km === null || !Number.isFinite(km)) return "—";
  if (Math.abs(km) >= 1000) return `${NUM.format(Math.round(km))} km`;
  if (Math.abs(km) >= 10) return `${km.toFixed(1)} km`;
  return `${km.toFixed(2)} km`;
}

export function formatNumber(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "—";
  return NUM.format(value);
}

export function timeAgo(iso: string, now: number): string {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "—";
  const s = Math.max(0, Math.floor((now - t) / 1000));
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return `${Math.floor(d / 30)}mo ago`;
}

/** Full UTC timestamp, used for tooltips and secondary text. */
export function formatUtc(iso: string | number): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.toISOString().slice(0, 10)} ${d.toISOString().slice(11, 19)} UTC`;
}
