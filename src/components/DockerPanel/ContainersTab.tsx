import { useCallback, useEffect, useMemo, useState } from "react";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import StopIcon from "@mui/icons-material/Stop";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import RefreshIcon from "@mui/icons-material/Refresh";
import SubjectIcon from "@mui/icons-material/Subject";
import { api } from "../../lib/api";
import { appConfirm } from "../../lib/dialogs";
import { toastError } from "../../lib/toast";
import {
  DOCKER_STANDALONE_GROUP,
  type DockerContainer,
  type DockerContainerAction,
} from "../../types";
import { useDockerJob } from "../dockerJob/DockerJobContext";
import { IconButton, iconProps, iconSizeSm } from "../IconButton";
import { DockerFilter } from "./DockerFilter";

interface Props {
  profileId: string;
  dockerInstalled: boolean | null;
  onOpenLogs?: (container: DockerContainer) => void;
}

type StateFilter = "all" | "running" | "stopped";

function isRunning(state: string, status: string) {
  if (state === "running") return true;
  if (!state && status) return /^up\b/i.test(status);
  return false;
}

function groupLabel(key: string) {
  return key === DOCKER_STANDALONE_GROUP ? "Standalone" : key;
}

function matchesQuery(c: DockerContainer, q: string) {
  if (!q) return true;
  const hay = [
    c.name,
    c.image,
    c.status,
    c.state,
    c.ports,
    c.id,
    c.composeProject ?? "",
    c.composeService ?? "",
    c.groupKey,
  ]
    .join(" ")
    .toLowerCase();
  return hay.includes(q);
}

