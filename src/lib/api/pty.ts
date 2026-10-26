import { invoke } from "@tauri-apps/api/core";

export const ptyApi = {
  create: (cols: number, rows: number, profileId?: string | null) =>
    invoke<{ sessionId: string }>("pty_create", {
      cols,
      rows,
      profileId: profileId ?? null,
    }),
  write: (sessionId: string, data: string) =>
    invoke<void>("pty_write", { sessionId, data }),
  resize: (sessionId: string, cols: number, rows: number) =>
    invoke<void>("pty_resize", { sessionId, cols, rows }),
  kill: (sessionId: string) => invoke<void>("pty_kill", { sessionId }),
  inject: (sessionId: string, command: string) =>
    invoke<void>("pty_inject", { sessionId, command }),
};

export const keysApi = {
  openExternalSsh: (profileId: string) =>
    invoke<void>("open_external_ssh", { profileId }),
  generateProfileKey: (profileId: string, passphrase: string) =>
    invoke<{ privateKeyPath: string; publicKeyPath: string }>("generate_profile_key", {
      profileId,
      passphrase,
    }),
  installProfileKey: (profileId: string) =>
    invoke<void>("install_profile_key", { profileId }),
};
