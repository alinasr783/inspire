"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Laptop,
  Loader2,
  MonitorSmartphone,
  QrCode,
  RefreshCw,
  Smartphone,
  Tablet,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PwaInstallButton } from "@/components/devices/pwa-install-button";
import { createDeviceQr, removeDevice } from "@/lib/device-actions";
import type { DeviceRow } from "@/lib/device-actions";

const FP_KEY = "inspire_device_id";

function getFingerprint(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(FP_KEY);
  } catch {
    return null;
  }
}

function timeAgo(iso: string, locale: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  const rtf = new Intl.RelativeTimeFormat(locale === "ar" ? "ar" : "en", {
    numeric: "auto",
  });
  const diff = d.getTime() - Date.now();
  const abs = Math.abs(diff);
  const minutes = Math.round(abs / 60000);
  if (minutes < 60) return rtf.format(-minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (hours < 24) return rtf.format(-hours, "hour");
  const days = Math.round(hours / 24);
  if (days < 30) return rtf.format(-days, "day");
  const months = Math.round(days / 30);
  if (months < 12) return rtf.format(-months, "month");
  return rtf.format(-Math.round(months / 12), "year");
}

function deviceIcon(ua: string | null, label: string | null) {
  const source = `${ua ?? ""} ${label ?? ""}`.toLowerCase();
  if (/android|mobile|iphone|ipad|ipod/.test(source)) return Smartphone;
  if (/ipad|tablet/.test(source)) return Tablet;
  if (/mac|windows|linux/.test(source)) return Laptop;
  return MonitorSmartphone;
}

export function DevicesClient({
  initialDevices,
  locale,
}: {
  initialDevices: DeviceRow[];
  locale: string;
}) {
  const t = useTranslations("Devices");

  const [devices, setDevices] = useState<DeviceRow[]>(initialDevices);
  const [fingerprint] = useState<string | null>(getFingerprint);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    createDeviceQr(locale)
      .then((result) => {
        if (active && result.success && result.qrDataUrl) {
          setQrDataUrl(result.qrDataUrl);
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setGenerating(false);
      });
    return () => {
      active = false;
    };
  }, [locale]);

  const regenerate = () => {
    setGenerating(true);
    setQrDataUrl(null);
    createDeviceQr(locale)
      .then((result) => {
        if (result.success && result.qrDataUrl) {
          setQrDataUrl(result.qrDataUrl);
        }
      })
      .catch(() => undefined)
      .finally(() => setGenerating(false));
  };

  const handleRemove = async (id: string) => {
    setRemovingId(id);
    const result = await removeDevice(id);
    setRemovingId(null);
    if (result.success) {
      setDevices((prev) => prev.filter((d) => d.id !== id));
    } else {
      toast.error(t("removeFailed"));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <PwaInstallButton />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <QrCode className="h-4 w-4" />
              {t("qrTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <div className="flex h-[280px] w-[280px] items-center justify-center rounded-xl border bg-white p-4">
              {generating ? (
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              ) : qrDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qrDataUrl}
                  alt={t("qrTitle")}
                  width={260}
                  height={260}
                  className="h-auto w-full"
                />
              ) : (
                <div className="space-y-2 text-center">
                  <QrCode className="mx-auto h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-destructive">{t("qrError")}</p>
                </div>
              )}
            </div>
            <Button variant="outline" onClick={regenerate} disabled={generating}>
              {generating ? (
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="me-2 h-4 w-4" />
              )}
              {t("regenerate")}
            </Button>
            <p className="max-w-xs text-center text-xs text-muted-foreground">
              {t("qrHint")}
            </p>
          </CardContent>
        </Card>

        <Card className="lg:col-span-7">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <MonitorSmartphone className="h-4 w-4" />
              {t("listTitle")}
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                {devices.length}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {devices.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {t("empty")}
              </p>
            ) : (
              <ul className="divide-y">
                {devices.map((device) => {
                  const Icon = deviceIcon(device.user_agent, device.label);
                  const isCurrent = fingerprint !== null && device.fingerprint === fingerprint;
                  return (
                    <li key={device.id} className="flex items-center gap-3 py-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                        <Icon className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-medium">
                            {device.label ?? "—"}
                          </p>
                          {isCurrent && (
                            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                              {t("thisDevice")}
                            </span>
                          )}
                        </div>
                        <p className="truncate text-xs text-muted-foreground">
                          {t("lastSeen", { time: timeAgo(device.last_seen_at, locale) })}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={t("remove")}
                        disabled={removingId === device.id}
                        onClick={() => handleRemove(device.id)}
                      >
                        {removingId === device.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
