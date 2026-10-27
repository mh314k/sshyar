import { useCallback, useEffect, useMemo, useState } from "react";
import {
  anyPluginEnabled,
  firstEnabledTab,
  type PluginFlags,
  type PluginTab,
} from "../features/plugins/RightPlugins";
import type { Profile } from "../types";
import type { PanelLayoutApi } from "./usePanelLayout";

interface Options {
  profiles: Profile[];
  activeProfileId: string | null | undefined;
  panels: Pick<PanelLayoutApi, "rightOpen" | "setRightOpen">;
}

export function usePluginShell({ profiles, activeProfileId, panels }: Options) {
  const [pluginTab, setPluginTab] = useState<PluginTab>("docker");

  const pluginFlags: PluginFlags = useMemo(() => {
    const p = profiles.find((x) => x.id === activeProfileId);
    const on = !!activeProfileId && !!p;
    return {
      docker: on && !!p?.dockerManagement,
      nginx: on && !!p?.nginxManagement,
      systemd: on && !!p?.systemdManagement,
      cron: on && !!p?.cronManagement,
      monitor: on && !!p?.monitorManagement,
    };
  }, [profiles, activeProfileId]);

  const rightAvailable = anyPluginEnabled(pluginFlags);
  const activePluginTab = pluginFlags[pluginTab]
    ? pluginTab
    : (firstEnabledTab(pluginFlags) ?? "docker");

  useEffect(() => {
    if (!rightAvailable && panels.rightOpen) {
      panels.setRightOpen(false);
    }
  }, [rightAvailable, panels.rightOpen, panels.setRightOpen]);

  useEffect(() => {
    if (pluginFlags[pluginTab]) return;
    const first = firstEnabledTab(pluginFlags);
    if (first) setPluginTab(first);
  }, [pluginFlags, pluginTab]);

  const selectPlugin = useCallback(
    (tab: PluginTab) => {
      if (panels.rightOpen && pluginTab === tab) {
        panels.setRightOpen(false);
        return;
      }
      setPluginTab(tab);
      panels.setRightOpen(true);
    },
    [panels, pluginTab],
  );

  const openFirstPluginOrToggle = useCallback(() => {
    if (!rightAvailable) return;
    if (panels.rightOpen) {
      panels.setRightOpen(false);
      return;
    }
    const first = firstEnabledTab(pluginFlags);
    if (first) setPluginTab(first);
    panels.setRightOpen(true);
  }, [rightAvailable, panels, pluginFlags]);

  return {
    pluginTab,
    setPluginTab,
    pluginFlags,
    rightAvailable,
    activePluginTab,
    selectPlugin,
    openFirstPluginOrToggle,
  };
}
