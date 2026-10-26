import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast, toastError, toastSuccess } from "../../lib/toast";

export type DockerJobStatus = "running" | "success" | "error";

export type DockerJob = {
  id: number;
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
  runJob: <T>(opts: RunOpts, fn: () => Promise<T>) => Promise<T>;
};

const DockerJobCtx = createContext<Ctx | null>(null);

let seq = 0;

export function DockerJobProvider({ children }: { children: ReactNode }) {
  const [job, setJob] = useState<DockerJob | null>(null);
  const clearTimer = useRef<number | null>(null);

  const clearJob = useCallback(() => {
    if (clearTimer.current != null) {
      window.clearTimeout(clearTimer.current);
      clearTimer.current = null;
    }
    setJob(null);
  }, []);

  const runJob = useCallback(
    async <T,>(opts: RunOpts, fn: () => Promise<T>): Promise<T> => {
      if (clearTimer.current != null) {
        window.clearTimeout(clearTimer.current);
        clearTimer.current = null;
      }
      const id = ++seq;
      const detail = opts.detail ?? opts.runningMessage ?? opts.title;
      const runningMsg = opts.runningMessage ?? detail;
      setJob({ id, title: opts.title, detail: runningMsg, status: "running" });
      toast(runningMsg, { kind: "info", title: opts.title, durationMs: 2500 });

      try {
        const result = await fn();
        const successMsg = opts.successMessage ?? `${opts.title} completed`;
        setJob({ id, title: opts.title, detail: successMsg, status: "success" });
        toastSuccess(successMsg, opts.title);
        clearTimer.current = window.setTimeout(() => {
          setJob((j) => (j?.id === id ? null : j));
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
        clearTimer.current = window.setTimeout(() => {
          setJob((j) => (j?.id === id ? null : j));
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
