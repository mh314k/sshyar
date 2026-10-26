import { invoke } from "@tauri-apps/api/core";
import type { RemoteEntry } from "../../types";

export const sftpApi = {
  open: (profileId: string) =>
    invoke<{ sftpId: string; cwd: string }>("sftp_open", { profileId }),
  close: (sftpId: string) => invoke<void>("sftp_close", { sftpId }),
  list: (sftpId: string, path?: string | null) =>
    invoke<RemoteEntry[]>("sftp_list", { sftpId, path: path ?? null }),
  mkdir: (sftpId: string, path: string) => invoke<void>("sftp_mkdir", { sftpId, path }),
  rename: (sftpId: string, from: string, to: string) =>
    invoke<void>("sftp_rename", { sftpId, from, to }),
  remove: (sftpId: string, path: string, isDir: boolean) =>
    invoke<void>("sftp_remove", { sftpId, path, isDir }),
  removeBatch: (
    sftpId: string,
    transferId: string,
    items: { path: string; isDir: boolean }[],
  ) => invoke<void>("sftp_remove_batch", { sftpId, transferId, items }),
  upload: (sftpId: string, localPath: string, remotePath: string) =>
    invoke<void>("sftp_upload", { sftpId, localPath, remotePath }),
  uploadBatch: (
    sftpId: string,
    transferId: string,
    items: { localPath: string; remotePath: string }[],
  ) => invoke<void>("sftp_upload_batch", { sftpId, transferId, items }),
  download: (sftpId: string, remotePath: string, localPath: string) =>
    invoke<void>("sftp_download", { sftpId, remotePath, localPath }),
  copyRemote: (sftpId: string, from: string, to: string) =>
    invoke<void>("sftp_copy_remote", { sftpId, from, to }),
  copyBatch: (
    sftpId: string,
    transferId: string,
    items: { from: string; to: string }[],
  ) => invoke<void>("sftp_copy_batch", { sftpId, transferId, items }),
  moveBatch: (
    sftpId: string,
    transferId: string,
    items: { from: string; to: string }[],
  ) => invoke<void>("sftp_move_batch", { sftpId, transferId, items }),
  readText: (sftpId: string, remotePath: string) =>
    invoke<string>("sftp_read_text", { sftpId, remotePath }),
  writeText: (sftpId: string, remotePath: string, content: string) =>
    invoke<void>("sftp_write_text", { sftpId, remotePath, content }),
};
