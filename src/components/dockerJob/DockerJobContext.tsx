import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { listen } from "@tauri-apps/api/event";
import { desktopNotify } from "../../lib/desktopNotify";
import { toast, toastError, toastSuccess } from "../../lib/toast";

/** Jobs longer than this also get an OS desktop notification when they finish. */
const LONG_JOB_NOTIFY_MS = 8_000;

export type DockerJobStatus = "running" | "success" | "error";

export type DockerJob = {
  /** Stable id shared with the backend for streamed chunks. */
  id: string;
  title: string;
  detail: string;
  status: DockerJobStatus;
};

type RunOpts = {
  title: string;
  detail?: string;
  /** Toast + bar label while running. Defaults to detail or title. */
  runningMessage?: string;
  successMessage?: string;
};

type Ctx = {
  job: DockerJob | null;
  clearJob: () => void;
  /** Run work with progress UI; `fn` receives the job id for backend streaming. */
  runJob: <T>(opts: RunOpts, fn: (jobId: string) => Promise<T>) => Promise<T>;
};

type JobChunkEvent = {
  jobId: string;
  text: string;
};

const DockerJobCtx = createContext<Ctx | null>(null);

let seq = 0;

function truncateDetail(text: string, max = 240): string {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (trimmed.length <= max) return trimmed;
  return `…${trimmed.slice(trimmed.length - max + 1)}`;
}

export function DockerJobProvider({ children }: { children: ReactNode }) {
  const [job, setJob] = useState<DockerJob | null>(null);
  const clearTimer = useRef<number | null>(null);
  const activeIdRef = useRef<string | null>(null);

  const clearJob = useCallback(() => {
    if (clearTimer.current != null) {
      window.clearTimeout(clearTimer.current);
      clearTimer.current = null;
    }
    activeIdRef.current = null;
    setJob(null);
  }, []);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    void listen<JobChunkEvent>("docker-job-chunk", (ev) => {
      const { jobId, text } = ev.payload;
      if (!text || activeIdRef.current !== jobId) return;
      setJob((j) => {
        if (!j || j.id !== jobId || j.status !== "running") return j;
        const combined = `${j.detail}\n${text}`;
        return { ...j, detail: truncateDetail(combined) };
      });
    }).then((fn) => {
      unlisten = fn;
    });
    return () => {
      unlisten?.();
    };
  }, []);

  const runJob = useCallback(
    async <T,>(opts: RunOpts, fn: (jobId: string) => Promise<T>): Promise<T> => {
      if (clearTimer.current != null) {
        window.clearTimeout(clearTimer.current);
        clearTimer.current = null;
      }
      const id = `dj-${++seq}`;
      activeIdRef.current = id;
      const startedAt = Date.now();
      const detail = opts.detail ?? opts.runningMessage ?? opts.title;
      const runningMsg = opts.runningMessage ?? detail;
      setJob({ id, title: opts.title, detail: runningMsg, status: "running" });
      toast(runningMsg, { kind: "info", title: opts.title, durationMs: 2500 });

      try {
        const result = await fn(id);
        const successMsg = opts.successMessage ?? `${opts.title} completed`;
        setJob({ id, title: opts.title, detail: successMsg, status: "success" });
        toastSuccess(successMsg, opts.title);
        if (Date.now() - startedAt >= LONG_JOB_NOTIFY_MS) {
          void desktopNotify(opts.title, successMsg);
        }
        clearTimer.current = window.setTimeout(() => {
          setJob((j) => (j?.id === id ? null : j));
          if (activeIdRef.current === id) activeIdRef.current = null;
          clearTimer.current = null;
        }, 1600);
        return result;
      } catch (e) {
        const errText = String(e);
        setJob({
          id,
          title: opts.title,
          detail: errText.length > 120 ? `${errText.slice(0, 117)}…` : errText,
          status: "error",
        });
        toastError(e, opts.title);
        if (Date.now() - startedAt >= LONG_JOB_NOTIFY_MS) {
          void desktopNotify(opts.title, errText.length > 160 ? `${errText.slice(0, 157)}…` : errText);
        }
        clearTimer.current = window.setTimeout(() => {
          setJob((j) => (j?.id === id ? null : j));
          if (activeIdRef.current === id) activeIdRef.current = null;
          clearTimer.current = null;
        }, 4500);
        throw e;
      }
    },
    [],
  );

  const value = useMemo(() => ({ job, clearJob, runJob }), [job, clearJob, runJob]);

  return <DockerJobCtx.Provider value={value}>{children}</DockerJobCtx.Provider>;
}

export function useDockerJob(): Ctx {
  const ctx = useContext(DockerJobCtx);
  if (!ctx) {
    throw new Error("useDockerJob must be used within DockerJobProvider");
  }
  return ctx;
}
