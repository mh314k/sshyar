import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type PromptReq = {
  kind: "prompt";
  title: string;
  message?: string;
  defaultValue?: string;
  password?: boolean;
  placeholder?: string;
  allowEmpty?: boolean;
  minLength?: number;
  resolve: (value: string | null) => void;
};

type ConfirmReq = {
  kind: "confirm";
  title: string;
  message?: string;
  confirmLabel?: string;
  danger?: boolean;
  resolve: (ok: boolean) => void;
};

type Req = PromptReq | ConfirmReq;

let queue: Req[] = [];
let notify: (() => void) | null = null;

function push(req: Req) {
  queue = [...queue, req];
  notify?.();
}

export function appPrompt(options: {
  title: string;
  message?: string;
  defaultValue?: string;
  password?: boolean;
  placeholder?: string;
  allowEmpty?: boolean;
  minLength?: number;
}): Promise<string | null> {
  return new Promise((resolve) => {
    push({ kind: "prompt", ...options, resolve });
  });
}

export function appConfirm(options: {
  title: string;
  message?: string;
  confirmLabel?: string;
  danger?: boolean;
}): Promise<boolean> {
  return new Promise((resolve) => {
    push({ kind: "confirm", ...options, resolve });
  });
}

function advance(setCurrent: (r: Req | null) => void) {
  const [next, ...rest] = queue;
  queue = rest;
  setCurrent(next ?? null);
}

export function DialogHost() {
  const [current, setCurrent] = useState<Req | null>(null);
  const [value, setValue] = useState("");

  useEffect(() => {
    notify = () => {
      setCurrent((cur) => {
        if (cur) return cur;
        const [next, ...rest] = queue;
        queue = rest;
        return next ?? null;
      });
    };
    notify();
    return () => {
      notify = null;
    };
  }, []);

  useEffect(() => {
    if (current?.kind === "prompt") {
      setValue(current.defaultValue ?? "");
    }
  }, [current]);

  function finishPrompt(result: string | null) {
    if (!current || current.kind !== "prompt") return;
    current.resolve(result);
    advance(setCurrent);
  }

  function finishConfirm(ok: boolean) {
    if (!current || current.kind !== "confirm") return;
    current.resolve(ok);
    advance(setCurrent);
  }

  if (!current) return null;

  const minLen = current.kind === "prompt" ? (current.minLength ?? 0) : 0;
  const allowEmpty = current.kind === "prompt" ? !!current.allowEmpty : false;
  const tooShort = current.kind === "prompt" && value.length > 0 && value.length < minLen;
  const emptyBlocked =
    current.kind === "prompt" && !allowEmpty && value.trim().length < Math.max(minLen, 1);
  const canSubmit = current.kind === "prompt" && !tooShort && !emptyBlocked;

  return createPortal(
    <div
      className="app-modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          if (current.kind === "prompt") finishPrompt(null);
          else finishConfirm(false);
        }
      }}
    >
      <div
        className="app-modal"
        role="dialog"
        aria-modal="true"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2 className="app-modal-title">{current.title}</h2>
        {current.message ? <p className="muted app-modal-message">{current.message}</p> : null}

        {current.kind === "prompt" ? (
          <form
            className="app-modal-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (!canSubmit) return;
              finishPrompt(value);
            }}
          >
            <input
              autoFocus
              type={current.password ? "password" : "text"}
              value={value}
              placeholder={current.placeholder}
              onChange={(e) => setValue(e.target.value)}
            />
            {tooShort ? <p className="error">At least {minLen} characters</p> : null}
            <div className="app-modal-actions">
              <button type="button" className="ghost" onClick={() => finishPrompt(null)}>
                Cancel
              </button>
              <button type="submit" disabled={!canSubmit}>
                OK
              </button>
            </div>
          </form>
        ) : (
          <div className="app-modal-actions">
            <button type="button" className="ghost" onClick={() => finishConfirm(false)}>
              Cancel
            </button>
            <button
              type="button"
              className={current.danger ? "danger" : undefined}
              onClick={() => finishConfirm(true)}
              autoFocus
            >
              {current.confirmLabel ?? "OK"}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
