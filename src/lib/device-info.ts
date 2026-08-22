export interface DeviceInfo {
  battery: number | null;
  charging: boolean | null;
  deviceName: string;
  os: string;
  browser: string;
  browserVersion: string;
  deviceType: "mobile" | "tablet" | "desktop" | "";
  platform: string;
  screen: string;
  viewport: string;
  dpr: number | null;
  colorDepth: number | null;
  cpuCores: number | null;
  memory: number | null;
  networkType: string;
  downlink: number | null;
  rtt: number | null;
  saveData: boolean | null;
  online: boolean;
  timezone: string;
  language: string;
  maxTouchPoints: number;
  cookiesEnabled: boolean;
  orientation: string;
  vibrationSupported: boolean;
}

/** Triggers haptic feedback on devices that support the Vibration API. */
export function triggerVibration(pattern: number | number[] = [30, 50, 30]): void {
  try {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate(pattern);
    }
  } catch {
    // vibration is best-effort
  }
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

function detectBrowser(ua: string): { name: string; version: string } {
  let name = "";
  let version = "";
  if (/edg\//i.test(ua)) {
    name = "Edge";
    version = ua.match(/edg\/([\d.]+)/i)?.[1] ?? "";
  } else if (/opr\//i.test(ua) || /opera/i.test(ua)) {
    name = "Opera";
    version = (ua.match(/opr\/([\d.]+)/i) || ua.match(/opera\/([\d.]+)/i))?.[1] ?? "";
  } else if (/samsungbrowser/i.test(ua)) {
    name = "Samsung Internet";
    version = ua.match(/samsungbrowser\/([\d.]+)/i)?.[1] ?? "";
  } else if (/firefox\//i.test(ua)) {
    name = "Firefox";
    version = ua.match(/firefox\/([\d.]+)/i)?.[1] ?? "";
  } else if (/chrome\//i.test(ua)) {
    name = "Chrome";
    version = ua.match(/chrome\/([\d.]+)/i)?.[1] ?? "";
  } else if (/safari\//i.test(ua)) {
    name = "Safari";
    version = ua.match(/version\/([\d.]+)/i)?.[1] ?? "";
  }
  return { name, version };
}

function detectDeviceType(ua: string, mobileFlag?: boolean): "mobile" | "tablet" | "desktop" | "" {
  if (mobileFlag !== undefined) return mobileFlag ? "mobile" : "desktop";
  if (/ipad|tablet/i.test(ua)) return "tablet";
  if (/android/i.test(ua)) {
    return /mobile/i.test(ua) ? "mobile" : "tablet";
  }
  if (/iphone|ipod/i.test(ua)) return "mobile";
  return "desktop";
}

function detectDeviceName(ua: string, os: string, browser: string): string {
  return [os, browser].filter(Boolean).join(" · ") || "Unknown device";
}

/**
 * Captures a comprehensive set of device & environment metadata. Every field
 * degrades gracefully (empty string / null) when the browser doesn't expose it.
 */
