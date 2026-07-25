const PREFIX = "inspire_cw";

function key(table: string, userId: string) {
  return `${PREFIX}_${table}_${userId}`;
}

export function loadColumnWidths(
  table: string,
  userId: string,
  defaults: Record<string, number>
): Record<string, number> {
  try {
    const raw = localStorage.getItem(key(table, userId));
    if (raw) {
      const saved = JSON.parse(raw) as Record<string, number>;
      const merged = { ...defaults };
      for (const [k, v] of Object.entries(saved)) {
        if (typeof v === "number" && v >= 50) merged[k] = v;
      }
      return merged;
    }
  } catch {}
  return defaults;
}

export function saveColumnWidths(
  table: string,
  userId: string,
  widths: Record<string, number>
) {
  try {
    localStorage.setItem(key(table, userId), JSON.stringify(widths));
  } catch {}
}
