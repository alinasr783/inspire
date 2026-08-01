"use client";

import { useEffect, useRef } from "react";

import { registerDevice } from "@/lib/device-actions";

const FP_KEY = "inspire_device_id";
const LAST_REG_KEY = "inspire_device_last_reg";
const REGISTER_INTERVAL = 5 * 60 * 1000;

function getOrCreateFingerprint(): string {
  try {
    const existing = window.localStorage.getItem(FP_KEY);
    if (existing) return existing;
    const fp =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `fp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    window.localStorage.setItem(FP_KEY, fp);
    return fp;
  } catch {
    return `fp-${Date.now()}`;
  }
}

function deviceLabelFromUA(ua: string): string {
  const uaLower = ua.toLowerCase();
  const os = /android/i.test(uaLower)
    ? "Android"
    : /iphone|ipad|ipod/i.test(uaLower)
      ? "iOS"
      : /mac os/i.test(uaLower)
        ? "macOS"
        : /windows/i.test(uaLower)
          ? "Windows"
          : /linux/i.test(uaLower)
            ? "Linux"
            : "Unknown OS";
  const browser = /edg\//i.test(uaLower)
    ? "Edge"
    : /opr\//i.test(uaLower) || /opera/i.test(uaLower)
      ? "Opera"
      : /chrome|crios/i.test(uaLower)
        ? "Chrome"
        : /firefox|fxios/i.test(uaLower)
          ? "Firefox"
          : /safari/i.test(uaLower)
            ? "Safari"
            : "Browser";
  return `${browser} · ${os}`;
}

function shouldRegister(): boolean {
  try {
    const last = window.localStorage.getItem(LAST_REG_KEY);
    if (!last) return true;
    return Date.now() - Number(last) > REGISTER_INTERVAL;
  } catch {
    return true;
  }
}

export function DeviceTracker() {
  const registeredRef = useRef(false);

  useEffect(() => {
    if (registeredRef.current) return;
    registeredRef.current = true;

    const fingerprint = getOrCreateFingerprint();
    if (!shouldRegister()) return;

    const userAgent = navigator.userAgent;
    const label = deviceLabelFromUA(userAgent);

    registerDevice({ fingerprint, label, userAgent }).then((result) => {
      if (result.success) {
        try {
          window.localStorage.setItem(LAST_REG_KEY, String(Date.now()));
        } catch {
          // ignore storage failures
        }
      }
    });
  }, []);

  return null;
}
