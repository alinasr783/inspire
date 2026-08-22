export interface DeviceInfo {
  /** Battery level as an integer percentage (0–100), or null when unavailable. */
  battery: number | null;
  /** A friendly device name derived from the browser/OS, e.g. "Windows · Chrome". */
  deviceName: string;
}

function detectOS(ua: string): string {
  if (/windows/i.test(ua)) return "Windows";
  if (/android/i.test(ua)) return "Android";
  if (/iphone|ipad|ipod/i.test(ua)) return "iOS";
  if (/mac os x/i.test(ua)) return "macOS";
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

/**
 * Captures battery level (via the Battery Status API, Chromium-based browsers)
 * and a friendly device name derived from the user agent. Both degrade
 * gracefully when the browser doesn't support them.
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

  const deviceName = detectDeviceName(typeof navigator !== "undefined" ? navigator.userAgent || "" : "");

  return { battery, deviceName };
}
