import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { api } from "./lib/api";
import { UnlockGate } from "./features/chrome/UnlockGate";
import { AppTitleChrome } from "./features/chrome/AppTitleChrome";
import { ProfileSidebar } from "./features/profiles/ProfileSidebar";
import { SessionTabBar } from "./features/terminal/SessionTabBar";
import { TerminalPane } from "./features/terminal/TerminalPane";
import { RightPlugins } from "./features/plugins/RightPlugins";
import { PanelLayout } from "./features/chrome/PanelLayout";
import { MainSplit } from "./features/chrome/MainSplit";
import { SftpPanel } from "./features/sftp";
import { MenuBar, type MenuBarAction } from "./features/chrome/MenuBar";
import { ActivityBar } from "./features/chrome/ActivityBar";
import { StatusBar } from "./features/chrome/StatusBar";
import { HelpWindow } from "./features/chrome/HelpWindow";
import { AboutPopover } from "./features/chrome/AboutPopover";
import { UpdateNotifier } from "./features/chrome/UpdateNotifier";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { DockerJobProvider } from "./features/plugins/docker/dockerJob/DockerJobContext";
import { readStoredTheme, toggleTheme, type ThemeMode } from "./lib/theme";
import { DialogHost } from "./lib/dialogs";
import {
  clearSessionSnapshot,
  filterRestorableTabs,
  readSessionSnapshot,
  type SavedSessionTab,
} from "./lib/sessionRestore";
import { ToastHost, toastError } from "./lib/toast";
import { BrandLogo } from "./features/chrome/BrandLogo";
import {
  APP_VERSION,
  checkForAppUpdate,
  isUpdateToastMuted,
  muteUpdateToast,
  type UpdateInfo,
} from "./lib/version";
import type { Profile } from "./types";
import { useAppSessions } from "./hooks/useAppSessions";
import { useAppUpdate } from "./hooks/useAppUpdate";
import { usePanelLayout } from "./hooks/usePanelLayout";
import { usePluginShell } from "./hooks/usePluginShell";
import { useVaultData } from "./hooks/useVaultData";
import "./App.css";

