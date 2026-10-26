import { useCallback, useEffect, useState } from "react";
import { api } from "./lib/api";
import type { Profile, SessionTab, Snippet, VaultStatus } from "./types";
import { UnlockGate } from "./components/UnlockGate";
import { ProfileSidebar } from "./components/ProfileSidebar";
import { SessionTabBar } from "./components/SessionTabBar";
import { TerminalPane } from "./components/TerminalPane";
import { SftpPanel } from "./components/SftpPanel";
import { PanelLayout, usePanelLayout } from "./components/PanelLayout";
import { readStoredTheme, toggleTheme, type ThemeMode } from "./lib/theme";
import { DialogHost } from "./lib/dialogs";
import { ToastHost, toastError } from "./lib/toast";
import { BrandLogo } from "./components/BrandLogo";
import "./App.css";

export default function App() {
  const [vault, setVault] = useState<VaultStatus | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [tabs, setTabs] = useState<SessionTab[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [bootError, setBootError] = useState("");
  const [theme, setTheme] = useState<ThemeMode>(() => readStoredTheme());
  const panels = usePanelLayout();

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
        if (st.unlocked) {
          await refreshData();
        }
      })
      .catch((e) => setBootError(String(e)));
  }, [refreshData]);

  const createLocalTab = useCallback(async (profile?: Profile) => {
    const cols = 120;
    const rows = 30;
    try {
      const { sessionId } = await api.ptyCreate(cols, rows, profile?.id ?? null);
      const tab: SessionTab = {
        id: crypto.randomUUID(),
        title: profile?.name ?? "PowerShell",
        profileId: profile?.id,
        ptyId: sessionId,
        status: profile ? "connecting" : "local",
      };
      setTabs((t) => [...t, tab]);
      setActiveId(tab.id);
      if (profile) panels.setRightOpen(true);
    } catch (e) {
      toastError(e, profile ? "Connect" : "New session");
    }
  }, [panels.setRightOpen]);

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

  const lockVault = useCallback(async () => {
    try {
      setTabs((prev) => {
        for (const tab of prev) {
          if (tab.ptyId) void api.ptyKill(tab.ptyId);
        }
        return [];
      });
      setActiveId(null);
      setProfiles([]);
      setSnippets([]);
      panels.setRightOpen(false);
      await api.vaultLock();
      const st = await api.vaultStatus();
      setVault(st);
    } catch (e) {
      toastError(e, "Lock vault");
    }
  }, [panels.setRightOpen]);

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
              ? { ...t, ptyId: sessionId, status: "connecting", title: profile.name }
              : t,
          ),
        );
      } catch (e) {
        toastError(e, "Reconnect");
      }
    },
    [tabs, profiles],
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

  async function runSnippet(command: string) {
    const tab = tabs.find((t) => t.id === activeId);
    if (!tab?.ptyId) {
      await createLocalTab();
      // wait briefly then inject — simplified: create then inject on next tick
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
  }

  const hosts = (
    <>
      <DialogHost />
      <ToastHost />
    </>
  );

  if (bootError) {
    return (
      <>
        {hosts}
        <div className="unlock-gate">
          <div className="unlock-card">
            <div className="brand-title">
              <BrandLogo size={36} />
              <h1>SSHyar</h1>
            </div>
            <p className="error">{bootError}</p>
          </div>
        </div>
      </>
    );
  }

  if (!vault) {
    return (
      <>
        {hosts}
        <div className="unlock-gate">
          <div className="unlock-card">
            <div className="brand-title">
              <BrandLogo size={36} />
              <h1>SSHyar</h1>
            </div>
            <p className="muted">Loading…</p>
          </div>
        </div>
      </>
    );
  }

  if (!vault.unlocked) {
    return (
      <>
        {hosts}
        <UnlockGate
          status={vault}
          onUnlocked={async (s) => {
            setVault(s);
            await refreshData();
          }}
        />
      </>
    );
  }

  const activeTab = tabs.find((t) => t.id === activeId) ?? null;

  return (
    <>
    {hosts}
    <PanelLayout
      leftOpen={panels.leftOpen}
      rightOpen={panels.rightOpen}
      onLeftOpenChange={panels.setLeftOpen}
      onRightOpenChange={panels.setRightOpen}
      leftWidth={panels.leftWidth}
      rightWidth={panels.rightWidth}
      onLeftWidthChange={panels.setLeftWidth}
      onRightWidthChange={panels.setRightWidth}
      left={
        <ProfileSidebar
          profiles={profiles}
          snippets={snippets}
          onRefresh={() => void refreshData()}
          onConnect={(p) => void createLocalTab(p)}
          onExternal={(p) => void api.openExternalSsh(p.id)}
          onRunSnippet={(c) => void runSnippet(c)}
          hasMasterPassword={vault.hasMasterPassword}
          onMasterPasswordChange={() => void refreshData()}
          onLock={() => void lockVault()}
          theme={theme}
          onToggleTheme={() => setTheme((t) => toggleTheme(t))}
          onCollapse={() => panels.setLeftOpen(false)}
        />
      }
      center={
        <main className="main">
          <SessionTabBar
            tabs={tabs}
            activeId={activeId}
            onSelect={setActiveId}
            onClose={(id) => void closeTab(id)}
            onNew={() => void createLocalTab()}
            onReconnect={(id) => void reconnect(id)}
          />
          <div className="terminal-stack">
            {!tabs.length && (
              <div className="empty-terminal">
                <BrandLogo size={52} />
                <p>Pick a profile on the left, or open a local PowerShell session.</p>
                <button type="button" onClick={() => void createLocalTab()}>
                  New PowerShell
                </button>
              </div>
            )}
            {tabs.map(
              (t) =>
                t.ptyId && (
                  <TerminalPane
                    key={t.ptyId}
                    ptyId={t.ptyId}
                    active={t.id === activeId}
                    theme={theme}
                  />
                ),
            )}
          </div>
        </main>
      }
      right={
        <SftpPanel
          profileId={activeTab?.profileId ?? null}
          ptyId={activeTab?.ptyId ?? null}
          open
          onToggle={() => panels.setRightOpen(false)}
          theme={theme}
        />
      }
    />
    </>
  );
}
