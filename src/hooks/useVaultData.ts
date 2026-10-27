import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";
import { toastError } from "../lib/toast";
import type { Profile, Snippet, VaultStatus } from "../types";

interface Options {
  killAllTabs: () => void;
  onLocked?: () => void;
}

export function useVaultData({ killAllTabs, onLocked }: Options) {
  const [vault, setVault] = useState<VaultStatus | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [bootError, setBootError] = useState("");

  const refreshData = useCallback(async () => {
    const [p, s, st] = await Promise.all([
      api.listProfiles(),
      api.listSnippets(),
      api.vaultStatus(),
    ]);
    setProfiles(p);
    setSnippets(s);
    setVault(st);
  }, []);

  useEffect(() => {
    api
      .vaultStatus()
      .then(async (st) => {
        setVault(st);
        if (st.unlocked) await refreshData();
      })
      .catch((e) => setBootError(String(e)));
  }, [refreshData]);

  const lockVault = useCallback(async () => {
    try {
      killAllTabs();
      setProfiles([]);
      setSnippets([]);
      onLocked?.();
      await api.vaultLock();
      setVault(await api.vaultStatus());
    } catch (e) {
      toastError(e, "Lock vault");
    }
  }, [killAllTabs, onLocked]);

  return {
    vault,
    setVault,
    profiles,
    snippets,
    bootError,
    refreshData,
    lockVault,
  };
}
