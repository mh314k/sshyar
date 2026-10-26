import { useCallback, useEffect, useMemo, useState } from "react";
import CloseIcon from "@mui/icons-material/Close";
import RefreshIcon from "@mui/icons-material/Refresh";
import { api } from "../lib/api";
import { toastError } from "../lib/toast";
import type { CronStatus, CronSystemFile, CronUserTable } from "../types";
import { DockerFilter } from "./DockerPanel/DockerFilter";
import { IconButton, iconProps, iconSizeSm } from "./IconButton";

interface Props {
  profileId: string | null;
  enabled: boolean;
}

type CronTab = "user" | "system";

function cronDirLabel(path: string): string {
  const parts = path.split("/").filter(Boolean);
  const dir = parts[parts.length - 2] ?? "";
  return dir.replace(/^cron\./, "") || "cron";
}

export function CronPanel({ profileId, enabled }: Props) {
  const [status, setStatus] = useState<CronStatus | null>(null);
  const [userTable, setUserTable] = useState<CronUserTable | null>(null);
  const [files, setFiles] = useState<CronSystemFile[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<CronTab>("user");
  const [query, setQuery] = useState("");
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [fileOut, setFileOut] = useState("");
  const [reading, setReading] = useState(false);

  const refresh = useCallback(async () => {
    if (!profileId || !enabled) {
      setStatus(null);
      setUserTable(null);
      setFiles([]);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const [st, table, list] = await Promise.all([
        api.cronProbe(profileId),
        api.cronUserList(profileId),
        api.cronSystemList(profileId),
      ]);
      setStatus(st);
      setUserTable(table);
      setFiles(list);
    } catch (e) {
      setStatus(null);
      setUserTable(null);
      setFiles([]);
      setError(String(e));
      toastError(e, "cron");
    } finally {
      setBusy(false);
    }
  }, [profileId, enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    setSelectedPath(null);
    setFileOut("");
    setQuery("");
  }, [profileId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return files;
    return files.filter((f) =>
      `${f.name} ${f.path} ${cronDirLabel(f.path)}`.toLowerCase().includes(q),
    );
  }, [files, query]);

  const grouped = useMemo(() => {
    const map = new Map<string, CronSystemFile[]>();
    for (const f of filtered) {
      const key = cronDirLabel(f.path);
      const list = map.get(key);
      if (list) list.push(f);
      else map.set(key, [f]);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  async function openFile(path: string) {
    if (!profileId) return;
    setSelectedPath(path);
    setReading(true);
    try {
      const r = await api.cronReadSystemFile(profileId, path);
      setFileOut(r.output);
    } catch (e) {
      setFileOut(String(e));
      toastError(e, "cron");
    } finally {
      setReading(false);
    }
  }

  function closePreview() {
    setSelectedPath(null);
    setFileOut("");
  }

  if (!enabled) {
    return (
      <p className="muted docker-empty">Enable cron on this profile to use the cron plugin.</p>
    );
  }
  if (!profileId) {
    return <p className="muted docker-empty">Connect a profile session to manage cron.</p>;
  }

  const selectedName = selectedPath ? selectedPath.split("/").pop() : null;

  return (
    <div className="docker-panel cron-panel">
      <div className="docker-toolbar">
        <div className="cron-toolbar-left">
          <span className="docker-toolbar-label">cron</span>
          {status ? (
            <span
              className={`docker-status-badge ${status.hasCrontab ? "is-ok" : "is-missing"}`}
              title={status.detail || undefined}
            >
              {status.hasCrontab ? "crontab ready" : "no crontab"}
            </span>
          ) : null}
        </div>
        <IconButton
          variant="icon"
          title="Refresh"
          disabled={busy}
          onClick={() => void refresh()}
          icon={<RefreshIcon {...iconProps(iconSizeSm)} />}
        />
      </div>

      <div className="docker-subtabs" role="tablist" aria-label="Cron views">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "user"}
          className={`docker-subtab ${tab === "user" ? "is-active" : ""}`}
          onClick={() => setTab("user")}
        >
          User
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "system"}
          className={`docker-subtab ${tab === "system" ? "is-active" : ""}`}
          onClick={() => setTab("system")}
        >
          System{files.length ? ` · ${files.length}` : ""}
        </button>
      </div>

      {error ? <p className="error docker-empty">{error}</p> : null}

      <div className="docker-tab-body cron-body">
        {busy && !status && !userTable ? (
          <p className="muted docker-empty">Loading cron…</p>
        ) : null}

        {tab === "user" ? (
          <div className="cron-user">
            {userTable?.empty ? (
              <div className="cron-empty">
                <p className="cron-empty-title">No user crontab</p>
                <p className="muted cron-empty-hint">
                  This SSH user has no personal crontab entries yet.
                </p>
              </div>
            ) : userTable ? (
              <pre className="cron-code" tabIndex={0}>
                {userTable.raw}
              </pre>
            ) : null}
          </div>
        ) : null}

        {tab === "system" ? (
          <div className="cron-system">
            <DockerFilter
              value={query}
              onChange={setQuery}
              placeholder="Filter system cron files…"
            />
            {files.length === 0 && !busy ? (
              <div className="cron-empty">
                <p className="cron-empty-title">No system cron files</p>
                <p className="muted cron-empty-hint">Nothing under /etc/cron.*</p>
              </div>
            ) : (
              <ul className="cron-file-list">
                {grouped.map(([dir, items]) => (
                  <li key={dir} className="cron-group">
                    <div className="cron-group-label">{dir}</div>
                    <ul className="cron-group-items">
                      {items.map((f) => {
                        const active = selectedPath === f.path;
                        return (
                          <li key={f.path}>
                            <button
                              type="button"
                              className={`cron-file-btn ${active ? "is-active" : ""}`}
                              title={f.path}
                              disabled={busy || reading}
                              onClick={() => void openFile(f.path)}
                            >
                              <span className="cron-file-name">{f.name}</span>
                              <span className="muted cron-file-path">{f.path}</span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </li>
                ))}
              </ul>
            )}

            {selectedPath ? (
              <div className="cron-preview">
                <div className="cron-preview-head">
                  <div className="cron-preview-title">
                    <span className="cron-preview-name">{selectedName}</span>
                    <span className="muted cron-preview-path">{selectedPath}</span>
                  </div>
                  <IconButton
                    variant="icon"
                    title="Close preview"
                    onClick={closePreview}
                    icon={<CloseIcon {...iconProps(iconSizeSm)} />}
                  />
                </div>
                {reading && !fileOut ? (
                  <p className="muted cron-preview-loading">Reading…</p>
                ) : (
                  <pre className="cron-code cron-preview-code" tabIndex={0}>
                    {fileOut || "—"}
                  </pre>
                )}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
