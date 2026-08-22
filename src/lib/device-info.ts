export interface DeviceInfo {
  /** Battery level as an integer percentage (0–100), or null when unavailable. */
  battery: number | null;
  /** A friendly device name, e.g. "Windows · Chrome". */
  deviceName: string;
  /** Full operating system description, e.g. "Windows 10 (10.0.19045)". */
  os: string;
  /** Effective network type, e.g. "wifi", "4g", "3g", "2g" or "" when unknown. */
  networkType: string;
  /** IANA timezone, e.g. "Africa/Cairo". */
  timezone: string;
  /** Browser locale, e.g. "ar-EG". */
  language: string;
  /** Device memory in GB (Chrome only), or null when unavailable. */
  memory: number | null;
}

function detectOS(ua: string): string {
  if (/windows nt 11/i.test(ua)) return "Windows 11";
  if (/windows nt 10/i.test(ua)) return "Windows 10";
  if (/windows nt 6\.3/i.test(ua)) return "Windows 8.1";
  if (/windows nt 6\.1/i.test(ua)) return "Windows 7";
  if (/android (\d+)/i.test(ua)) return `Android ${ua.match(/android (\d+)/i)?.[1] ?? ""}`;
  if (/iphone/i.test(ua)) return "iPhone iOS";
  if (/ipad/i.test(ua)) return "iPad iOS";
  if (/ipod/i.test(ua)) return "iPod iOS";
  if (/mac os x (\d+[_.]\d+)/i.test(ua)) {
    const v = (ua.match(/mac os x (\d+[_.]\d+)/i)?.[1] ?? "").replace(/_/g, ".");
    return `macOS ${v}`;
  }
  if (/linux/i.test(ua)) return "Linux";
  return "";
}

function detectBrowser(ua: string): string {
  if (/edg\//i.test(ua)) return "Edge";
  if (/opr\//i.test(ua) || /opera/i.test(ua)) return "Opera";
  if (/samsungbrowser/i.test(ua)) return "Samsung Internet";
  if (/firefox\//i.test(ua)) return "Firefox";
  if (/chrome\//i.test(ua)) return "Chrome";
  if (/safari\//i.test(ua)) return "Safari";
  return "";
}

function detectDeviceName(ua: string): string {
  const os = detectOS(ua);
  const browser = detectBrowser(ua);
  return [os, browser].filter(Boolean).join(" · ") || "Unknown device";
}

function detectNetworkType(): string {
  try {
    const conn = (
      navigator as Navigator & {
        connection?: { effectiveType?: string };
      }
    ).connection;
    return conn?.effectiveType ?? "";
  } catch {
    return "";
  }
}

/**
 * Captures device & environment metadata: battery level, friendly device name,
 * full OS, network type, timezone, locale and available memory. Every field
 * degrades gracefully (empty string / null) when the browser doesn't expose it.
 */
export async function getDeviceInfo(): Promise<DeviceInfo> {
  let battery: number | null = null;
  try {
    const nav = navigator as Navigator & {
      getBattery?: () => Promise<{ level: number }>;
    };
    if (typeof nav.getBattery === "function") {
      const bm = await nav.getBattery();
      battery = Math.max(0, Math.min(100, Math.round(bm.level * 100)));
    }
  } catch {
    battery = null;
  }

  let memory: number | null = null;
  try {
    const dm = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
    if (typeof dm === "number") memory = dm;
  } catch {
    memory = null;
  }

  let timezone = "";
  try {
    timezone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
  } catch {
    timezone = "";
  }

  const ua = typeof navigator !== "undefined" ? navigator.userAgent || "" : "";
  const os = detectOS(ua);

  return {
    battery,
    deviceName: detectDeviceName(ua),
    os,
    networkType: detectNetworkType(),
    timezone,
    language: typeof navigator !== "undefined" ? navigator.language || "" : "",
    memory,
  };
}
