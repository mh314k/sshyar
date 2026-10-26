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

type PasswordPromptReq = {
  kind: "passwordPrompt";
  title: string;
  message?: string;
  /** Soft warning only — never blocks submit. */
  strengthHint?: (password: string) => string | null;
  /** If set, require current password as well (change-password flow). */
  requireCurrent?: boolean;
  resolve: (value: PasswordPromptResult | null) => void;
};

export type PasswordPromptResult = {
  password: string;
  current?: string;
};

type ConfirmReq = {
  kind: "confirm";
  title: string;
  message?: string;
  confirmLabel?: string;
  danger?: boolean;
  /** When set, user must type this exact phrase to enable confirm (strong confirm). */
  confirmText?: string;
  confirmTextPlaceholder?: string;
  resolve: (ok: boolean) => void;
};

type Req = PromptReq | PasswordPromptReq | ConfirmReq;

/** Survive Vite HMR so push() and DialogHost share one queue (avoids hung confirms). */
type DialogGlobals = {
  queue: Req[];
  notify: (() => void) | null;
};

function dialogGlobals(): DialogGlobals {
  const w = window as Window & { __sshyarDialogs?: DialogGlobals };
  if (!w.__sshyarDialogs) {
    w.__sshyarDialogs = { queue: [], notify: null };
  }
  return w.__sshyarDialogs;
}

