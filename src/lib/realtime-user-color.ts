const CURSOR_COLORS = [
  "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4",
  "#FFEAA7", "#DDA0DD", "#98D8C8", "#F7DC6F",
  "#BB8FCE", "#85C1E9", "#F8C471", "#82E0AA",
  "#E57373", "#64B5F6", "#81C784", "#FFB74D",
  "#BA68C8", "#4DB6AC", "#FF8A65", "#A1887F",
];

export function getUserColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return CURSOR_COLORS[Math.abs(hash) % CURSOR_COLORS.length];
}

export function getUserInitials(firstName?: string, secondName?: string): string {
  const first = firstName?.charAt(0)?.toUpperCase() ?? "";
  const second = secondName?.charAt(0)?.toUpperCase() ?? "";
  return `${first}${second}` || "??";
}
