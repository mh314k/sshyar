import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "./lib/api";
import type { Profile, Snippet, VaultStatus } from "./types";
import { UnlockGate } from "./components/UnlockGate";
import { ProfileSidebar } from "./components/ProfileSidebar";
import { SessionTabBar } from "./components/SessionTabBar";
import { TerminalPane } from "./components/TerminalPane";
import { RightPlugins, anyPluginEnabled } from "./components/RightPlugins";
import { PanelLayout, usePanelLayout } from "./components/PanelLayout";
import { MainSplit } from "./components/MainSplit";
import { SftpPanel } from "./components/SftpPanel";
import { MenuBar, type MenuBarAction } from "./components/MenuBar";
import { ActivityBar } from "./components/ActivityBar";
import { StatusBar } from "./components/StatusBar";
import { HelpModal } from "./components/HelpModal";
import { AboutPopover } from "./components/AboutPopover";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { DockerJobProvider } from "./components/dockerJob/DockerJobContext";
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
import { APP_VERSION, type UpdateInfo } from "./lib/version";
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
  const [sftpJumpPath, setSftpJumpPath] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [update, setUpdate] = useState<UpdateInfo | null>(null);
  const panels = usePanelLayout();

  const sessions = useAppSessions({
    profiles,
    onOpenSftp: () => panels.openSftpPane(),
  });

  const profileIdSet = useMemo(() => new Set(profiles.map((p) => p.id)), [profiles]);

  const pluginFlags = useMemo(() => {
    const p = profiles.find((x) => x.id === sessions.activeTab?.profileId);
    const on = !!sessions.activeTab?.profileId && !!p;
    return {
      docker: on && !!p?.dockerManagement,
      nginx: on && !!p?.nginxManagement,
      systemd: on && !!p?.systemdManagement,
      cron: on && !!p?.cronManagement,
    };
  }, [profiles, sessions.activeTab?.profileId]);

  const rightAvailable = anyPluginEnabled(pluginFlags);
  const sftpOpen = panels.mainLayoutMode === "sftp-first" || panels.bottomOpen;

  useEffect(() => {
    if (!rightAvailable && panels.rightOpen) {
      panels.setRightOpen(false);
    }
  }, [rightAvailable, panels.rightOpen, panels.setRightOpen]);

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
      panels.setBottomOpen(false);
      await api.vaultLock();
      setVault(await api.vaultStatus());
    } catch (e) {
      toastError(e, "Lock vault");
    }
  }, [sessions.killAllTabs, panels.setRightOpen, panels.setBottomOpen]);

  const openComposeInSftp = useCallback(
    (path: string) => {
      const normalized = path.trim().replace(/\/+$/, "") || "/";
      setSftpJumpPath(normalized);
      panels.openSftpPane();
    },
    [panels.openSftpPane],
  );

  const handleMenuAction = useCallback(
    (action: MenuBarAction) => {
      switch (action) {
        case "new-terminal":
          void sessions.createLocalTab();
          break;
        case "lock":
          void lockVault();
          break;
        case "toggle-sidebar":
          panels.setLeftOpen(!panels.leftOpen);
          break;
        case "toggle-sftp":
          panels.toggleBottomOpen();
          break;
        case "toggle-plugins":
          if (rightAvailable) panels.setRightOpen(!panels.rightOpen);
          break;
        case "switch-layout":
          panels.toggleMainLayoutMode();
          break;
        case "toggle-theme":
          setTheme((t) => toggleTheme(t));
          break;
        case "help":
          setHelpOpen(true);
          break;
        case "about":
          setAboutOpen(true);
          break;
      }
    },
    [
      sessions.createLocalTab,
      lockVault,
      panels,
      rightAvailable,
    ],
  );

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

  const terminalArea = (
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
                  {restoreBusy ? "Restoring…" : `Restore previous (${restoreOffer.length})`}
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
  );

  return (
    <>
      {hosts}
      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
      {aboutOpen ? (
        <div
          className="chrome-modal-backdrop"
          onClick={() => setAboutOpen(false)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setAboutOpen(false);
          }}
        >
          <div
            className="chrome-modal"
            role="dialog"
            aria-label="About SSHyar"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="popover-header chrome-modal-header">
              <span>About</span>
              <button type="button" className="ghost" onClick={() => setAboutOpen(false)}>
                Close
              </button>
            </div>
            <AboutPopover update={update} onUpdateChange={setUpdate} />
          </div>
        </div>
      ) : null}
      <ErrorBoundary>
      <DockerJobProvider>
      <PanelLayout
        leftOpen={panels.leftOpen}
        rightOpen={panels.rightOpen}
        rightAvailable={rightAvailable}
        leftWidth={panels.leftWidth}
        rightWidth={panels.rightWidth}
        onLeftWidthChange={panels.setLeftWidth}
        onRightWidthChange={panels.setRightWidth}
        menuBar={
          <MenuBar
            onAction={handleMenuAction}
            pluginsAvailable={rightAvailable}
            layoutModeLabel={
              panels.mainLayoutMode === "sftp-first" ? "SFTP first" : "Terminal first"
            }
            themeLabel={theme === "dark" ? "Switch to Light Theme" : "Switch to Dark Theme"}
            brand={
              <>
                <BrandLogo size={16} />
                <span className="menu-bar-brand-name">SSHyar</span>
              </>
            }
          />
        }
        activityBar={
          <ActivityBar
            leftOpen={panels.leftOpen}
            sftpOpen={sftpOpen}
            rightOpen={panels.rightOpen}
            rightAvailable={rightAvailable}
            theme={theme}
            onToggleLeft={() => panels.setLeftOpen(!panels.leftOpen)}
            onToggleSftp={() => panels.toggleBottomOpen()}
            onToggleRight={() => {
              if (rightAvailable) panels.setRightOpen(!panels.rightOpen);
            }}
            onToggleTheme={() => setTheme((t) => toggleTheme(t))}
            onHelp={() => setHelpOpen(true)}
            onLock={() => void lockVault()}
          />
        }
        statusBar={
          <StatusBar
            status={sessions.activeTab?.status ?? null}
            title={sessions.activeTab?.title ?? null}
            hostLabel={sessions.activeTab?.hostLabel ?? null}
            tabCount={sessions.tabs.length}
            layoutMode={panels.mainLayoutMode}
          />
        }
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
            onCollapse={() => panels.setLeftOpen(false)}
          />
        }
        center={
          <MainSplit
            mode={panels.mainLayoutMode}
            centerSplit={panels.centerSplit}
            bottomOpen={panels.bottomOpen}
            onModeChange={panels.setMainLayoutMode}
            onCenterSplitChange={panels.setCenterSplit}
            onBottomOpenChange={panels.setBottomOpen}
            header={
              <SessionTabBar
                embedded
                tabs={sessions.tabs}
                activeId={sessions.activeId}
                onSelect={sessions.setActiveId}
                onClose={(id) => void sessions.closeTab(id)}
                onNew={() => void sessions.createLocalTab()}
                onReconnect={(id) => void sessions.reconnect(id)}
              />
            }
            terminal={terminalArea}
            sftp={
              <div className="sftp-stack">
                {sessions.tabs.map((t) => {
                  if (!t.profileId) return null;
                  const profile = profiles.find((p) => p.id === t.profileId);
                  const isActive = t.id === sessions.activeId;
                  return (
                    <div
                      key={t.id}
                      className={`sftp-stack-item ${isActive ? "is-active" : "is-hidden"}`}
                      aria-hidden={!isActive}
                    >
                      <ErrorBoundary>
                        <SftpPanel
                          profileId={t.profileId}
                          ptyId={t.ptyId ?? null}
                          open={sftpOpen}
                          onToggle={() => panels.setBottomOpen(false)}
                          theme={theme}
                          showChrome={false}
                          dockerEnabled={!!profile?.dockerManagement}
                          jumpPath={isActive ? sftpJumpPath : null}
                          onJumpPathConsumed={() => setSftpJumpPath(null)}
                        />
                      </ErrorBoundary>
                    </div>
                  );
                })}
                {sftpOpen && !sessions.activeTab?.profileId ? (
                  <p className="muted sftp-empty">
                    Connect a profile session to browse remote files here.
                  </p>
                ) : null}
              </div>
            }
          />
        }
        right={
          <RightPlugins
            profileId={sessions.activeTab?.profileId ?? null}
            ptyId={sessions.activeTab?.ptyId ?? null}
            plugins={pluginFlags}
            onToggle={() => panels.setRightOpen(false)}
            onOpenComposeInSftp={openComposeInSftp}
          />
        }
      />
      </DockerJobProvider>
      </ErrorBoundary>
    </>
  );
}
