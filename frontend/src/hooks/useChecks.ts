import { useCallback, useEffect, useRef, useState } from "react";
import { parseChecks } from "../lib/checks";
import type { CheckRow } from "../types/checks";

const LOCAL_HOSTS = ["localhost", "127.0.0.1"];
const isBrowser = typeof window !== "undefined";
const isLocalhost = isBrowser && LOCAL_HOSTS.includes(window.location.hostname);

const envBase: unknown = import.meta.env.VITE_API_BASE;
const configuredBase = typeof envBase === "string" && envBase.length > 0 ? envBase : null;

/**
 * On localhost, default to the local dev server. On a hosted deployment, use
 * relative URLs (the Vercel rewrites in vercel.json route /v1/* → /api/index).
 */
export const API_BASE = configuredBase ?? (isLocalhost ? "http://localhost:8787" : "");

/** True when the user explicitly set VITE_API_BASE at build time. */
export const API_BASE_CONFIGURED = configuredBase !== null;

export const IS_LOCAL_HOST = isLocalhost;
export const CHECKS_ENDPOINT = `${API_BASE}/v1/checks`;
export const POLL_INTERVAL_MS = 4000;

/** `connecting` only applies to the very first request, before any answer. */
export type Connection = "connecting" | "live" | "offline";

/**
 * Polls `GET /v1/checks` on a fixed interval. Failed requests flip the
 * connection to `offline` and keep the last good payload on screen so the
 * console shows history without pretending the backend is reachable.
 */
export function useChecks() {
  const [checks, setChecks] = useState<CheckRow[]>([]);
  const [connection, setConnection] = useState<Connection>("connecting");
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const inFlight = useRef(false);

  const refresh = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const res = await fetch(CHECKS_ENDPOINT, { headers: { accept: "application/json" } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: unknown = await res.json();
      setChecks(parseChecks(data));
      setConnection("live");
      setLastUpdated(Date.now());
    } catch {
      setConnection("offline");
    } finally {
      inFlight.current = false;
      setNow(Date.now());
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      if (cancelled) return;
      await refresh();
    };

    void tick();
    const poll = window.setInterval(() => void tick(), POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(poll);
    };
  }, [refresh]);

  // Keeps relative timestamps ("12s ago") moving between polls.
  useEffect(() => {
    const ticker = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(ticker);
  }, []);

  return { checks, connection, lastUpdated, now, refresh };
}
