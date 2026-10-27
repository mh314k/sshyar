import { startTransition, useCallback, useEffect, useRef, useState } from "react";
import { api } from "../../lib/api";
import { toast, toastError } from "../../lib/toast";
import type { RemoteEntry } from "../../types";
import { normalizeRemotePath } from "./panel/followShell";

interface Options {
  profileId: string | null;
  isOpen: boolean;
  jumpPath?: string | null;
  onJumpPathConsumed?: () => void;
  followRef: React.MutableRefObject<boolean>;
  disableFollowForBrowse: () => void;
  onSessionCleared?: () => void;
}

export function useSftpSession({
  profileId,
  isOpen,
  jumpPath = null,
  onJumpPathConsumed,
  followRef,
  disableFollowForBrowse,
  onSessionCleared,
}: Options) {
  const [sftpId, setSftpId] = useState<string | null>(null);
  const [cwd, setCwd] = useState("");
  const [entries, setEntries] = useState<RemoteEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const [checked, setChecked] = useState<Set<string>>(() => new Set());

  const sftpIdRef = useRef<string | null>(null);
  const cwdRef = useRef("");
  const busyRef = useRef(false);
  const browseInFlightRef = useRef(false);
  const listGenRef = useRef(0);
  const lastClickedRef = useRef<string | null>(null);
  const jumpPathRef = useRef<string | null>(jumpPath);
  const onJumpConsumedRef = useRef(onJumpPathConsumed);

  useEffect(() => {
    sftpIdRef.current = sftpId;
  }, [sftpId]);
  useEffect(() => {
    cwdRef.current = cwd;
  }, [cwd]);
  useEffect(() => {
    busyRef.current = busy;
  }, [busy]);
  useEffect(() => {
    jumpPathRef.current = jumpPath;
  }, [jumpPath]);
  useEffect(() => {
    onJumpConsumedRef.current = onJumpPathConsumed;
  }, [onJumpPathConsumed]);

  const refresh = useCallback(async (id: string, path?: string) => {
    const gen = ++listGenRef.current;
    const list = await api.sftpList(id, path);
    if (gen !== listGenRef.current) return;
    if (!Array.isArray(list)) throw new Error("Invalid SFTP listing");
    startTransition(() => {
      if (gen !== listGenRef.current) return;
      setEntries(list);
      if (path !== undefined) {
        setCwd(path);
        setChecked(new Set());
        lastClickedRef.current = null;
      } else {
        setChecked((prev) => {
          const next = new Set<string>();
          for (const e of list) if (e?.path && prev.has(e.path)) next.add(e.path);
          return next;
        });
      }
    });
  }, []);

  const browseTo = useCallback(
    async (path: string) => {
      const id = sftpIdRef.current;
      if (!id || browseInFlightRef.current) return;
      const normalized = normalizeRemotePath(path);
      if (normalized === normalizeRemotePath(cwdRef.current)) return;
      if (followRef.current) disableFollowForBrowse();
      const prevCwd = cwdRef.current;
      setCwd(normalized);
      setChecked(new Set());
      lastClickedRef.current = null;
      browseInFlightRef.current = true;
      setBusy(true);
      try {
        await refresh(id, normalized);
      } catch (err) {
        setCwd(prevCwd);
        cwdRef.current = prevCwd;
        toastError(err, "SFTP");
      } finally {
        browseInFlightRef.current = false;
        setBusy(false);
      }
    },
    [refresh, followRef, disableFollowForBrowse],
  );

  useEffect(() => {
    let cancelled = false;
    async function connect() {
      if (!isOpen || !profileId) {
        if (sftpId) {
          await api.sftpClose(sftpId).catch(() => undefined);
          setSftpId(null);
        }
        onSessionCleared?.();
        return;
      }
      setBusy(true);
      try {
        if (sftpId) {
          await api.sftpClose(sftpId).catch(() => undefined);
          onSessionCleared?.();
        }
        const { sftpId: id, cwd: c } = await api.sftpOpen(profileId);
        if (cancelled) {
          await api.sftpClose(id);
          return;
        }
        setSftpId(id);
        const jump = jumpPathRef.current?.trim().replace(/\/+$/, "") || "";
        const target = jump || c;
        setCwd(target);
        try {
          await refresh(id, target);
          if (jump) {
            toast(jump, { kind: "info", title: "SFTP", durationMs: 2200 });
            onJumpConsumedRef.current?.();
          }
        } catch (listErr) {
          if (jump) {
            await refresh(id, c).catch(() => undefined);
            if (!cancelled) toastError(listErr, "Open Compose project");
            onJumpConsumedRef.current?.();
          } else {
            throw listErr;
          }
        }
      } catch (err) {
        if (!cancelled) toastError(err, "SFTP connect");
        setSftpId(null);
      } finally {
        setBusy(false);
      }
    }
    void connect();
    return () => {
      cancelled = true;
      const id = sftpIdRef.current;
      if (id) {
        sftpIdRef.current = null;
        void api.sftpClose(id).catch(() => undefined);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, profileId]);

  useEffect(() => {
    if (!jumpPath || !sftpId || busy) return;
    const normalized = jumpPath.replace(/\/+$/, "") || "/";
    void browseTo(normalized).finally(() => onJumpPathConsumed?.());
  }, [jumpPath, sftpId, busy, browseTo, onJumpPathConsumed]);

  return {
    sftpId,
    cwd,
    setCwd,
    entries,
    setEntries,
    busy,
    setBusy,
    checked,
    setChecked,
    refresh,
    browseTo,
    sftpIdRef,
    cwdRef,
    busyRef,
    browseInFlightRef,
    lastClickedRef,
  };
}
