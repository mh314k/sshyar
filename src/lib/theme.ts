export type ThemeMode = "dark" | "light";

const STORAGE_KEY = "sshyar-theme";

export function readStoredTheme(): ThemeMode {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "light" || v === "dark") return v;
  } catch {
    /* ignore */
  }
  return "dark";
}

export function applyTheme(theme: ThemeMode) {
  document.documentElement.setAttribute("data-theme", theme);
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* ignore */
  }
}

export function toggleTheme(current: ThemeMode): ThemeMode {
  const next = current === "dark" ? "light" : "dark";
  applyTheme(next);
  return next;
}

export const terminalThemes = {
  dark: {
    background: "#121820",
    foreground: "#e8eef7",
    cursor: "#45d0bd",
    selectionBackground: "#2c3648",
  },
  light: {
    background: "#f7f9fc",
    foreground: "#132033",
    cursor: "#0f766e",
    selectionBackground: "#c5ceda",
  },
} as const;
