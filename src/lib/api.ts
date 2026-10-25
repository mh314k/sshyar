import { invoke } from "@tauri-apps/api/core";
import type {
  Profile,
  ProfileInput,
  RemoteEntry,
  Snippet,
  VaultStatus,
} from "../types";

export const api = {
  vaultStatus: () => invoke<VaultStatus>("vault_status"),
  vaultUnlock: (password: string) => invoke<VaultStatus>("vault_unlock", { password }),
  vaultLock: () => invoke<void>("vault_lock"),
  vaultSetMasterPassword: (password: string) =>
    invoke<void>("vault_set_master_password", { password }),
  vaultRemoveMasterPassword: () => invoke<void>("vault_remove_master_password"),

  listProfiles: () => invoke<Profile[]>("list_profiles"),
  upsertProfile: (id: string | null, input: ProfileInput) =>
    invoke<Profile>("upsert_profile", { id, input }),
  deleteProfile: (id: string) => invoke<void>("delete_profile", { id }),
  duplicateProfile: (id: string) => invoke<Profile>("duplicate_profile", { id }),
  getSshCommand: (id: string) => invoke<string>("get_ssh_command", { id }),

  listSnippets: () => invoke<Snippet[]>("list_snippets"),
  upsertSnippet: (id: string | null, name: string, command: string) =>
    invoke<Snippet>("upsert_snippet", { id, name, command }),
  deleteSnippet: (id: string) => invoke<void>("delete_snippet", { id }),

  ptyCreate: (cols: number, rows: number, profileId?: string | null) =>
    invoke<{ sessionId: string }>("pty_create", { cols, rows, profileId: profileId ?? null }),
  ptyWrite: (sessionId: string, data: string) =>
    invoke<void>("pty_write", { sessionId, data }),
  ptyResize: (sessionId: string, cols: number, rows: number) =>
    invoke<void>("pty_resize", { sessionId, cols, rows }),
  ptyKill: (sessionId: string) => invoke<void>("pty_kill", { sessionId }),
  ptyInject: (sessionId: string, command: string) =>
    invoke<void>("pty_inject", { sessionId, command }),

  openExternalSsh: (profileId: string) => invoke<void>("open_external_ssh", { profileId }),
  generateProfileKey: (profileId: string, passphrase: string) =>
    invoke<{ privateKeyPath: string; publicKeyPath: string }>("generate_profile_key", {
      profileId,
      passphrase,
    }),
  installProfileKey: (profileId: string) =>
    invoke<void>("install_profile_key", { profileId }),

  sftpOpen: (profileId: string) =>
    invoke<{ sftpId: string; cwd: string }>("sftp_open", { profileId }),
  sftpClose: (sftpId: string) => invoke<void>("sftp_close", { sftpId }),
  sftpList: (sftpId: string, path?: string | null) =>
    invoke<RemoteEntry[]>("sftp_list", { sftpId, path: path ?? null }),
  sftpMkdir: (sftpId: string, path: string) => invoke<void>("sftp_mkdir", { sftpId, path }),
  sftpRename: (sftpId: string, from: string, to: string) =>
    invoke<void>("sftp_rename", { sftpId, from, to }),
  sftpRemove: (sftpId: string, path: string, isDir: boolean) =>
    invoke<void>("sftp_remove", { sftpId, path, isDir }),
  sftpUpload: (sftpId: string, localPath: string, remotePath: string) =>
    invoke<void>("sftp_upload", { sftpId, localPath, remotePath }),
  sftpUploadBatch: (
    sftpId: string,
    transferId: string,
    items: { localPath: string; remotePath: string }[],
  ) => invoke<void>("sftp_upload_batch", { sftpId, transferId, items }),
  sftpDownload: (sftpId: string, remotePath: string, localPath: string) =>
    invoke<void>("sftp_download", { sftpId, remotePath, localPath }),
  sftpCopyRemote: (sftpId: string, from: string, to: string) =>
    invoke<void>("sftp_copy_remote", { sftpId, from, to }),
  sftpReadText: (sftpId: string, remotePath: string) =>
    invoke<string>("sftp_read_text", { sftpId, remotePath }),
  sftpWriteText: (sftpId: string, remotePath: string, content: string) =>
    invoke<void>("sftp_write_text", { sftpId, remotePath, content }),
};
