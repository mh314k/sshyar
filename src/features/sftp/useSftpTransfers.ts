import { useEffect, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import type { TransferProgressEvent } from "../../types";
import {
  applyTransferProgress,
  initialTransfer,
  markTransferError,
} from "./panel/transferState";
import type { TransferState } from "./panel/types";

export function useSftpTransfers() {
  const [transfer, setTransfer] = useState<TransferState | null>(null);
  const transferIdRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const unlisten = listen<TransferProgressEvent>("sftp-transfer-progress", (ev) => {
      if (cancelled) return;
      const p = ev.payload;
      if (!transferIdRef.current || p.transferId !== transferIdRef.current) return;
      setTransfer((prev) => {
        if (!prev || prev.id !== p.transferId) return prev;
        return applyTransferProgress(prev, p);
      });
    });
    return () => {
      cancelled = true;
      void unlisten.then((u) => u());
    };
  }, []);

  return {
    transfer,
    setTransfer,
    transferIdRef,
    initialTransfer,
    markTransferError,
  };
}