export function ContainersTab({ profileId, dockerInstalled, onOpenLogs }: Props) {
  const { runJob, job } = useDockerJob();
  const [items, setItems] = useState<DockerContainer[]>([]);
  const [busy, setBusy] = useState(false);
  const [acting, setActing] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const [query, setQuery] = useState("");
  const [stateFilter, setStateFilter] = useState<StateFilter>("all");
  const jobRunning = job?.status === "running";

  const refresh = useCallback(async () => {
    if (dockerInstalled === false) {
      setItems([]);
      setError("");
      return;
    }
    setBusy(true);
    setError("");
    try {
      setItems(await api.dockerListContainers(profileId));
    } catch (e) {
      setItems([]);
      setError(String(e));
      toastError(e, "Docker containers");
    } finally {
      setBusy(false);
    }
  }, [profileId, dockerInstalled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((c) => {
      if (stateFilter === "running" && !isRunning(c.state, c.status)) return false;
      if (stateFilter === "stopped" && isRunning(c.state, c.status)) return false;
      return matchesQuery(c, q);
    });
  }, [items, query, stateFilter]);

  const groups = useMemo(() => {
    const map = new Map<string, DockerContainer[]>();
    for (const c of filtered) {
      const key = c.groupKey || DOCKER_STANDALONE_GROUP;
      const list = map.get(key) ?? [];
      list.push(c);
      map.set(key, list);
    }
    const keys = [...map.keys()].sort((a, b) => {
      if (a === DOCKER_STANDALONE_GROUP) return 1;
      if (b === DOCKER_STANDALONE_GROUP) return -1;
      return a.localeCompare(b);
    });
    return keys.map((key) => ({ key, label: groupLabel(key), items: map.get(key)! }));
  }, [filtered]);

  async function runAction(c: DockerContainer, action: DockerContainerAction) {
    if (action === "remove") {
      const ok = await appConfirm({
        title: "Remove container",
        message: `Remove container “${c.name}”? This force-removes it (docker rm -f).`,
        confirmLabel: "Remove",
      });
      if (!ok) return;
    }
    const title =
      action === "remove"
        ? "Remove container"
        : `${action.charAt(0).toUpperCase()}${action.slice(1)} container`;
    setActing(c.id);
    try {
      await runJob(
        {
          title,
          detail: c.name,
          runningMessage: `${title} · ${c.name}`,
          successMessage:
            action === "remove" ? `Removed ${c.name}` : `${action} ${c.name}`,
        },
        (_jobId) => api.dockerContainerAction(profileId, c.id, action),
      );
      await refresh();
    } catch {
      /* toast + bar handled by runJob */
    } finally {
      setActing(null);
    }
  }

  function toggleGroup(key: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  if (dockerInstalled === false) {
    return (
      <p className="muted docker-empty">Docker is not installed on this server.</p>
    );
  }

  return (
    <div className="docker-tab-body">
      <div className="docker-toolbar">
        <span className="docker-toolbar-label">
          Containers
          {items.length
            ? ` (${filtered.length}${filtered.length !== items.length ? `/${items.length}` : ""})`
            : ""}
        </span>
        <IconButton
          variant="icon"
          title="Refresh"
          disabled={busy || !!acting || jobRunning}
          onClick={() => void refresh()}
          icon={<RefreshIcon {...iconProps(iconSizeSm)} />}
        />
      </div>

      <DockerFilter
        value={query}
        onChange={setQuery}
        placeholder="Filter name, image, compose…"
      />
      <div className="docker-state-filters" role="group" aria-label="State filter">
        {(
          [
            ["all", "All"],
            ["running", "Running"],
            ["stopped", "Stopped"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`docker-state-chip ${stateFilter === id ? "is-active" : ""}`}
            aria-pressed={stateFilter === id}
            onClick={() => setStateFilter(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {busy && !items.length ? <p className="muted docker-empty">Loading…</p> : null}
      {error ? <p className="error docker-empty">{error}</p> : null}
      {!busy && !error && !items.length ? (
        <p className="muted docker-empty">No containers.</p>
      ) : null}
      {!busy && !error && items.length > 0 && filtered.length === 0 ? (
        <p className="muted docker-empty">No containers match this filter.</p>
      ) : null}

      <div className="docker-groups">
        {groups.map((g) => {
          const open = !collapsed.has(g.key);
          return (
            <section key={g.key} className="docker-group">
              <button
                type="button"
                className="docker-group-head"
                onClick={() => toggleGroup(g.key)}
              >
                <span className="docker-group-title">
                  {g.key === DOCKER_STANDALONE_GROUP ? (
                    g.label
                  ) : (
                    <>
                      Compose · <strong>{g.label}</strong>
                    </>
                  )}
                </span>
                <span className="docker-group-count">{g.items.length}</span>
                {open ? (
                  <ExpandLessIcon {...iconProps(16)} />
                ) : (
                  <ExpandMoreIcon {...iconProps(16)} />
                )}
              </button>
              {open ? (
                <ul className="docker-list">
                  {g.items.map((c) => {
                    const running = isRunning(c.state, c.status);
                    const rowBusy = acting === c.id || busy || jobRunning;
                    return (
                      <li key={c.id} className="docker-row">
                        <div className="docker-row-main">
                          <div className="docker-row-title">
                            <span className="docker-row-name" title={c.name}>
                              {c.name}
                            </span>
                            <span
                              className={`docker-state-badge ${running ? "is-running" : "is-stopped"}`}
                            >
                              {c.state || c.status || "—"}
                            </span>
                          </div>
                          <div className="docker-row-meta muted">
                            {c.composeService ? (
                              <span title="Compose service">{c.composeService}</span>
                            ) : null}
                            <span title={c.image}>{c.image}</span>
                            {c.ports ? <span title={c.ports}>{c.ports}</span> : null}
                          </div>
                        </div>
                        <div className="docker-row-actions">
                          <IconButton
                            variant="icon"
                            title="Logs"
                            disabled={rowBusy}
                            onClick={() => onOpenLogs?.(c)}
                            icon={<SubjectIcon {...iconProps(iconSizeSm)} />}
                          />
                          <IconButton
                            variant="icon"
                            title="Start"
                            disabled={rowBusy || running}
                            onClick={() => void runAction(c, "start")}
                            icon={<PlayArrowIcon {...iconProps(iconSizeSm)} />}
                          />
                          <IconButton
                            variant="icon"
                            title="Stop"
                            disabled={rowBusy || !running}
                            onClick={() => void runAction(c, "stop")}
                            icon={<StopIcon {...iconProps(iconSizeSm)} />}
                          />
                          <IconButton
                            variant="icon"
                            title="Restart"
                            disabled={rowBusy || !running}
                            onClick={() => void runAction(c, "restart")}
                            icon={<RestartAltIcon {...iconProps(iconSizeSm)} />}
                          />
                          <IconButton
                            variant="icon"
                            title="Remove"
                            disabled={rowBusy}
                            onClick={() => void runAction(c, "remove")}
                            icon={<DeleteOutlinedIcon {...iconProps(iconSizeSm)} />}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </section>
          );
        })}
      </div>
    </div>
  );
}
