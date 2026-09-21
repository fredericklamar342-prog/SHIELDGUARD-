import { useEffect, useRef, useState } from "react";

async function writeClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the legacy path below
  }
  try {
    const el = document.createElement("textarea");
    el.value = text;
    el.setAttribute("readonly", "");
    el.style.position = "fixed";
    el.style.top = "-1000px";
    el.style.opacity = "0";
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(el);
    return ok;
  } catch {
    return false;
  }
}

type CopyState = "idle" | "copied" | "error";

function useCopy(value: string, label: string) {
  const [state, setState] = useState<CopyState>("idle");
  const timer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, []);

  async function copy() {
    const ok = await writeClipboard(value);
    setState(ok ? "copied" : "error");
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setState("idle"), 1600);
  }

  const announcement =
    state === "copied" ? `${label} copied to clipboard` : state === "error" ? `Could not copy ${label}` : "";

  return { state, copy, announcement };
}

function CopyGlyph() {
  return (
    <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
      <rect x="1.3" y="3.7" width="7" height="7" rx="1.2" fill="none" stroke="currentColor" strokeWidth="1.1" />
      <path
        d="M4 3.7V2.1c0-.5.4-.8.8-.8h4.3c.4 0 .8.3.8.8v4.3c0 .4-.4.8-.8.8H7.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.1"
      />
    </svg>
  );
}

function CheckGlyph() {
  return (
    <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
      <path
        d="m2.2 6.4 2.7 2.7 5-5.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CrossGlyph() {
  return (
    <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
      <path d="M3 3l6 6M9 3l-6 6" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

type CopyButtonProps = {
  value: string;
  /** Accessible name for the control, e.g. "wallet address". */
  label: string;
};

/** Icon-only copy control; quiet by default, confirms in place. */
export function CopyButton({ value, label }: CopyButtonProps) {
  const { state, copy, announcement } = useCopy(value, label);
  return (
    <>
      <button
        type="button"
        className="copy-btn"
        onClick={() => void copy()}
        data-state={state}
        aria-label={`Copy ${label}`}
        title={`Copy ${label}`}
      >
        {state === "copied" ? <CheckGlyph /> : state === "error" ? <CrossGlyph /> : <CopyGlyph />}
      </button>
      <span className="visually-hidden" role="status" aria-live="polite">
        {announcement}
      </span>
    </>
  );
}

type CopyableProps = {
  value: string;
  /** Shortened form shown on screen; the full value stays in the tooltip. */
  display?: string;
  label: string;
};

/** Monospace identifier with an adjacent copy action (addresses, hashes). */
export function Copyable({ value, display, label }: CopyableProps) {
  return (
    <span className="copyable">
      <span className="copyable__value" title={value}>
        {display ?? value}
      </span>
      <CopyButton value={value} label={label} />
    </span>
  );
}
