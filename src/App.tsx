import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "./lib/api";
import type { Profile, Snippet, VaultStatus } from "./types";
import { UnlockGate } from "./components/UnlockGate";
import { ProfileSidebar } from "./components/ProfileSidebar";
import { SessionTabBar } from "./components/SessionTabBar";
import { TerminalPane } from "./components/TerminalPane";
import { RightPlugins } from "./components/RightPlugins";
import { PanelLayout, usePanelLayout } from "./components/PanelLayout";
import { readStoredTheme, toggleTheme, type ThemeMode } from "./lib/theme";
import { DialogHost } from "./lib/dialogs";
import {
  clearSessionSnapshot,
  filterRestorableTabs,
  readSessionSnapshot,
  type SavedSessionTab,
} from "./lib/sessionRestore";
import { ToastHost, toastError } from "./lib/toast";
import { BrandLogo } from "./components/BrandLogo";
import { APP_VERSION } from "./lib/version";
import { useAppSessions } from "./hooks/useAppSessions";
import "./App.css";

export default function App() {
  const [vault, setVault] = useState<VaultStatus | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [bootError, setBootError] = useState("");
  const [theme, setTheme] = useState<ThemeMode>(() => readStoredTheme());
  const [restoreOffer, setRestoreOffer] = useState<SavedSessionTab[] | null>(null);
  const [restoreBusy, setRestoreBusy] = useState(false);
  const panels = usePanelLayout();

  const sessions = useAppSessions({
    profiles,
    onOpenSftp: () => panels.setRightOpen(true),
  });

  const profileIdSet = useMemo(() => new Set(profiles.map((p) => p.id)), [profiles]);

  useEffect(() => {
    if (!vault?.unlocked || sessions.tabs.length > 0) return;
    const snap = readSessionSnapshot();
    if (!snap?.tabs.length) {
      setRestoreOffer(null);
      return;
    }
    const restorable = filterRestorableTabs(snap, profileIdSet);
    setRestoreOffer(restorable.length ? restorable : null);
  }, [vault?.unlocked, profiles, profileIdSet, sessions.tabs.length]);

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
      sessions.killAllTabs();
      setProfiles([]);
      setSnippets([]);
      panels.setRightOpen(false);
      await api.vaultLock();
      setVault(await api.vaultStatus());
    } catch (e) {
      toastError(e, "Lock vault");
    }
  }, [sessions.killAllTabs, panels.setRightOpen]);

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
              <div className="brand-text">
                <h1>SSHyar</h1>
                <span className="brand-version">v{APP_VERSION}</span>
              </div>
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
              <div className="brand-text">
                <h1>SSHyar</h1>
                <span className="brand-version">v{APP_VERSION}</span>
              </div>
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
            onConnect={(p) => void sessions.createLocalTab(p)}
            onExternal={(p) => void api.openExternalSsh(p.id)}
            onRunSnippet={(c) => void sessions.runSnippet(c)}
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
              tabs={sessions.tabs}
              activeId={sessions.activeId}
              onSelect={sessions.setActiveId}
              onClose={(id) => void sessions.closeTab(id)}
              onNew={() => void sessions.createLocalTab()}
              onReconnect={(id) => void sessions.reconnect(id)}
            />
            <div className="terminal-stack">
              {!sessions.tabs.length && (
                <div className="empty-terminal">
                  <BrandLogo size={52} />
                  <p>Pick a profile on the left, or open a local terminal session.</p>
                  <div className="empty-terminal-actions">
                    <button type="button" onClick={() => void sessions.createLocalTab()}>
                      New Terminal
                    </button>
                    {restoreOffer?.length ? (
                      <>
                        <button
                          type="button"
                          className="ghost"
                          disabled={restoreBusy}
                          onClick={() => {
                            setRestoreBusy(true);
                            void sessions
                              .restoreTabs(restoreOffer)
                              .catch((e) => toastError(e, "Restore sessions"))
                              .finally(() => {
                                setRestoreBusy(false);
                                setRestoreOffer(null);
                              });
                          }}
                        >
                          {restoreBusy
                            ? "Restoring…"
                            : `Restore previous (${restoreOffer.length})`}
                        </button>
                        <button
                          type="button"
                          className="ghost"
                          disabled={restoreBusy}
                          onClick={() => {
                            clearSessionSnapshot();
                            setRestoreOffer(null);
                          }}
                        >
                          Dismiss
                        </button>
                      </>
                    ) : null}
                  </div>
                  {restoreOffer?.length ? (
                    <p className="muted empty-terminal-hint">
                      Last session:{" "}
                      {restoreOffer
                        .slice(0, 4)
                        .map((t) => t.title)
                        .join(", ")}
                      {restoreOffer.length > 4 ? "…" : ""}
                    </p>
                  ) : null}
                </div>
              )}
              {sessions.tabs.map(
                (t) =>
                  t.ptyId && (
                    <TerminalPane
                      key={t.ptyId}
                      ptyId={t.ptyId}
                      active={t.id === sessions.activeId}
                      theme={theme}
                      onConnected={() => {
                        if (t.profileId) sessions.setTabStatus(t.id, "connected");
                      }}
                      onDisconnected={() => {
                        if (t.profileId) sessions.setTabStatus(t.id, "disconnected");
                      }}
                    />
                  ),
              )}
            </div>
          </main>
        }
        right={
          <RightPlugins
            profileId={sessions.activeTab?.profileId ?? null}
            ptyId={sessions.activeTab?.ptyId ?? null}
            dockerEnabled={
              !!sessions.activeTab?.profileId &&
              (profiles.find((p) => p.id === sessions.activeTab?.profileId)?.dockerManagement ??
                false)
            }
            onToggle={() => panels.setRightOpen(false)}
            theme={theme}
          />
        }
      />
    </>
  );
}
