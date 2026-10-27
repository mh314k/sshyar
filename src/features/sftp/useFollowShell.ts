import { useCallback, useEffect, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { api } from "../../lib/api";
import { toast, toastError } from "../../lib/toast";
import {
  buildFollowInject,
  CWD_OSC_RE,
  isFollowShellSupported,
  normalizeRemotePath,
} from "./panel/followShell";

interface Options {
  ptyId: string | null;
  remoteShell?: string;
  sftpIdRef: React.MutableRefObject<string | null>;
  cwdRef: React.MutableRefObject<string>;
  busyRef: React.MutableRefObject<boolean>;
  browseInFlightRef: React.MutableRefObject<boolean>;
  refresh: (id: string, path?: string) => Promise<void>;
}

export function useFollowShell({
  ptyId,
  remoteShell,
  sftpIdRef,
  cwdRef,
  busyRef,
  browseInFlightRef,
  refresh,
}: Options) {
  const followSupported = isFollowShellSupported(remoteShell);
  const [followShell, setFollowShell] = useState(false);
  const followRef = useRef(false);
  const oscBufRef = useRef("");
  const navTimerRef = useRef<number | null>(null);
  const followWasOnRef = useRef(false);
  const followPtyRef = useRef<string | null>(null);

  useEffect(() => {
    followRef.current = followShell;
  }, [followShell]);

  useEffect(() => {
    if (!followSupported && followShell) setFollowShell(false);
  }, [followSupported, followShell]);

  const navigateFollow = useCallback(
    (path: string) => {
      const id = sftpIdRef.current;
      if (!id || !path || browseInFlightRef.current) return;
      if (!followRef.current) return;
      const normalized = normalizeRemotePath(path);
      if (normalized === normalizeRemotePath(cwdRef.current)) return;
      if (busyRef.current) return;
      if (navTimerRef.current) window.clearTimeout(navTimerRef.current);
      navTimerRef.current = window.setTimeout(() => {
        if (busyRef.current || browseInFlightRef.current || !followRef.current) return;
        void refresh(id, normalized).catch((err) => toastError(err, "SFTP"));
      }, 150);
    },
    [refresh, sftpIdRef, cwdRef, busyRef, browseInFlightRef],
  );

  useEffect(() => {
    if (!ptyId || !followShell) {
      oscBufRef.current = "";
      return;
    }
    let cancelled = false;
    const unlisten = listen<string>(`pty-output-${ptyId}`, (ev) => {
      if (!followRef.current || cancelled || browseInFlightRef.current) return;
      const chunk = ev.payload;
      if (!chunk.includes("7337;cwd=")) {
        if (oscBufRef.current) {
          oscBufRef.current = (oscBufRef.current + chunk).slice(-200);
        }
        return;
      }
      oscBufRef.current = (oscBufRef.current + chunk).slice(-4000);
      CWD_OSC_RE.lastIndex = 0;
      let match: RegExpExecArray | null;
      let last: string | null = null;
      while ((match = CWD_OSC_RE.exec(oscBufRef.current)) !== null) {
        last = match[1];
      }
      if (last) {
        const cut = oscBufRef.current.lastIndexOf("\x1b]7337;cwd=");
        oscBufRef.current = cut >= 0 ? oscBufRef.current.slice(cut) : "";
        try {
          last = decodeURIComponent(last);
        } catch {
          /* keep raw */
        }
        navigateFollow(last);
      }
    });
    return () => {
      cancelled = true;
      void unlisten.then((u) => u());
    };
  }, [ptyId, followShell, navigateFollow, browseInFlightRef]);

  useEffect(() => {
    if (!ptyId) {
      followWasOnRef.current = false;
      followPtyRef.current = null;
      return;
    }
    const wasOn = followWasOnRef.current;
    const ptyChanged = followPtyRef.current !== ptyId;
    followWasOnRef.current = followShell;
    followPtyRef.current = ptyId;

    let timer: number | undefined;

    if (followShell) {
      const delayMs = ptyChanged ? 2500 : 600;
      timer = window.setTimeout(() => {
        void api
          .ptyInject(ptyId, buildFollowInject(true))
          .then(() => {
            toast("Follow shell on — cd in remote shell updates SFTP", { kind: "info" });
          })
          .catch((err) => {
            toastError(err, "Follow shell");
          });
      }, delayMs);
    } else if (wasOn) {
      void api.ptyInject(ptyId, buildFollowInject(false)).catch(() => undefined);
    }

    return () => {
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [followShell, ptyId]);

  const disableFollowForBrowse = useCallback(() => {
    if (followRef.current) {
      setFollowShell(false);
      toast("Follow shell off — browsing in SFTP", { kind: "info", durationMs: 2200 });
    }
    if (navTimerRef.current) {
      window.clearTimeout(navTimerRef.current);
      navTimerRef.current = null;
    }
  }, []);

  return {
    followShell,
    setFollowShell,
    followSupported,
    followRef,
    navTimerRef,
    disableFollowForBrowse,
  };
}
