import type { TransferProgressEvent } from "../../types";
import type { TransferFile, TransferKind, TransferState } from "./types";

export function initialTransfer(
  id: string,
  kind: TransferKind,
  names: { name: string; sizeHint?: number }[],
): TransferState {
  return {
    id,
    kind,
    files: names.map((it) => ({
      name: it.name,
      bytesSent: 0,
      bytesTotal: it.sizeHint ?? 0,
      status: "pending",
    })),
    overallSent: 0,
    overallTotal: names.reduce((s, it) => s + (it.sizeHint ?? 0), 0),
  };
}

export function markTransferError(prev: TransferState | null): TransferState | null {
  if (!prev) return prev;
  return {
    ...prev,
    files: prev.files.map((f) =>
      f.status === "active" || f.status === "pending"
        ? { ...f, status: "error" as const }
        : f,
    ),
  };
}

export function applyTransferProgress(
  prev: TransferState,
  p: TransferProgressEvent,
): TransferState {
  const count = Math.max(prev.files.length, p.fileCount || 0, p.fileIndex + 1);
  const files: TransferFile[] = Array.from({ length: count }, (_, i) => {
    const existing = prev.files[i];
    if (i !== p.fileIndex) {
      if (i < p.fileIndex) {
        return {
          name: existing?.name ?? `file ${i + 1}`,
          bytesSent: existing?.bytesTotal || existing?.bytesSent || 0,
          bytesTotal: existing?.bytesTotal || 0,
          status: "done" as const,
        };
      }
      return (
        existing ?? {
          name: `file ${i + 1}`,
          bytesSent: 0,
          bytesTotal: 0,
          status: "pending" as const,
        }
      );
    }
    const done = p.bytesSent >= p.bytesTotal;
    return {
      name: p.fileName || existing?.name || `file ${i + 1}`,
      bytesSent: p.bytesSent,
      bytesTotal: p.bytesTotal || existing?.bytesTotal || 0,
      status: done ? ("done" as const) : ("active" as const),
    };
  });
  return {
    ...prev,
    files,
    overallSent: p.overallSent,
    overallTotal: p.overallTotal || prev.overallTotal,
  };
}

export function transferKindLabel(kind: TransferKind): string {
  switch (kind) {
    case "copy":
      return "Copying";
    case "move":
      return "Moving";
    case "delete":
      return "Deleting";
    default:
      return "Uploading";
  }
}
