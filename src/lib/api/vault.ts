import { invoke } from "@tauri-apps/api/core";
import type { VaultStatus } from "../../types";

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
};
