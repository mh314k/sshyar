import { useCallback, useEffect, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { appUpdateApi, type AppUpdateProgressEvent } from "../lib/api/appUpdate";
import { toastError } from "../lib/toast";
import type { UpdateInfo } from "../lib/version";

export type UpdateDownloadPhase = "idle" | "downloading" | "ready" | "error" | "installing";

export type UpdateDownloadState = {
  phase: UpdateDownloadPhase;
  /** 0–100 when known; null while total size unknown. */
  percent: number | null;
  downloaded: number;
  total: number | null;
  path: string | null;
  error: string | null;
};

const INITIAL: UpdateDownloadState = {
  phase: "idle",
  percent: null,
  downloaded: 0,
  total: null,
  path: null,
  error: null,
};

function pct(downloaded: number, total: number | null): number | null {
  if (total == null || total <= 0) return null;
  return Math.min(100, Math.round((downloaded / total) * 100));
}

export function useAppUpdate(info: UpdateInfo | null) {
  const [state, setState] = useState<UpdateDownloadState>(INITIAL);
  const infoRef = useRef(info);
  infoRef.current = info;

  useEffect(() => {
    setState(INITIAL);
    if (!info?.downloadUrl) return;
    let cancelled = false;
    void (async () => {
      try {
        const cached = await appUpdateApi.cachedPath(info.latest, info.downloadUrl!);
        if (cancelled || !cached) return;
        setState({
          phase: "ready",
          percent: 100,
          downloaded: 0,
          total: null,
          path: cached,
          error: null,
        });
      } catch {
        /* ignore cache probe errors */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [info?.latest, info?.downloadUrl]);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    void listen<AppUpdateProgressEvent>("app-update-progress", (ev) => {
      const p = ev.payload;
      const current = infoRef.current;
      if (!current || p.version.replace(/^v/i, "") !== current.latest.replace(/^v/i, "")) return;

      if (p.phase === "downloading") {
        setState({
          phase: "downloading",
          percent: pct(p.downloaded, p.total),
          downloaded: p.downloaded,
          total: p.total,
          path: null,
          error: null,
        });
      } else if (p.phase === "done") {
        setState({
          phase: "ready",
          percent: 100,
          downloaded: p.downloaded,
          total: p.total,
          path: p.path,
          error: null,
        });
      } else if (p.phase === "error") {
        setState((prev) => ({
          ...prev,
          phase: "error",
          error: p.message ?? "Download failed",
        }));
      }
    }).then((fn) => {
      unlisten = fn;
    });
    return () => unlisten?.();
  }, []);

  const startDownload = useCallback(async () => {
    const current = infoRef.current;
    if (!current?.downloadUrl) {
      toastError("No installer asset for this platform", "Update");
      return;
    }
    setState({
      phase: "downloading",
      percent: 0,
      downloaded: 0,
      total: null,
      path: null,
      error: null,
    });
    try {
      const path = await appUpdateApi.download(current.latest, current.downloadUrl);
      setState({
        phase: "ready",
        percent: 100,
        downloaded: 0,
        total: null,
        path,
        error: null,
      });
    } catch (e) {
      setState((prev) => ({
        ...prev,
        phase: "error",
        error: String(e),
      }));
      toastError(e, "Update download");
    }
  }, []);

  const install = useCallback(async () => {
    const path = state.path;
    if (!path) {
      toastError("Installer not downloaded yet", "Update");
      return;
    }
    setState((prev) => ({ ...prev, phase: "installing", error: null }));
    try {
      await appUpdateApi.install(path);
    } catch (e) {
      setState((prev) => ({
        ...prev,
        phase: "ready",
        error: String(e),
      }));
      toastError(e, "Update install");
    }
  }, [state.path]);

  return { state, startDownload, install };
}
