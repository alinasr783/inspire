export const THEME_COLORS = [
  { id: "green", color: "#06c167", label: "Green" },
  { id: "blue", color: "#276ef1", label: "Blue" },
  { id: "purple", color: "#8b5cf6", label: "Purple" },
  { id: "orange", color: "#f59e0b", label: "Orange" },
  { id: "red", color: "#ef4444", label: "Red" },
  { id: "teal", color: "#06b6d4", label: "Teal" },
  { id: "pink", color: "#ec4899", label: "Pink" },
] as const;

export type ThemeColorId = (typeof THEME_COLORS)[number]["id"];

export function applyThemeColor(hex: string) {
  const root = document.documentElement;
  root.style.setProperty("--primary", hex);
  root.style.setProperty("--ring", hex);
  root.style.setProperty("--sidebar-primary", hex);
  root.style.setProperty("--sidebar-ring", hex);
  root.style.setProperty("--chart-1", hex);
}
