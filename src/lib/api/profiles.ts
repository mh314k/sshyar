import { invoke } from "@tauri-apps/api/core";
import type { Profile, ProfileInput, Snippet } from "../../types";

export const profilesApi = {
  list: () => invoke<Profile[]>("list_profiles"),
  upsert: (id: string | null, input: ProfileInput) =>
    invoke<Profile>("upsert_profile", { id, input }),
  delete: (id: string) => invoke<void>("delete_profile", { id }),
  duplicate: (id: string) => invoke<Profile>("duplicate_profile", { id }),
  getSshCommand: (id: string) => invoke<string>("get_ssh_command", { id }),
};

export const snippetsApi = {
  list: () => invoke<Snippet[]>("list_snippets"),
  upsert: (id: string | null, name: string, command: string) =>
    invoke<Snippet>("upsert_snippet", { id, name, command }),
  delete: (id: string) => invoke<void>("delete_snippet", { id }),
};
