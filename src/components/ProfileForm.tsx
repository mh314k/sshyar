import { useEffect, useState } from "react";
import type { AuthMethod, PortForward, Profile, ProfileInput } from "../types";

interface Props {
  initial?: Profile | null;
  onSave: (input: ProfileInput) => Promise<void>;
  onCancel: () => void;
}

const SHELL_PRESETS = ["bash", "zsh", "fish", "sh", "dash"] as const;

const FORWARD_PRESETS: { label: string; forward: PortForward }[] = [
  { label: "HTTP", forward: { localPort: 8080, remoteHost: "127.0.0.1", remotePort: 80 } },
  { label: "HTTPS", forward: { localPort: 8443, remoteHost: "127.0.0.1", remotePort: 443 } },
  { label: "Postgres", forward: { localPort: 5432, remoteHost: "127.0.0.1", remotePort: 5432 } },
  { label: "MySQL", forward: { localPort: 3306, remoteHost: "127.0.0.1", remotePort: 3306 } },
  { label: "Redis", forward: { localPort: 6379, remoteHost: "127.0.0.1", remotePort: 6379 } },
  { label: "Mongo", forward: { localPort: 27017, remoteHost: "127.0.0.1", remotePort: 27017 } },
];

const empty: ProfileInput = {
  name: "",
  host: "",
  port: 22,
  username: "root",
  authMethod: "Password",
  password: "",
  privateKeyPath: "",
  group: "Default",
  tags: [],
  postConnectCommand: "",
  remoteShell: "bash",
  keepaliveInterval: 30,
  keepaliveCountMax: 3,
  notes: "",
  dockerManagement: false,
  nginxManagement: false,
  systemdManagement: false,
  cronManagement: false,
  monitorManagement: false,
  portForwards: [],
};