export async function getDeviceInfo(): Promise<DeviceInfo> {
  let battery: number | null = null;
  let charging: boolean | null = null;
  try {
    const nav = navigator as Navigator & {
      getBattery?: () => Promise<{ level: number; charging: boolean }>;
    };
    if (typeof nav.getBattery === "function") {
      const bm = await nav.getBattery();
      battery = Math.max(0, Math.min(100, Math.round(bm.level * 100)));
      charging = bm.charging;
    }
  } catch {
    battery = null;
    charging = null;
  }

  let memory: number | null = null;
  try {
    const dm = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
    if (typeof dm === "number") memory = dm;
  } catch {
    memory = null;
  }

  let cpuCores: number | null = null;
  try {
    const hc = navigator.hardwareConcurrency;
    if (typeof hc === "number") cpuCores = hc;
  } catch {
    cpuCores = null;
  }

  let networkType = "";
  let downlink: number | null = null;
  let rtt: number | null = null;
  let saveData: boolean | null = null;
  try {
    const conn = (
      navigator as Navigator & {
        connection?: {
          effectiveType?: string;
          downlink?: number;
          rtt?: number;
          saveData?: boolean;
        };
      }
    ).connection;
    networkType = conn?.effectiveType ?? "";
    if (typeof conn?.downlink === "number") downlink = conn.downlink;
    if (typeof conn?.rtt === "number") rtt = conn.rtt;
    if (typeof conn?.saveData === "boolean") saveData = conn.saveData;
  } catch {
    networkType = "";
  }

  let timezone = "";
  try {
    timezone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
  } catch {
    timezone = "";
  }

  let platform = "";
  try {
    platform = (navigator as Navigator & { userAgentData?: { platform?: string } })
      .userAgentData?.platform ?? "";
  } catch {
    platform = "";
  }
  if (!platform) {
    try {
      platform = navigator.platform ?? "";
    } catch {
      platform = "";
    }
  }

  const ua = typeof navigator !== "undefined" ? navigator.userAgent || "" : "";
  const os = detectOS(ua);
  const { name: browser, version: browserVersion } = detectBrowser(ua);

  let deviceType: "mobile" | "tablet" | "desktop" | "" = "";
  try {
    const mobileFlag = (navigator as Navigator & { userAgentData?: { mobile?: boolean } })
      .userAgentData?.mobile;
    deviceType = detectDeviceType(ua, mobileFlag);
  } catch {
    deviceType = detectDeviceType(ua);
  }

  let screen = "";
  let colorDepth: number | null = null;
  try {
    if (typeof window !== "undefined" && window.screen) {
      screen = `${window.screen.width}x${window.screen.height}`;
      colorDepth = window.screen.colorDepth ?? null;
    }
  } catch {
    screen = "";
  }

  let viewport = "";
  let dpr: number | null = null;
  try {
    viewport = `${window.innerWidth}x${window.innerHeight}`;
    dpr = window.devicePixelRatio ?? null;
  } catch {
    viewport = "";
  }

  let maxTouchPoints = 0;
  try {
    maxTouchPoints = navigator.maxTouchPoints ?? 0;
  } catch {
    maxTouchPoints = 0;
  }

  let cookiesEnabled = false;
  try {
    cookiesEnabled = document.cookie !== "" || navigator.cookieEnabled === true;
  } catch {
    cookiesEnabled = false;
  }

  let online = false;
  try {
    online = navigator.onLine === true;
  } catch {
    online = false;
  }

  let orientation = "";
  try {
    if (typeof window !== "undefined" && window.screen) {
      orientation =
        (window.screen as Screen & { orientation?: { type?: string } }).orientation?.type ?? "";
    }
  } catch {
    orientation = "";
  }

  let vibrationSupported = false;
  try {
    vibrationSupported = typeof navigator.vibrate === "function";
  } catch {
    vibrationSupported = false;
  }

  return {
    battery,
    charging,
    deviceName: detectDeviceName(ua, os, browser),
    os,
    browser,
    browserVersion,
    deviceType,
    platform,
    screen,
    viewport,
    dpr,
    colorDepth,
    cpuCores,
    memory,
    networkType,
    downlink,
    rtt,
    saveData,
    online,
    timezone,
    language: typeof navigator !== "undefined" ? navigator.language || "" : "",
    maxTouchPoints,
    cookiesEnabled,
    orientation,
    vibrationSupported,
  };
}

/**
 * Maps the captured DeviceInfo into a flat metadata object (snake_case keys)
 * ready to be stored in the `check_in_meta` / `check_out_meta` JSONB columns.
 */
export function deviceInfoToMeta(d: DeviceInfo): Record<string, unknown> {
  return {
    os: d.os,
    browser: d.browser,
    browser_version: d.browserVersion,
    device_type: d.deviceType,
    platform: d.platform,
    screen: d.screen,
    viewport: d.viewport,
    dpr: d.dpr,
    color_depth: d.colorDepth,
    cpu_cores: d.cpuCores,
    memory: d.memory,
    network_type: d.networkType,
    downlink: d.downlink,
    rtt: d.rtt,
    save_data: d.saveData,
    online: d.online,
    timezone: d.timezone,
    language: d.language,
    max_touch_points: d.maxTouchPoints,
    cookies_enabled: d.cookiesEnabled,
    charging: d.charging,
    orientation: d.orientation,
    vibration_supported: d.vibrationSupported,
  };
}
