import { useCallback, useEffect, useMemo, useState } from "react";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import StopIcon from "@mui/icons-material/Stop";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import RefreshIcon from "@mui/icons-material/Refresh";
import { api } from "../lib/api";
import { runInTerminal } from "../lib/runInTerminal";
import { toastError } from "../lib/toast";
import type { SystemdUnit, SystemdUnitAction } from "../types";
import { useDockerJob } from "./dockerJob/DockerJobContext";
import { IconButton, iconProps, iconSizeSm } from "./IconButton";
import { DockerFilter } from "./DockerPanel/DockerFilter";

interface Props {
  profileId: string | null;
  ptyId: string | null;
  enabled: boolean;
}

const UNIT_RE = /^[A-Za-z0-9_.:@-]+$/;

export function SystemdPanel({ profileId, ptyId, enabled }: Props) {
  const { runJob, job } = useDockerJob();
  const [units, setUnits] = useState<SystemdUnit[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [output, setOutput] = useState("");
  const jobBusy = job?.status === "running";

  const refresh = useCallback(async () => {
    if (!profileId || !enabled) {
      setUnits([]);
      return;
    }
    setBusy(true);
    setError("");
    try {
      setUnits(await api.systemdListUnits(profileId));
    } catch (e) {
      setUnits([]);
      setError(String(e));
      toastError(e, "systemd");
    } finally {
      setBusy(false);
    }
  }, [profileId, enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return units;
    return units.filter((u) =>
      [u.name, u.active, u.sub, u.description, u.load].join(" ").toLowerCase().includes(q),
    );
  }, [units, query]);

  async function act(unit: SystemdUnit, action: SystemdUnitAction) {
    if (!profileId) return;

    if (action === "status") {
      try {
        const r = await runJob(
          {
            title: "systemctl status",
            detail: unit.name,
            runningMessage: `status ${unit.name}…`,
            successMessage: `status ${unit.name}`,
          },
          (jobId) => api.systemdUnitAction(profileId, unit.name, action, jobId),
        );
        setOutput(r.output);
      } catch (e) {
        setOutput(String(e));
      }
      return;
    }

    if (!UNIT_RE.test(unit.name)) {
      toastError("Invalid unit name", "systemd");
      return;
    }

    const ok = await runInTerminal(
      ptyId,
      `sudo systemctl ${action} ${unit.name}`,
      `systemctl ${action}`,
    );
    if (ok) {
      setOutput(
        `${action} ${unit.name} sent to terminal. Enter sudo password there if prompted, then refresh.`,
      );
    }
  }

  if (!enabled) {
    return (
      <p className="muted docker-empty">
        Enable systemd on this profile to use the systemd plugin.
      </p>
    );
  }
  if (!profileId) {
    return (
      <p className="muted docker-empty">Connect a profile session to manage systemd.</p>
    );
  }

  const off = busy || jobBusy;
  const privOff = off || !ptyId;

  return (
    <div className="docker-panel">
      <div className="docker-toolbar">
        <span className="docker-toolbar-label">
          systemd
          {units.length
            ? ` (${filtered.length}${filtered.length !== units.length ? `/${units.length}` : ""})`
            : ""}
        </span>
        <IconButton
          variant="icon"
          title="Refresh"
          disabled={off}
          onClick={() => void refresh()}
          icon={<RefreshIcon {...iconProps(iconSizeSm)} />}
        />
      </div>
      <DockerFilter value={query} onChange={setQuery} placeholder="Filter units…" />
      <p className="muted docker-df-hint host-svc-hint">
        Status runs here. Start / Stop / Restart open in your terminal for interactive sudo.
      </p>
      {error ? <p className="error docker-empty">{error}</p> : null}
      {busy && !units.length ? <p className="muted docker-empty">Loading units…</p> : null}
      {!busy && !error && !units.length ? (
        <p className="muted docker-empty">No units returned (is systemd available?).</p>
      ) : null}
      <ul className="docker-list host-svc-units">
        {filtered.map((u) => {
          const running = u.active === "active";
          return (
            <li key={u.name} className="docker-row">
              <div className="docker-row-main">
                <div className="docker-row-title">
                  <span className="docker-row-name" title={u.name}>
                    {u.name}
                  </span>
                  <span
                    className={`docker-state-badge ${running ? "is-running" : "is-stopped"}`}
                  >
                    {u.active}/{u.sub}
                  </span>
                </div>
                <div className="docker-row-meta muted">
                  <span>{u.description || u.load}</span>
                </div>
              </div>
              <div className="docker-row-actions">
                <IconButton
                  variant="icon"
                  title="Status"
                  disabled={off}
                  onClick={() => void act(u, "status")}
                  icon={<InfoOutlinedIcon {...iconProps(iconSizeSm)} />}
                />
                <IconButton
                  variant="icon"
                  title="Start in terminal (sudo)"
                  disabled={privOff || running}
                  onClick={() => void act(u, "start")}
                  icon={<PlayArrowIcon {...iconProps(iconSizeSm)} />}
                />
                <IconButton
                  variant="icon"
                  title="Stop in terminal (sudo)"
                  disabled={privOff || !running}
                  onClick={() => void act(u, "stop")}
                  icon={<StopIcon {...iconProps(iconSizeSm)} />}
                />
                <IconButton
                  variant="icon"
                  title="Restart in terminal (sudo)"
                  disabled={privOff}
                  onClick={() => void act(u, "restart")}
                  icon={<RestartAltIcon {...iconProps(iconSizeSm)} />}
                />
              </div>
            </li>
          );
        })}
      </ul>
      {output ? (
        <pre className="docker-df-raw host-svc-output" tabIndex={0}>
          {output}
        </pre>
      ) : null}
    </div>
  );
}
