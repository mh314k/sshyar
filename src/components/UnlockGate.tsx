import { useState } from "react";
import { api } from "../lib/api";
import type { VaultStatus } from "../types";
import { APP_VERSION } from "../lib/version";
import { AppTitleChrome } from "./AppTitleChrome";
import { BrandLogo } from "./BrandLogo";

interface Props {
  status: VaultStatus;
  onUnlocked: (s: VaultStatus) => void;
}

export function UnlockGate({ status, onUnlocked }: Props) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function unlock(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const s = await api.vaultUnlock(password);
      onUnlocked(s);
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="unlock-shell">
      <AppTitleChrome />
      <div className="unlock-gate">
        <div className="unlock-card">
          <div className="brand-title">
            <BrandLogo size={36} />
            <div className="brand-text">
              <h1>SSHyar</h1>
              <span className="brand-version">v{APP_VERSION}</span>
            </div>
          </div>
          <p className="muted">Vault is locked. Enter your master password to continue.</p>
          <form onSubmit={unlock}>
            <input
              type="password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Master password"
            />
            <button type="submit" disabled={busy || !password}>
              Unlock
            </button>
          </form>
          {error && <p className="error">{error}</p>}
          <p className="muted">
            {status.profileCount} profile{status.profileCount === 1 ? "" : "s"} in vault
          </p>
        </div>
      </div>
    </div>
  );
}
