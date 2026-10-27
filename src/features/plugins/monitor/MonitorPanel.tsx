import { useCallback, useEffect, useRef, useState } from "react";
import RefreshIcon from "@mui/icons-material/Refresh";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import SpeedIcon from "@mui/icons-material/Speed";
import { api } from "../../../lib/api";
import { toastError } from "../../../lib/toast";
import type { MonitorSnapshot } from "../../../types";
import { IconButton, iconProps, iconSizeSm } from "../../../components/IconButton";

interface Props {
  profileId: string | null;
  enabled: boolean;
}

type TickMs = 0 | 2000 | 5000 | 10000 | 30000;

type HistoryPoint = { t: number; cpu: number; mem: number };

const HISTORY_MAX = 60;

function formatBytes(n: number): string {
  if (!n || n < 0) return "0 B";
  if (n < 1024) return `${Math.round(n)} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  if (n < 1024 ** 4) return `${(n / 1024 ** 3).toFixed(2)} GB`;
  return `${(n / 1024 ** 4).toFixed(2)} TB`;
}

function formatUptime(secs: number): string {
  const s = Math.max(0, Math.floor(secs));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function pctClass(pct: number): string {
  if (pct >= 90) return "is-crit";
  if (pct >= 75) return "is-warn";
  return "is-ok";
}

function Gauge({
  pct,
  label,
  value,
  sub,
}: {
  pct: number;
  label: string;
  value: string;
  sub?: string;
}) {
  const r = 36;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, pct));
  const offset = c * (1 - clamped / 100);
  return (
    <div className={`mon-gauge ${pctClass(clamped)}`}>
      <div className="mon-gauge-ring">
        <svg viewBox="0 0 100 100" className="mon-gauge-svg" aria-hidden>
          <circle className="mon-gauge-track" cx="50" cy="50" r={r} />
          <circle
            className="mon-gauge-arc"
            cx="50"
            cy="50"
            r={r}
            strokeDasharray={c}
            strokeDashoffset={offset}
            transform="rotate(-90 50 50)"
          />
        </svg>
        <div className="mon-gauge-center">
          <span className="mon-gauge-pct">{clamped.toFixed(0)}%</span>
          <span className="mon-gauge-label">{label}</span>
        </div>
      </div>
      <div className="mon-gauge-meta">
        <strong>{value}</strong>
        {sub ? <span className="muted">{sub}</span> : null}
      </div>
    </div>
  );
}

function Sparkline({
  points,
  colorVar = "var(--accent)",
}: {
  points: number[];
  colorVar?: string;
}) {
  const w = 280;
  const h = 56;
  const pad = 2;
  if (points.length < 2) {
    return (
      <div className="mon-spark-empty muted">Collecting samples… enable tick or refresh.</div>
    );
  }
  const min = 0;
  const max = 100;
  const span = Math.max(1, points.length - 1);
  const coords = points.map((v, i) => {
    const x = pad + (i / span) * (w - pad * 2);
    const y = pad + (1 - (Math.max(min, Math.min(max, v)) - min) / (max - min)) * (h - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const line = coords.join(" ");
  const area = `${pad},${h - pad} ${line} ${w - pad},${h - pad}`;
  return (
    <div className="mon-spark">
      <svg viewBox={`0 0 ${w} ${h}`} className="mon-spark-svg" preserveAspectRatio="none">
        <polygon points={area} className="mon-spark-fill" style={{ fill: colorVar }} />
        <polyline points={line} className="mon-spark-line" style={{ stroke: colorVar }} />
      </svg>
    </div>
  );
}

export function MonitorPanel({ profileId, enabled }: Props) {
  const [snap, setSnap] = useState<MonitorSnapshot | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [tickMs, setTickMs] = useState<TickMs>(5000);
  const [showCharts, setShowCharts] = useState(true);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const inFlight = useRef(false);

  const refresh = useCallback(async () => {
    if (!profileId || !enabled || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      const s = await api.monitorSnapshot(profileId);
      setSnap(s);
      setHistory((prev) => {
        const next = [
          ...prev,
          { t: s.collectedAtMs || Date.now(), cpu: s.cpuPct, mem: s.memUsedPct },
        ];
        return next.length > HISTORY_MAX ? next.slice(next.length - HISTORY_MAX) : next;
      });
    } catch (e) {
      setError(String(e));
      toastError(e, "Monitor");
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }, [profileId, enabled]);

  useEffect(() => {
    setSnap(null);
    setHistory([]);
    setError("");
    if (enabled && profileId) void refresh();
  }, [enabled, profileId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!enabled || !profileId || tickMs === 0) return;
    const id = window.setInterval(() => {
      void refresh();
    }, tickMs);
    return () => window.clearInterval(id);
  }, [enabled, profileId, tickMs, refresh]);

  if (!enabled) {
    return (
      <p className="muted docker-empty">
        Enable Monitor on this profile to use the host monitor plugin.
      </p>
    );
  }
  if (!profileId) {
    return <p className="muted docker-empty">Connect a profile session to monitor the host.</p>;
  }

  const ip = iconProps(iconSizeSm);

  return (
    <div className="docker-panel monitor-panel">
      <div className="docker-toolbar mon-toolbar">
        <div className="mon-toolbar-left">
          <span className="docker-toolbar-label">Monitor</span>
          <label className="mon-tick">
            <span className="muted">Tick</span>
            <select
              value={tickMs}
              aria-label="Runtime tick interval"
              onChange={(e) => setTickMs(Number(e.target.value) as TickMs)}
            >
              <option value={0}>Off</option>
              <option value={2000}>2s</option>
              <option value={5000}>5s</option>
              <option value={10000}>10s</option>
              <option value={30000}>30s</option>
            </select>
          </label>
          <button
            type="button"
            className={`ghost mon-mode-btn ${showCharts ? "is-active" : ""}`}
            title={showCharts ? "Hide CPU/RAM time charts" : "Show CPU/RAM time charts"}
            onClick={() => setShowCharts((v) => !v)}
          >
            {showCharts ? <ShowChartIcon {...ip} /> : <SpeedIcon {...ip} />}
            <span>Charts</span>
          </button>
        </div>
        <IconButton
          variant="icon"
          title="Refresh now"
          disabled={busy}
          onClick={() => void refresh()}
          icon={<RefreshIcon {...ip} />}
        />
      </div>

      <div className="docker-tab-body mon-body">
        {error ? <p className="docker-error">{error}</p> : null}
        {!snap && busy ? <p className="muted docker-empty">Sampling host…</p> : null}
        {snap ? (
          <>
            <div className="mon-meta muted">
              <span>
                Load {snap.load1.toFixed(2)} / {snap.load5.toFixed(2)} / {snap.load15.toFixed(2)}
              </span>
              <span>·</span>
              <span>
                {snap.cpuCount || "?"} CPU
                {snap.cpuCount === 1 ? "" : "s"}
              </span>
              <span>·</span>
              <span>Up {formatUptime(snap.uptimeSecs)}</span>
            </div>

            <div className="mon-gauges">
              <Gauge
                pct={snap.cpuPct}
                label="CPU"
                value={`${snap.cpuPct.toFixed(1)}%`}
                sub={`${snap.cpuCount || "?"} cores`}
              />
              <Gauge
                pct={snap.memUsedPct}
                label="RAM"
                value={formatBytes(snap.memUsedBytes)}
                sub={`of ${formatBytes(snap.memTotalBytes)}`}
              />
              {snap.swapTotalBytes > 0 ? (
                <Gauge
                  pct={snap.swapUsedPct}
                  label="Swap"
                  value={formatBytes(snap.swapUsedBytes)}
                  sub={`of ${formatBytes(snap.swapTotalBytes)}`}
                />
              ) : null}
            </div>

            <div className="mon-numbers">
              <div>
                <span className="muted">Available RAM</span>
                <strong>{formatBytes(snap.memAvailBytes)}</strong>
              </div>
              {snap.swapTotalBytes > 0 ? (
                <div>
                  <span className="muted">Swap used</span>
                  <strong>
                    {formatBytes(snap.swapUsedBytes)} ({snap.swapUsedPct.toFixed(0)}%)
                  </strong>
                </div>
              ) : (
                <div>
                  <span className="muted">Swap</span>
                  <strong>none</strong>
                </div>
              )}
            </div>

            {showCharts ? (
              <div className="mon-charts">
                <section className="mon-chart-card">
                  <header>
                    <strong>CPU over time</strong>
                    <span>{snap.cpuPct.toFixed(1)}%</span>
                  </header>
                  <Sparkline points={history.map((p) => p.cpu)} colorVar="var(--accent)" />
                </section>
                <section className="mon-chart-card">
                  <header>
                    <strong>RAM over time</strong>
                    <span>{snap.memUsedPct.toFixed(1)}%</span>
                  </header>
                  <Sparkline
                    points={history.map((p) => p.mem)}
                    colorVar="color-mix(in srgb, #38bdf8 80%, var(--accent))"
                  />
                </section>
              </div>
            ) : null}

            <section className="mon-disks">
              <h3 className="mon-section-title">Disks</h3>
              {snap.disks.length === 0 ? (
                <p className="muted docker-empty">No disk mounts reported.</p>
              ) : (
                <ul className="mon-disk-list">
                  {snap.disks.map((d) => (
                    <li key={`${d.mount}|${d.filesystem}`} className={`mon-disk ${pctClass(d.usedPct)}`}>
                      <div className="mon-disk-head">
                        <span className="mon-disk-mount" title={d.mount}>
                          {d.mount}
                        </span>
                        <span className="mon-disk-pct">{d.usedPct.toFixed(0)}%</span>
                      </div>
                      <div className="mon-disk-bar" role="progressbar" aria-valuenow={d.usedPct} aria-valuemin={0} aria-valuemax={100}>
                        <div className="mon-disk-fill" style={{ width: `${Math.min(100, d.usedPct)}%` }} />
                      </div>
                      <div className="mon-disk-desc muted">
                        <span>
                          {formatBytes(d.usedBytes)} used · {formatBytes(d.availBytes)} free of{" "}
                          {formatBytes(d.totalBytes)}
                        </span>
                        <span className="mon-disk-fs" title={d.filesystem}>
                          {d.filesystem}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        ) : null}
      </div>
    </div>
  );
}
