import { useEffect, useState } from "react";
import type { AuthMethod, Profile, ProfileInput } from "../types";

interface Props {
  initial?: Profile | null;
  onSave: (input: ProfileInput) => Promise<void>;
  onCancel: () => void;
}

const SHELL_PRESETS = ["bash", "zsh", "fish", "sh", "dash"] as const;

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
