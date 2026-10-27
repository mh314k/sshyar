export type ClipItem = { path: string; name: string; isDir: boolean };
export type ClipboardState = { items: ClipItem[]; cut: boolean };

export type TransferFile = {
  name: string;
  bytesSent: number;
  bytesTotal: number;
  status: "pending" | "active" | "done" | "error";
};

export type TransferKind = "upload" | "copy" | "move" | "delete";

export type TransferState = {
  id: string;
  kind: TransferKind;
  files: TransferFile[];
  overallSent: number;
  overallTotal: number;
};

export type UploadPlanItem = {
  localPath: string;
  remotePath: string;
  name: string;
  sizeHint?: number;
};
