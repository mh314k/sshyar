import { useState } from "react";
import { api } from "../lib/api";
import type { VaultStatus } from "../types";

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
    <div className="unlock-gate">
      <div className="unlock-card">
        <h1>SSHyar</h1>
        <p>Vault is locked. Enter your master password.</p>
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
        <p className="hint">Profiles: {status.profileCount}</p>
      </div>
    </div>
  );
}
