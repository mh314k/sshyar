import { useCallback, useEffect, useState } from "react";
import RefreshIcon from "@mui/icons-material/Refresh";
import FactCheckOutlinedIcon from "@mui/icons-material/FactCheckOutlined";
import ReplayIcon from "@mui/icons-material/Replay";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import { api } from "../../../lib/api";
import { runInTerminal } from "../../../lib/runInTerminal";
import { readStoredTheme } from "../../../lib/theme";
import { toastError, toastSuccess } from "../../../lib/toast";
import type { NginxSite, NginxStatus } from "../../../types";
import { IconButton, iconProps, iconSizeSm } from "../../../components/IconButton";
import { RemoteFileEditor, type FileEditorMode } from "../../../components/RemoteFileEditor";

interface Props {
  profileId: string | null;
  ptyId: string | null;
  enabled: boolean;
}

export function NginxPanel({ profileId, ptyId, enabled }: Props) {
  const [status, setStatus] = useState<NginxStatus | null>(null);
  const [sites, setSites] = useState<NginxSite[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [output, setOutput] = useState("");
  const [sftpId, setSftpId] = useState<string | null>(null);
  const [editor, setEditor] = useState<{ path: string; mode: FileEditorMode } | null>(null);

  const refresh = useCallback(async () => {
    if (!profileId || !enabled) {
      setStatus(null);
      setSites([]);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const [st, list] = await Promise.all([
        api.nginxProbe(profileId),
        api.nginxListSites(profileId).catch(() => [] as NginxSite[]),
      ]);
      setStatus(st);
      setSites(list);
    } catch (e) {
      setStatus(null);
      setSites([]);
      setError(String(e));
      toastError(e, "Nginx");
    } finally {
      setBusy(false);
    }
  }, [profileId, enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Close SFTP on profile change / unmount (avoid StrictMode closing the live id).
  useEffect(() => {
    setEditor(null);
    const prev = sftpId;
    if (prev) {
      setSftpId(null);
      void api.sftpClose(prev).catch(() => undefined);
    }
    return () => {
      setEditor(null);
      setSftpId((cur) => {
        if (cur) void api.sftpClose(cur).catch(() => undefined);
        return null;
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only reset when profile/enabled changes
  }, [profileId, enabled]);

  async function ensureSftp(): Promise<string> {
    if (!profileId) throw new Error("No profile");
    if (sftpId) return sftpId;
    const { sftpId: id } = await api.sftpOpen(profileId);
    setSftpId(id);
    return id;
  }

  async function openConfig(site: NginxSite, mode: FileEditorMode) {
    setBusy(true);
    try {
      await ensureSftp();
      setEditor({ path: site.path, mode });
    } catch (e) {
      toastError(e, "Open nginx config");
    } finally {
      setBusy(false);
    }
  }

  async function closeEditor() {
    setEditor(null);
  }

  async function runTest() {
    const ok = await runInTerminal(ptyId, "sudo nginx -t", "Nginx test");
    if (ok) {
      setOutput(
        "Test sent to terminal (sudo nginx -t). Enter your sudo password there if prompted.",
      );
    }
  }

  async function runReload() {
    const ok = await runInTerminal(
      ptyId,
      "sudo systemctl reload nginx || sudo nginx -s reload",
      "Nginx reload",
    );
    if (ok) {
      setOutput(
        "Reload sent to terminal. Enter your sudo password there if prompted, then refresh.",
      );
    }
  }

  if (!enabled) {
    return (
      <p className="muted docker-empty">
        Enable Nginx on this profile to use the Nginx plugin.
      </p>
    );
  }
  if (!profileId) {
    return (
      <p className="muted docker-empty">Connect a profile session to manage Nginx.</p>
    );
  }

  const termOff = busy || !ptyId;
  const theme = readStoredTheme();

  return (
    <div className="docker-panel">
      <div className="docker-toolbar">
        <span className="docker-toolbar-label">Nginx</span>
        <IconButton
          variant="icon"
          title="Refresh"
          disabled={busy}
          onClick={() => void refresh()}
          icon={<RefreshIcon {...iconProps(iconSizeSm)} />}
        />
      </div>
      {error ? <p className="error docker-empty">{error}</p> : null}
      {busy && !status ? <p className="muted docker-empty">Checking nginx…</p> : null}
      {status ? (
        <div className="docker-status-card">
          <div className="docker-status-row">
            <span className="docker-status-key">Installed</span>
            <span className={`docker-status-badge ${status.installed ? "is-ok" : "is-missing"}`}>
              {status.installed ? "Yes" : "No"}
            </span>
          </div>
          <div className="docker-status-row">
            <span className="docker-status-key">Version</span>
            <span className="docker-status-value">{status.version || "—"}</span>
          </div>
          <div className="docker-status-row">
            <span className="docker-status-key">Active</span>
            <span className="docker-status-value">{status.active || "—"}</span>
          </div>
          {status.installed ? (
            <>
              <p className="muted docker-df-hint">
                Test and Reload run in your terminal so you can enter sudo. View/Edit open the
                config in the full-screen editor (needs SFTP read/write on that path).
              </p>
              <div className="docker-prune-actions">
                <IconButton
                  variant="soft"
                  label="Test in terminal"
                  title="sudo nginx -t (interactive)"
                  disabled={termOff}
                  onClick={() => void runTest()}
                  icon={<FactCheckOutlinedIcon {...iconProps(iconSizeSm)} />}
                />
                <IconButton
                  variant="soft"
                  label="Reload in terminal"
                  title="sudo systemctl reload nginx (interactive)"
                  disabled={termOff}
                  onClick={() => void runReload()}
                  icon={<ReplayIcon {...iconProps(iconSizeSm)} />}
                />
              </div>
            </>
          ) : null}
        </div>
      ) : null}
      {status?.installed ? (
        <div className="docker-status-card">
          <span className="docker-toolbar-label">Configs ({sites.length})</span>
          {sites.length === 0 ? (
            <p className="muted docker-df-hint">
              No files in nginx.conf, sites-enabled, sites-available, or conf.d.
            </p>
          ) : (
            <ul className="host-svc-list">
              {sites.map((s) => (
                <li key={s.path} className="host-svc-row nginx-config-row" title={s.path}>
                  <div className="nginx-config-main">
                    <span className="host-svc-name">{s.name}</span>
                    <span className="muted host-svc-meta">{s.path}</span>
                  </div>
                  <div className="nginx-config-actions">
                    <IconButton
                      variant="icon"
                      title="View config"
                      disabled={busy}
                      onClick={() => void openConfig(s, "view")}
                      icon={<VisibilityOutlinedIcon {...iconProps(iconSizeSm)} />}
                    />
                    <IconButton
                      variant="icon"
                      title="Edit config"
                      disabled={busy}
                      onClick={() => void openConfig(s, "edit")}
                      icon={<EditOutlinedIcon {...iconProps(iconSizeSm)} />}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
      {output ? (
        <pre className="docker-df-raw host-svc-output" tabIndex={0}>
          {output}
        </pre>
      ) : null}

      {editor && sftpId ? (
        <RemoteFileEditor
          sftpId={sftpId}
          path={editor.path}
          mode={editor.mode}
          theme={theme}
          onClose={() => void closeEditor()}
          onSaved={() => {
            toastSuccess("Config saved — run Test / Reload in terminal if needed");
          }}
        />
      ) : null}
    </div>
  );
}
