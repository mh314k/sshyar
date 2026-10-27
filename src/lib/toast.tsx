import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import CloseIcon from "@mui/icons-material/Close";
import { iconProps } from "../components/icons";

export type ToastKind = "info" | "success" | "error";

export type ToastAction = {
  id: string;
  label: string;
  onClick: () => void;
};

type Toast = {
  id: number;
  kind: ToastKind;
  title?: string;
  message: string;
  actions?: ToastAction[];
};

let seq = 0;
let items: Toast[] = [];
let notify: (() => void) | null = null;
const timers = new Map<number, number>();

function publish() {
  notify?.();
}

function clearToastTimer(id: number) {
  const t = timers.get(id);
  if (t != null) {
    window.clearTimeout(t);
    timers.delete(id);
  }
}

/** Shorten/normalize backend & OS errors for the UI. */
export function formatAppError(err: unknown): string {
  let raw = String(err ?? "Unknown error");
  raw = raw.replace(/^Error:\s*/i, "").trim();

  if (/os error 10060|did not properly respond|timed out|timeout/i.test(raw)) {
    return "Connection timed out — host did not respond";
  }
  if (/os error 10061|connection refused/i.test(raw)) {
    return "Connection refused — check host and port";
  }
  if (/os error 11001|getaddrinfo|no such host|name or service not known/i.test(raw)) {
    return "Host not found — check the hostname";
  }
  if (/os error 10054|connection reset/i.test(raw)) {
    return "Connection reset by remote host";
  }
  if (/authentication failed|auth failed|incorrect master password/i.test(raw)) {
    if (/incorrect master/i.test(raw)) return "Incorrect master password";
    return "Authentication failed";
  }
  if (/password required/i.test(raw)) return "Password required";
  if (/private key path required/i.test(raw)) return "Private key path required";
  if (/vault is locked/i.test(raw)) return "Vault is locked";

  raw = raw.replace(/^SSH connect failed:\s*/i, "");
  if (raw.length > 140) return `${raw.slice(0, 137)}…`;
  return raw;
}

/** Remove a toast immediately (cancels any auto-dismiss timer). */
export function dismissToast(id: number) {
  clearToastTimer(id);
  const before = items.length;
  items = items.filter((t) => t.id !== id);
  if (items.length !== before) publish();
}

/**
 * Show a toast. Returns its id so callers can dismiss it.
 * Pass `durationMs: 0` (or negative) to keep it until Close / dismissToast / an action.
 */
export function toast(
  message: string,
  opts?: {
    kind?: ToastKind;
    title?: string;
    durationMs?: number;
    actions?: ToastAction[];
  },
): number {
  const id = ++seq;
  const kind = opts?.kind ?? "info";
  const entry: Toast = {
    id,
    kind,
    title: opts?.title,
    message,
    actions: opts?.actions,
  };
  items = [...items, entry].slice(-4);
  publish();

  const ms = opts?.durationMs ?? (kind === "error" ? 6500 : 3200);
  if (ms > 0) {
    const timer = window.setTimeout(() => {
      timers.delete(id);
      dismissToast(id);
    }, ms);
    timers.set(id, timer);
  }
  return id;
}

export function toastError(err: unknown, title = "Error") {
  toast(formatAppError(err), { kind: "error", title });
}

export function toastSuccess(message: string, title?: string) {
  toast(message, { kind: "success", title });
}

export function ToastHost() {
  const [list, setList] = useState<Toast[]>([]);

  useEffect(() => {
    notify = () => setList([...items]);
    setList([...items]);
    return () => {
      notify = null;
    };
  }, []);

  if (!list.length) return null;

  return createPortal(
    <div className="toast-stack" aria-live="polite">
      {list.map((t) => (
        <div key={t.id} className={`toast toast-${t.kind}`} role="status">
          <div className="toast-body">
            {t.title ? <div className="toast-title">{t.title}</div> : null}
            <div className="toast-message">{t.message}</div>
            {t.actions?.length ? (
              <div className="toast-actions">
                {t.actions.map((action) => (
                  <button
                    key={action.id}
                    type="button"
                    className="toast-action"
                    onClick={() => {
                      action.onClick();
                    }}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <button
            type="button"
            className="toast-close"
            title="Close"
            aria-label="Close"
            onClick={() => dismissToast(t.id)}
          >
            <CloseIcon {...iconProps(14)} />
          </button>
        </div>
      ))}
    </div>,
    document.body,
  );
}