export default function App() {
  const [theme, setTheme] = useState<ThemeMode>(() => readStoredTheme());
  const [restoreOffer, setRestoreOffer] = useState<SavedSessionTab[] | null>(null);
  const [restoreBusy, setRestoreBusy] = useState(false);
  const [sftpJumpPath, setSftpJumpPath] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [update, setUpdate] = useState<UpdateInfo | null>(null);
  const [updateNoticeOpen, setUpdateNoticeOpen] = useState(false);
  const updateNoticeShown = useRef(false);
  const appUpdate = useAppUpdate(update);

  const panels = usePanelLayout();
  const killAllTabsRef = useRef<() => void>(() => undefined);

  const { vault, setVault, profiles, snippets, bootError, refreshData, lockVault } = useVaultData({
    killAllTabs: () => killAllTabsRef.current(),
    onLocked: () => {
      panels.setRightOpen(false);
      panels.setBottomOpen(false);
    },
  });

  const sessions = useAppSessions({
    profiles,
    onOpenSftp: () => panels.openSftpPane(),
  });
  killAllTabsRef.current = sessions.killAllTabs;

  useEffect(() => {
    if (!vault?.unlocked) return;
    let cancelled = false;
    void (async () => {
      try {
        const info = await checkForAppUpdate();
        if (cancelled || !info) return;
        setUpdate(info);
        if (updateNoticeShown.current || isUpdateToastMuted(info.latest)) return;
        updateNoticeShown.current = true;
        setUpdateNoticeOpen(true);
      } catch {
        /* offline / rate-limit — ignore; About can retry */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [vault?.unlocked]);

  // Sticky notice also appears when download finishes (even if user closed the banner earlier).
  useEffect(() => {
    if (appUpdate.state.phase === "ready" && update && !isUpdateToastMuted(update.latest)) {
      setUpdateNoticeOpen(true);
    }
  }, [appUpdate.state.phase, update]);

  const {
    pluginFlags,
    rightAvailable,
    activePluginTab,
    selectPlugin,
    openFirstPluginOrToggle,
  } = usePluginShell({
    profiles,
    activeProfileId: sessions.activeTab?.profileId,
    panels,
  });

  const profileIdSet = useMemo(() => new Set(profiles.map((p) => p.id)), [profiles]);
  const sftpOpen = panels.mainLayoutMode === "sftp-first" || panels.bottomOpen;

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
          if (vault?.hasMasterPassword) void lockVault();
          break;
        case "toggle-sidebar":
          panels.setLeftOpen(!panels.leftOpen);
          break;
        case "toggle-sftp":
          panels.toggleSftpPane();
          break;
        case "toggle-plugins":
          openFirstPluginOrToggle();
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
        case "exit":
          void getCurrentWindow()
            .close()
            .catch(() => undefined);
          break;
      }
    },
    [
      sessions.createLocalTab,
      lockVault,
      panels,
      openFirstPluginOrToggle,
      vault?.hasMasterPassword,
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
        <div className="unlock-shell">
          <AppTitleChrome />
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
        </div>
      </>
    );
  }

  if (!vault) {
    return (
      <>
        {hosts}
        <div className="unlock-shell">
          <AppTitleChrome />
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
      <HelpWindow open={helpOpen} onClose={() => setHelpOpen(false)} />
      {update && updateNoticeOpen ? (
        <UpdateNotifier
          info={update}
          download={appUpdate.state}
          onDownload={() => void appUpdate.startDownload()}
          onInstall={() => void appUpdate.install()}
          onClose={() => setUpdateNoticeOpen(false)}
          onDontShowAgain={() => {
            muteUpdateToast(update.latest);
            setUpdateNoticeOpen(false);
          }}
        />
      ) : null}
      {aboutOpen ? (
        <div
          className="chrome-modal-backdrop"
          onClick={() => setAboutOpen(false)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setAboutOpen(false);
          }}
        >
          <div
            className="chrome-modal chrome-modal-about"
            role="dialog"
            aria-label="About SSHyar"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="chrome-modal-header">
              <span>About SSHyar</span>
              <button type="button" className="ghost" onClick={() => setAboutOpen(false)}>
                Close
              </button>
            </div>
            <AboutPopover
              update={update}
              onUpdateChange={setUpdate}
              download={appUpdate.state}
              onDownload={() => void appUpdate.startDownload()}
              onInstall={() => void appUpdate.install()}
            />
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
                hasMasterPassword={vault.hasMasterPassword}
                hasUpdate={Boolean(update)}
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
                plugins={pluginFlags}
                activePlugin={activePluginTab}
                theme={theme}
                onToggleLeft={() => panels.setLeftOpen(!panels.leftOpen)}
                onToggleSftp={() => panels.toggleSftpPane()}
                onSelectPlugin={selectPlugin}
                onToggleTheme={() => setTheme((t) => toggleTheme(t))}
                onHelp={() => setHelpOpen(true)}
                onLock={() => void lockVault()}
                hasMasterPassword={vault.hasMasterPassword}
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
                onConnect={(p: Profile) => void sessions.createLocalTab(p)}
                onExternal={(p: Profile) => void api.openExternalSsh(p.id)}
                onRunSnippet={(c: string) => void sessions.runSnippet(c)}
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
                    onClose={(id: string) => void sessions.closeTab(id)}
                    onNew={() => void sessions.createLocalTab()}
                    onReconnect={(id: string) => void sessions.reconnect(id)}
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
                              open={sftpOpen && isActive}
                              onToggle={() => panels.toggleSftpPane()}
                              theme={theme}
                              showChrome={false}
                              dockerEnabled={!!profile?.dockerManagement}
                              remoteShell={profile?.remoteShell}
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
                activeTab={activePluginTab}
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
