export interface RemoteEntry {
  name: string;
  path: string;
  isDir: boolean;
  size: number;
  mtime?: number | null;
}

export interface UploadItem {
  localPath: string;
  remotePath: string;
}

export interface TransferProgressEvent {
  transferId: string;
  sftpId: string;
  fileName: string;
  fileIndex: number;
  fileCount: number;
  bytesSent: number;
  bytesTotal: number;
  overallSent: number;
  overallTotal: number;
}