function push(req: Req) {
  const g = dialogGlobals();
  g.queue = [...g.queue, req];
  g.notify?.();
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

/** One dialog: new password + confirm (+ optional current). Soft strength warning. */
export function appPasswordPrompt(options: {
  title: string;
  message?: string;
  strengthHint?: (password: string) => string | null;
  requireCurrent?: boolean;
}): Promise<PasswordPromptResult | null> {
  return new Promise((resolve) => {
    push({ kind: "passwordPrompt", ...options, resolve });
  });
}

export function appConfirm(options: {
  title: string;
  message?: string;
  confirmLabel?: string;
  danger?: boolean;
  /** Exact phrase the user must type (e.g. PRUNE) before confirm is enabled. */
  confirmText?: string;
  confirmTextPlaceholder?: string;
}): Promise<boolean> {
  return new Promise((resolve) => {
    push({ kind: "confirm", ...options, resolve });
  });
}

function advance(setCurrent: (r: Req | null) => void) {
  const g = dialogGlobals();
  const [next, ...rest] = g.queue;
  g.queue = rest;
  setCurrent(next ?? null);
}

export function DialogHost() {
  const [current, setCurrent] = useState<Req | null>(null);
  const [value, setValue] = useState("");
  const [confirmValue, setConfirmValue] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");

  useEffect(() => {
    const g = dialogGlobals();
    g.notify = () => {
      setCurrent((cur) => {
        if (cur) return cur;
        const gg = dialogGlobals();
        const [next, ...rest] = gg.queue;
        gg.queue = rest;
        return next ?? null;
      });
    };
    g.notify();
    return () => {
      if (dialogGlobals().notify === g.notify) {
        dialogGlobals().notify = null;
      }
    };
  }, []);

  useEffect(() => {
    setValue(current?.kind === "prompt" ? (current.defaultValue ?? "") : "");
    setConfirmValue("");
    setCurrentPassword("");
  }, [current]);

  const confirmPhrase =
    current?.kind === "confirm" && current.confirmText ? current.confirmText : null;
  const phraseOk = !confirmPhrase || confirmValue.trim() === confirmPhrase;
  const canSubmitConfirm = current?.kind === "confirm" && phraseOk;

  function finishPrompt(result: string | null) {
    if (!current || current.kind !== "prompt") return;
    const resolve = current.resolve;
    advance(setCurrent);
    queueMicrotask(() => resolve(result));
  }

  function finishPassword(result: PasswordPromptResult | null) {
    if (!current || current.kind !== "passwordPrompt") return;
    const resolve = current.resolve;
    advance(setCurrent);
    queueMicrotask(() => resolve(result));
  }

  function finishConfirm(ok: boolean) {
    if (!current || current.kind !== "confirm") return;
    const resolve = current.resolve;
    advance(setCurrent);
    queueMicrotask(() => resolve(ok));
  }

  if (!current) return null;

  const minLen = current.kind === "prompt" ? (current.minLength ?? 0) : 0;
  const allowEmpty = current.kind === "prompt" ? !!current.allowEmpty : false;
  const tooShort = current.kind === "prompt" && value.length > 0 && value.length < minLen;
  const emptyBlocked =
    current.kind === "prompt" && !allowEmpty && value.trim().length < Math.max(minLen, 1);
  const canSubmitPrompt = current.kind === "prompt" && !tooShort && !emptyBlocked;

  const requireCurrent = current.kind === "passwordPrompt" && !!current.requireCurrent;
  const mismatch =
    current.kind === "passwordPrompt" &&
    confirmValue.length > 0 &&
    value !== confirmValue;
  const weak =
    current.kind === "passwordPrompt" && value.length > 0
      ? (current.strengthHint?.(value) ?? null)
      : null;
  const canSubmitPassword =
    current.kind === "passwordPrompt" &&
    value.length > 0 &&
    value === confirmValue &&
    (!requireCurrent || currentPassword.length > 0);

  return createPortal(
    <div
      className="app-modal-overlay"
      onMouseDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (current.kind === "confirm") finishConfirm(false);
        else if (current.kind === "passwordPrompt") finishPassword(null);
        else finishPrompt(null);
      }}
    >
      <div
        className="app-modal"
        role="dialog"
        aria-modal="true"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2 className="app-modal-title">{current.title}</h2>
        {current.message ? (
          <p
            className={`muted app-modal-message${
              current.kind === "confirm" && current.confirmText ? " is-pre" : ""
            }`}
          >
            {current.message}
          </p>
        ) : null}

        {current.kind === "prompt" ? (
          <form
            className="app-modal-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (!canSubmitPrompt) return;
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
              <button type="submit" disabled={!canSubmitPrompt}>
                OK
              </button>
            </div>
          </form>
        ) : current.kind === "passwordPrompt" ? (
          <form
            className="app-modal-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (!canSubmitPassword) return;
              finishPassword({
                password: value,
                current: requireCurrent ? currentPassword : undefined,
              });
            }}
          >
            {requireCurrent ? (
              <input
                autoFocus
                type="password"
                value={currentPassword}
                placeholder="Current password"
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
              />
            ) : null}
            <input
              autoFocus={!requireCurrent}
              type="password"
              value={value}
              placeholder="New password"
              onChange={(e) => setValue(e.target.value)}
              autoComplete="new-password"
            />
            <input
              type="password"
              value={confirmValue}
              placeholder="Confirm new password"
              onChange={(e) => setConfirmValue(e.target.value)}
              autoComplete="new-password"
            />
            {mismatch ? <p className="error">Passwords do not match</p> : null}
            {!mismatch && weak ? <p className="warn">{weak} You can still use it.</p> : null}
            <div className="app-modal-actions">
              <button type="button" className="ghost" onClick={() => finishPassword(null)}>
                Cancel
              </button>
              <button type="submit" disabled={!canSubmitPassword}>
                OK
              </button>
            </div>
          </form>
        ) : (
          <form
            className="app-modal-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (!canSubmitConfirm) return;
              finishConfirm(true);
            }}
          >
            {confirmPhrase ? (
              <input
                autoFocus
                type="text"
                value={confirmValue}
                placeholder={
                  current.confirmTextPlaceholder ?? `Type ${confirmPhrase} to confirm`
                }
                onChange={(e) => setConfirmValue(e.target.value)}
                spellCheck={false}
                autoComplete="off"
                aria-label={`Type ${confirmPhrase} to confirm`}
              />
            ) : null}
            <div className="app-modal-actions">
              <button type="button" className="ghost" onClick={() => finishConfirm(false)}>
                Cancel
              </button>
              <button
                type="submit"
                className={current.danger ? "danger" : undefined}
                disabled={!canSubmitConfirm}
                autoFocus={!confirmPhrase}
              >
                {current.confirmLabel ?? "OK"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body,
  );
}
