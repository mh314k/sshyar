import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";

function WinIconMinimize() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
      <path fill="currentColor" d="M1 5h8v1H1z" />
    </svg>
  );
}

function WinIconMaximize() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
      <path fill="none" stroke="currentColor" strokeWidth="1" d="M1.5 1.5h7v7h-7z" />
    </svg>
  );
}

function WinIconRestore() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        d="M2.5 3.5h5v5h-5zM3.5 2.5h5v1M8.5 2.5v5h-1"
      />
    </svg>
  );
}

function WinIconClose() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
      <path
        fill="currentColor"
        d="M1.2 2l.8-.8L5 4.2 8 1.2l.8.8L5.8 5 8.8 8l-.8.8L5 5.8 2 8.8l-.8-.8L4.2 5z"
      />
    </svg>
  );
}

/** Custom minimize / maximize / close — used with decorations: false. */
export function WindowControls() {
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let cancelled = false;
    void (async () => {
      try {
        const win = getCurrentWindow();
        setMaximized(await win.isMaximized());
        unlisten = await win.onResized(async () => {
          if (cancelled) return;
          setMaximized(await win.isMaximized());
        });
      } catch {
        /* browser / non-Tauri preview */
      }
    })();
    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, []);

  async function run(action: "minimize" | "toggleMaximize" | "close") {
    try {
      const win = getCurrentWindow();
      if (action === "minimize") await win.minimize();
      else if (action === "toggleMaximize") await win.toggleMaximize();
      else await win.close();
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="window-controls" role="group" aria-label="Window">
      <button
        type="button"
        className="window-control"
        title="Minimize"
        aria-label="Minimize"
        onClick={() => void run("minimize")}
      >
        <WinIconMinimize />
      </button>
      <button
        type="button"
        className="window-control"
        title={maximized ? "Restore" : "Maximize"}
        aria-label={maximized ? "Restore" : "Maximize"}
        onClick={() => void run("toggleMaximize")}
      >
        {maximized ? <WinIconRestore /> : <WinIconMaximize />}
      </button>
      <button
        type="button"
        className="window-control window-control-close"
        title="Close"
        aria-label="Close"
        onClick={() => void run("close")}
      >
        <WinIconClose />
      </button>
    </div>
  );
}
