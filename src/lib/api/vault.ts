import { invoke } from "@tauri-apps/api/core";
import type { VaultStatus } from "../../types";

export interface VaultBackupResult {
  path: string;
  profileCount: number;
  snippetCount: number;
}

export interface VaultImportResult {
  profiles: number;
  snippets: number;
  replaced: boolean;
}

export const vaultApi = {
  status: () => invoke<VaultStatus>("vault_status"),
  unlock: (password: string) => invoke<VaultStatus>("vault_unlock", { password }),
  lock: () => invoke<void>("vault_lock"),
  setMasterPassword: (password: string) =>
    invoke<void>("vault_set_master_password", { password }),
  changeMasterPassword: (current: string, next: string) =>
    invoke<void>("vault_change_master_password", { current, next }),
  removeMasterPassword: (password: string) =>
    invoke<void>("vault_remove_master_password", { password }),
  exportBackup: (password: string, path: string) =>
    invoke<VaultBackupResult>("vault_export_backup", { password, path }),
  importBackup: (password: string, path: string, replace: boolean) =>
    invoke<VaultImportResult>("vault_import_backup", { password, path, replace }),
};
