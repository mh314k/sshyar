import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import CloseIcon from "@mui/icons-material/Close";
import PauseIcon from "@mui/icons-material/Pause";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import DeleteSweepIcon from "@mui/icons-material/DeleteSweep";
import RefreshIcon from "@mui/icons-material/Refresh";
import VerticalAlignBottomIcon from "@mui/icons-material/VerticalAlignBottom";
import { listen } from "@tauri-apps/api/event";
import { api } from "../lib/api";
import { toastError } from "../lib/toast";
import type { DockerLogEvent, DockerLogsSource } from "../types";
import { IconButton, iconProps, iconSize } from "./IconButton";

const TAIL_OPTIONS = [100, 200, 500, 1000] as const;
const MAX_CHARS = 800_000;

interface Props {
  profileId: string;
  source: DockerLogsSource;
  /** Short label under the title (container name or compose file). */
  subtitle: string;
  onClose: () => void;
}

function sourceKey(source: DockerLogsSource): string {
  if (source.kind === "container") return `c:${source.containerId}`;
  return `compose:${source.workdir}/${source.fileName}`;
}

export function DockerLogsModal({ profileId, source, subtitle, onClose }: Props) {
  const [tail, setTail] = useState<(typeof TAIL_OPTIONS)[number]>(200);
  const [text, setText] = useState("");
  const [streamId, setStreamId] = useState<string | null>(null);
  const [following, setFollowing] = useState(true);
  const [status, setStatus] = useState<"connecting" | "live" | "stopped" | "error">(
    "connecting",
  );
  const [error, setError] = useState("");
  const [stickBottom, setStickBottom] = useState(true);

  const preRef = useRef<HTMLPreElement>(null);
  const streamIdRef = useRef<string | null>(null);
  const stickRef = useRef(true);

  useEffect(() => {
    stickRef.current = stickBottom;
  }, [stickBottom]);

  const stopStream = useCallback(async () => {
    const id = streamIdRef.current;
    streamIdRef.current = null;
    setStreamId(null);
    if (id) {
      await api.dockerLogsStop(id).catch(() => undefined);
    }
  }, []);

  const startStream = useCallback(
    async (tailLines: number) => {
      await stopStream();
      setText("");
      setError("");
      setStatus("connecting");
      setFollowing(true);
      try {
        const id =
          source.kind === "container"
            ? await api.dockerLogsStart(profileId, source.containerId, tailLines)
            : await api.dockerComposeLogsStart(
                profileId,
                source.workdir,
                source.fileName,
                tailLines,
              );
        streamIdRef.current = id;
        setStreamId(id);
        setStatus("live");
      } catch (e) {
        setStatus("error");
        setError(String(e));
        toastError(e, "Docker logs");
      }
    },
    [profileId, source, stopStream],
  );

  const key = sourceKey(source);

  useEffect(() => {
    void startStream(tail);
    return () => {
      void stopStream();
    };
    // Only on mount / source change — tail changes via Restart
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId, key]);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    void listen<DockerLogEvent>("docker-logs", (ev) => {
      const payload = ev.payload;
      if (!streamIdRef.current || payload.streamId !== streamIdRef.current) return;
      if (payload.kind === "data") {
        setText((prev) => {
          let next = prev + payload.text;
          if (next.length > MAX_CHARS) {
            next = next.slice(next.length - MAX_CHARS);
            const nl = next.indexOf("\n");
            if (nl > 0 && nl < 2000) next = next.slice(nl + 1);
          }
          return next;
        });
      } else if (payload.kind === "ended") {
        setStatus("stopped");
        streamIdRef.current = null;
        setStreamId(null);
      } else if (payload.kind === "error") {
        setStatus("error");
        setError(payload.text || "Log stream error");
        streamIdRef.current = null;
        setStreamId(null);
      }
    }).then((fn) => {
      unlisten = fn;
    });
    return () => {
      unlisten?.();
    };
  }, []);

  useEffect(() => {
    if (!stickRef.current) return;
    const el = preRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [text]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function onScroll() {
    const el = preRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
    setStickBottom(atBottom);
  }

  async function toggleFollow() {
    if (following && streamId) {
      await stopStream();
      setFollowing(false);
      setStatus("stopped");
    } else {
      await startStream(tail);
    }
  }

  const heading = source.kind === "compose" ? "Compose logs" : "Container logs";

  return createPortal(
    <div
      className="help-overlay docker-logs-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="help-modal docker-logs-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="docker-logs-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="help-header">
          <div className="help-header-text">
            <h2 id="docker-logs-title">{heading}</h2>
            <p
              className="muted"
              title={
                source.kind === "container"
                  ? source.containerId
                  : `${source.workdir}/${source.fileName}`
              }
            >
              {subtitle}
              {status === "live"
                ? " · live"
                : status === "connecting"
                  ? " · connecting…"
                  : status === "stopped"
                    ? " · stopped"
                    : " · error"}
            </p>
          </div>
          <button
            type="button"
            className="help-close"
            onClick={onClose}
            title="Close"
            aria-label="Close"
          >
            <CloseIcon {...iconProps(18)} />
          </button>
        </header>

        <div className="docker-logs-toolbar">
          <label className="docker-logs-tail">
            <span className="muted">Tail</span>
            <select
              value={tail}
              disabled={status === "connecting"}
              onChange={(e) => setTail(Number(e.target.value) as (typeof TAIL_OPTIONS)[number])}
            >
              {TAIL_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <IconButton
            variant="soft"
            title={following && streamId ? "Pause stream" : "Resume live"}
            label={following && streamId ? "Pause" : "Live"}
            disabled={status === "connecting"}
            onClick={() => void toggleFollow()}
            icon={
              following && streamId ? (
                <PauseIcon {...iconProps(iconSize)} />
              ) : (
                <PlayArrowIcon {...iconProps(iconSize)} />
              )
            }
          />
          <IconButton
            variant="soft"
            title="Restart stream with selected tail"
            label="Restart"
            disabled={status === "connecting"}
            onClick={() => void startStream(tail)}
            icon={<RefreshIcon {...iconProps(iconSize)} />}
          />
          <IconButton
            variant="soft"
            title="Clear buffer"
            onClick={() => setText("")}
            icon={<DeleteSweepIcon {...iconProps(iconSize)} />}
          />
          <IconButton
            variant="soft"
            title="Scroll to bottom"
            onClick={() => {
              setStickBottom(true);
              const el = preRef.current;
              if (el) el.scrollTop = el.scrollHeight;
            }}
            icon={<VerticalAlignBottomIcon {...iconProps(iconSize)} />}
          />
        </div>

        {error ? <p className="error docker-logs-error">{error}</p> : null}

        <pre
          ref={preRef}
          className="docker-logs-body"
          onScroll={onScroll}
          tabIndex={0}
        >
          {text || (status === "connecting" ? "Connecting…" : "")}
        </pre>
      </div>
    </div>,
    document.body,
  );
}
