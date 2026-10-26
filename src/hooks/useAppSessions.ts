import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";
import { toastError } from "../lib/toast";
import type { Profile, SessionStatus, SessionTab } from "../types";

type Options = {
  profiles: Profile[];
  onOpenSftp?: () => void;
};

function hostLabelFor(profile: Profile) {
  return `${profile.username}@${profile.host}:${profile.port}`;
}

export function useAppSessions({ profiles, onOpenSftp }: Options) {
  const [tabs, setTabs] = useState<SessionTab[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  const setTabStatus = useCallback((id: string, status: SessionStatus) => {
    setTabs((prev) =>
      prev.map((t) => (t.id === id && t.status !== status ? { ...t, status } : t)),
    );
  }, []);

  const createLocalTab = useCallback(
    async (profile?: Profile) => {
      try {
        const { sessionId } = await api.ptyCreate(120, 30, profile?.id ?? null);
        const tab: SessionTab = {
          id: crypto.randomUUID(),
          title: profile?.name ?? "PowerShell",
          profileId: profile?.id,
          hostLabel: profile ? hostLabelFor(profile) : undefined,
          ptyId: sessionId,
          status: profile ? "connecting" : "local",
        };
        setTabs((t) => [...t, tab]);
        setActiveId(tab.id);
        if (profile) onOpenSftp?.();
      } catch (e) {
        toastError(e, profile ? "Connect" : "New session");
      }
    },
    [onOpenSftp],
  );

  const closeTab = useCallback(async (id: string) => {
    setTabs((prev) => {
      const tab = prev.find((t) => t.id === id);
      if (tab?.ptyId) void api.ptyKill(tab.ptyId);
      const next = prev.filter((t) => t.id !== id);
      setActiveId((cur) => {
        if (cur !== id) return cur;
        return next.length ? next[next.length - 1].id : null;
      });
      return next;
    });
  }, []);

  const killAllTabs = useCallback(() => {
    setTabs((prev) => {
      for (const tab of prev) {
        if (tab.ptyId) void api.ptyKill(tab.ptyId);
      }
      return [];
    });
    setActiveId(null);
  }, []);

  const reconnect = useCallback(
    async (id: string) => {
      const tab = tabs.find((t) => t.id === id);
      if (!tab?.profileId) return;
      const profile = profiles.find((p) => p.id === tab.profileId);
      if (!profile) return;
      try {
        if (tab.ptyId) await api.ptyKill(tab.ptyId);
        const { sessionId } = await api.ptyCreate(120, 30, profile.id);
        setTabs((prev) =>
          prev.map((t) =>
            t.id === id
              ? {
                  ...t,
                  ptyId: sessionId,
                  status: "connecting",
                  title: profile.name,
                  hostLabel: hostLabelFor(profile),
                }
              : t,
          ),
        );
      } catch (e) {
        toastError(e, "Reconnect");
      }
    },
    [tabs, profiles],
  );

  const runSnippet = useCallback(
    async (command: string) => {
      const tab = tabs.find((t) => t.id === activeId);
      if (!tab?.ptyId) {
        await createLocalTab();
        setTimeout(async () => {
          const latest = await new Promise<SessionTab | undefined>((resolve) => {
            setTabs((t) => {
              resolve(t[t.length - 1]);
              return t;
            });
          });
          if (latest?.ptyId) await api.ptyInject(latest.ptyId, command);
        }, 600);
        return;
      }
      await api.ptyInject(tab.ptyId, command);
    },
    [tabs, activeId, createLocalTab],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.ctrlKey && e.key.toLowerCase() === "t") {
        e.preventDefault();
        void createLocalTab();
      }
      if (e.ctrlKey && e.key.toLowerCase() === "w") {
        e.preventDefault();
        if (activeId) void closeTab(activeId);
      }
      if (e.ctrlKey && e.key === "Tab") {
        e.preventDefault();
        if (!tabs.length) return;
        const idx = tabs.findIndex((t) => t.id === activeId);
        const next = e.shiftKey
          ? (idx - 1 + tabs.length) % tabs.length
          : (idx + 1) % tabs.length;
        setActiveId(tabs[next].id);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeId, tabs, createLocalTab, closeTab]);

  const activeTab = tabs.find((t) => t.id === activeId) ?? null;

  return {
    tabs,
    activeId,
    activeTab,
    setActiveId,
    setTabStatus,
    createLocalTab,
    closeTab,
    killAllTabs,
    reconnect,
    runSnippet,
  };
}