export function ProfileForm({ initial, onSave, onCancel }: Props) {
  const [form, setForm] = useState<ProfileInput>(empty);
  const [tagsText, setTagsText] = useState("");
  const [shellPreset, setShellPreset] = useState<string>("bash");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (initial) {
      const shell = initial.remoteShell ?? "bash";
      const preset = !shell
        ? "default"
        : (SHELL_PRESETS as readonly string[]).includes(shell)
          ? shell
          : "custom";
      setForm({
        name: initial.name,
        host: initial.host,
        port: initial.port,
        username: initial.username,
        authMethod: initial.authMethod,
        password: initial.password ?? "",
        privateKeyPath: initial.privateKeyPath ?? "",
        group: initial.group || "Default",
        tags: initial.tags,
        postConnectCommand: initial.postConnectCommand,
        remoteShell: shell,
        keepaliveInterval: initial.keepaliveInterval,
        keepaliveCountMax: initial.keepaliveCountMax,
        notes: initial.notes,
        dockerManagement: initial.dockerManagement ?? false,
        nginxManagement: initial.nginxManagement ?? false,
        systemdManagement: initial.systemdManagement ?? false,
        cronManagement: initial.cronManagement ?? false,
        monitorManagement: initial.monitorManagement ?? false,
        portForwards: (initial.portForwards ?? []).map((f) => ({
          localPort: f.localPort,
          remoteHost: f.remoteHost || "127.0.0.1",
          remotePort: f.remotePort,
        })),
      });
      setShellPreset(preset);
      setTagsText(initial.tags.join(", "));
    } else {
      setForm(empty);
      setShellPreset("bash");
      setTagsText("");
    }
  }, [initial]);

  function onShellPresetChange(value: string) {
    setShellPreset(value);
    if (value === "default") set("remoteShell", "");
    else if (value === "custom") {
      if ((SHELL_PRESETS as readonly string[]).includes(form.remoteShell) || !form.remoteShell) {
        set("remoteShell", "/bin/bash");
      }
    } else set("remoteShell", value);
  }

  function set<K extends keyof ProfileInput>(key: K, value: ProfileInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function updateForward(index: number, patch: Partial<PortForward>) {
    setForm((f) => ({
      ...f,
      portForwards: f.portForwards.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    }));
  }

  function addForward(forward?: PortForward) {
    const next = forward ?? { localPort: 8080, remoteHost: "127.0.0.1", remotePort: 80 };
    setForm((f) => {
      if (f.portForwards.some((row) => row.localPort === next.localPort)) {
        return f;
      }
      return { ...f, portForwards: [...f.portForwards, next] };
    });
  }

  function removeForward(index: number) {
    setForm((f) => ({
      ...f,
      portForwards: f.portForwards.filter((_, i) => i !== index),
    }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await onSave({
        ...form,
        tags: tagsText
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        password: form.password || null,
        privateKeyPath: form.privateKeyPath || null,
        portForwards: form.portForwards.filter(
          (f) => f.localPort > 0 && f.remotePort > 0 && f.remoteHost.trim(),
        ),
      });
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="profile-form" onSubmit={submit}>
      <h3>{initial ? "Edit profile" : "New profile"}</h3>
      <label>
        Name
        <input required value={form.name} onChange={(e) => set("name", e.target.value)} />
      </label>
      <div className="row">
        <label>
          Host / IP
          <input required value={form.host} onChange={(e) => set("host", e.target.value)} />
        </label>
        <label className="narrow">
          Port
          <input
            type="number"
            required
            value={form.port}
            onChange={(e) => set("port", Number(e.target.value))}
          />
        </label>
      </div>
      <label>
        Username
        <input required value={form.username} onChange={(e) => set("username", e.target.value)} />
      </label>
      <label>
        Auth
        <select
          value={form.authMethod}
          onChange={(e) => set("authMethod", e.target.value as AuthMethod)}
        >
          <option value="Password">Password</option>
          <option value="Key">Private key</option>
        </select>
      </label>
      {form.authMethod === "Password" ? (
        <label>
          Password
          <input
            type="password"
            value={form.password ?? ""}
            onChange={(e) => set("password", e.target.value)}
          />
        </label>
      ) : (
        <label>
          Private key path
          <input
            value={form.privateKeyPath ?? ""}
            onChange={(e) => set("privateKeyPath", e.target.value)}
            placeholder="C:\Users\...\.ssh\id_ed25519"
          />
        </label>
      )}
      <div className="row">
        <label>
          Group
          <input value={form.group} onChange={(e) => set("group", e.target.value)} />
        </label>
        <label>
          Tags (comma)
          <input value={tagsText} onChange={(e) => setTagsText(e.target.value)} />
        </label>
      </div>
      <label>
        Post-connect command
        <input
          value={form.postConnectCommand}
          onChange={(e) => set("postConnectCommand", e.target.value)}
          placeholder="cd /var/www && sudo -i"
        />
      </label>
      <label>
        Remote shell
        <select value={shellPreset} onChange={(e) => onShellPresetChange(e.target.value)}>
          <option value="default">Server default</option>
          <option value="bash">bash</option>
          <option value="zsh">zsh</option>
          <option value="fish">fish</option>
          <option value="sh">sh</option>
          <option value="dash">dash</option>
          <option value="custom">Custom path…</option>
        </select>
      </label>
      {shellPreset === "custom" ? (
        <label>
          Shell path / command
          <input
            value={form.remoteShell}
            onChange={(e) => set("remoteShell", e.target.value)}
            placeholder="/usr/bin/zsh"
            required
          />
        </label>
      ) : null}
      <div className="row">
        <label>
          Keepalive interval (s)
          <input
            type="number"
            value={form.keepaliveInterval}
            onChange={(e) => set("keepaliveInterval", Number(e.target.value))}
          />
        </label>
        <label>
          Keepalive count max
          <input
            type="number"
            value={form.keepaliveCountMax}
            onChange={(e) => set("keepaliveCountMax", Number(e.target.value))}
          />
        </label>
      </div>
      <label>
        Notes
        <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} />
      </label>
      <div className="profile-plugin-flags">
        <span className="profile-plugin-flags-label">Session plugins</span>
        <label className="profile-check">
          <input
            type="checkbox"
            checked={form.monitorManagement}
            onChange={(e) => set("monitorManagement", e.target.checked)}
          />
          <span>Monitor</span>
        </label>
        <label className="profile-check">
          <input
            type="checkbox"
            checked={form.systemdManagement}
            onChange={(e) => set("systemdManagement", e.target.checked)}
          />
          <span>systemd</span>
        </label>
        <label className="profile-check">
          <input
            type="checkbox"
            checked={form.dockerManagement}
            onChange={(e) => set("dockerManagement", e.target.checked)}
          />
          <span>Docker</span>
        </label>
        <label className="profile-check">
          <input
            type="checkbox"
            checked={form.nginxManagement}
            onChange={(e) => set("nginxManagement", e.target.checked)}
          />
          <span>Nginx</span>
        </label>
        <label className="profile-check">
          <input
            type="checkbox"
            checked={form.cronManagement}
            onChange={(e) => set("cronManagement", e.target.checked)}
          />
          <span>cron</span>
        </label>
      </div>
      <div className="profile-forwards">
        <div className="profile-forwards-head">
          <span>Local port forwards</span>
          <span className="profile-forwards-hint">ssh -L local:host:remote</span>
        </div>
        <div className="profile-forward-presets">
          {FORWARD_PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              className="ghost"
              onClick={() => addForward(p.forward)}
              title={`${p.forward.localPort} → ${p.forward.remoteHost}:${p.forward.remotePort}`}
            >
              {p.label}
            </button>
          ))}
        </div>
        {form.portForwards.length === 0 ? (
          <p className="profile-forwards-empty">No forwards — add a preset or a custom row.</p>
        ) : (
          <ul className="profile-forward-list">
            {form.portForwards.map((f, i) => (
              <li key={`${f.localPort}-${i}`} className="profile-forward-row">
                <div className="profile-forward-ports">
                  <label>
                    Local port
                    <input
                      type="number"
                      min={1}
                      max={65535}
                      value={f.localPort || ""}
                      onChange={(e) => updateForward(i, { localPort: Number(e.target.value) || 0 })}
                    />
                  </label>
                  <span className="profile-forward-arrow" aria-hidden>
                    →
                  </span>
                  <label>
                    Remote port
                    <input
                      type="number"
                      min={1}
                      max={65535}
                      value={f.remotePort || ""}
                      onChange={(e) => updateForward(i, { remotePort: Number(e.target.value) || 0 })}
                    />
                  </label>
                </div>
                <label className="profile-forward-host">
                  Remote host
                  <input
                    value={f.remoteHost}
                    onChange={(e) => updateForward(i, { remoteHost: e.target.value })}
                    onBlur={(e) => {
                      if (!e.target.value.trim()) {
                        updateForward(i, { remoteHost: "127.0.0.1" });
                      }
                    }}
                    placeholder="127.0.0.1"
                    spellCheck={false}
                  />
                </label>
                <button
                  type="button"
                  className="ghost profile-forward-remove"
                  onClick={() => removeForward(i)}
                  aria-label="Remove forward"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
        <button type="button" className="ghost" onClick={() => addForward()}>
          + Add forward
        </button>
      </div>
      {error && <p className="error">{error}</p>}
      <div className="form-actions">
        <button type="button" className="ghost" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" disabled={busy}>
          Save
        </button>
      </div>
    </form>
  );
}
