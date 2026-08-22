"use client";

import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Battery,
  Cpu,
  Globe,
  LayoutGrid,
  MapPin,
  Smartphone,
  Wifi,
} from "lucide-react";
import type { AttendanceWithEmployee } from "@/lib/attendance-actions";

interface AttendanceDetailsDialogProps {
  record: AttendanceWithEmployee | null;
  onClose: () => void;
}

function fmtTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function fmtDate(dateStr: string): string {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

function getOpenStreetMapUrl(lat: number, lng: number) {
  return `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.005},${lat - 0.005},${lng + 0.005},${lat + 0.005}&layer=mapnik&marker=${lat},${lng}`;
}

function boolLabel(value: unknown, t: (key: string) => string): string {
  if (typeof value !== "boolean") return "—";
  return value ? t("yes") : t("no");
}

function Cell({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-background/60 px-2.5 py-1.5">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className="min-w-0 truncate text-xs font-medium text-foreground">{value}</span>
    </div>
  );
}

function Group({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        <span className="text-foreground/70">{icon}</span>
        {title}
      </p>
      <div className="grid grid-cols-2 gap-1.5">{children}</div>
    </div>
  );
}

function DeviceSection({
  title,
  titleColorClass,
  time,
  lat,
  lng,
  battery,
  deviceName,
  meta,
  mapLinkLabel,
  t,
}: {
  title: string;
  titleColorClass: string;
  time: string | null;
  lat: number | null;
  lng: number | null;
  battery: number | null;
  deviceName: string;
  meta: Record<string, unknown>;
  mapLinkLabel: string;
  t: (key: string) => string;
}) {
  const coords = lat != null && lng != null ? `${lat.toFixed(5)}, ${lng.toFixed(5)}` : null;
  const M = meta;

  return (
    <div className="space-y-3">
      <div className={`flex items-center gap-2 text-sm font-semibold ${titleColorClass}`}>
        {title}
      </div>

      {/* Location & time */}
      <div className="rounded-xl border bg-muted/20 p-3 space-y-1.5">
        <Cell label={t("time")} value={<span className="font-mono">{fmtTime(time)}</span>} />
        <Cell
          label={t("location")}
          value={
            coords ? (
              <a
                href={getOpenStreetMapUrl(lat!, lng!)}
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline"
              >
                {coords} · {mapLinkLabel}
              </a>
            ) : (
              <span className="text-muted-foreground">—</span>
            )
          }
        />
      </div>

      {/* Device */}
      <Group icon={<Smartphone className="h-3.5 w-3.5" />} title={t("deviceInfo")}>
        <Cell label={t("device")} value={deviceName || "—"} />
        <Cell
          label={t("battery")}
          value={
            <span className="inline-flex items-center gap-1">
              <Battery className="h-3 w-3" />
              {battery != null ? `${battery}%` : "—"}
            </span>
          }
        />
        <Cell
          label={t("chargingState")}
          value={
            M.charging == null ? (
              "—"
            ) : M.charging ? (
              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                ⚡ {t("charging")}
              </span>
            ) : (
              <span className="text-muted-foreground">{t("onBattery")}</span>
            )
          }
        />
        <Cell label={t("os")} value={(M.os as string) || "—"} />
        <Cell
          label={t("browser")}
          value={`${(M.browser as string) || "—"}${M.browser_version ? ` ${M.browser_version}` : ""}`}
        />
        <Cell label={t("deviceType")} value={(M.device_type as string) || "—"} />
        <Cell label={t("platform")} value={(M.platform as string) || "—"} />
        <Cell label={t("vibration")} value={boolLabel(M.vibration_supported, t)} />
      </Group>

      {/* Screen */}
      <Group icon={<LayoutGrid className="h-3.5 w-3.5" />} title={t("screenInfo")}>
        <Cell label={t("screen")} value={(M.screen as string) || "—"} />
        <Cell label={t("viewport")} value={(M.viewport as string) || "—"} />
        <Cell label={t("dpr")} value={M.dpr != null ? `${M.dpr}x` : "—"} />
        <Cell label={t("colorDepth")} value={M.color_depth != null ? `${M.color_depth}-bit` : "—"} />
        <Cell label={t("orientation")} value={M.orientation ? t(`orientation_${M.orientation}`) : "—"} />
      </Group>

      {/* Performance */}
      <Group icon={<Cpu className="h-3.5 w-3.5" />} title={t("performance")}>
        <Cell label={t("memory")} value={M.memory != null ? `${M.memory} GB` : "—"} />
        <Cell label={t("cpuCores")} value={M.cpu_cores != null ? `${M.cpu_cores}` : "—"} />
      </Group>

      {/* Network */}
      <Group icon={<Wifi className="h-3.5 w-3.5" />} title={t("networkInfo")}>
        <Cell label={t("ip")} value={(M.ip as string) || "—"} />
        <Cell label={t("network")} value={(M.network_type as string) || "—"} />
        <Cell
          label={t("downlink")}
          value={M.downlink != null ? `${M.downlink} Mbps` : "—"}
        />
        <Cell label={t("rtt")} value={M.rtt != null ? `${M.rtt} ms` : "—"} />
        <Cell label={t("saveData")} value={boolLabel(M.save_data, t)} />
        <Cell label={t("online")} value={boolLabel(M.online, t)} />
      </Group>

      {/* System / general */}
      <Group icon={<Globe className="h-3.5 w-3.5" />} title={t("systemInfo")}>
        <Cell label={t("timezone")} value={(M.timezone as string) || "—"} />
        <Cell label={t("language")} value={(M.language as string) || "—"} />
        <Cell label={t("touchPoints")} value={M.max_touch_points != null ? `${M.max_touch_points}` : "—"} />
        <Cell label={t("cookies")} value={boolLabel(M.cookies_enabled, t)} />
      </Group>
    </div>
  );
}

export function AttendanceDetailsDialog({ record, onClose }: AttendanceDetailsDialogProps) {
  const t = useTranslations("Attendance");

  if (!record) return null;

  const employeeName =
    [record.employee?.first_name, record.employee?.second_name].filter(Boolean).join(" ") || "—";
  const inMeta = (record.check_in_meta ?? {}) as Record<string, unknown>;
  const outMeta = (record.check_out_meta ?? {}) as Record<string, unknown>;

  return (
    <Dialog
      open={!!record}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("recordDetails")}</DialogTitle>
          <DialogDescription>
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {employeeName}
            </span>
            {" · "}
            {fmtDate(record.check_in_date)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <DeviceSection
            title={t("checkIn")}
            titleColorClass="text-blue-600 dark:text-blue-400"
            time={record.check_in_time}
            lat={record.latitude}
            lng={record.longitude}
            battery={record.check_in_battery}
            deviceName={record.check_in_device_name}
            meta={inMeta}
            mapLinkLabel={t("viewOnMap")}
            t={t}
          />

          {record.check_out_time ? (
            <DeviceSection
              title={t("checkOut")}
              titleColorClass="text-amber-600 dark:text-amber-400"
              time={record.check_out_time}
              lat={record.check_out_latitude}
              lng={record.check_out_longitude}
              battery={record.check_out_battery}
              deviceName={record.check_out_device_name}
              meta={outMeta}
              mapLinkLabel={t("viewOnMap")}
              t={t}
            />
          ) : (
            <div className="rounded-xl border border-dashed bg-muted/10 p-3 text-center text-xs text-muted-foreground">
              {t("notCheckedOut")}
            </div>
          )}

          {record.notes && (
            <div className="rounded-xl border bg-muted/20 p-3">
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {t("notes")}
              </p>
              <p className="text-xs text-foreground">{record.notes}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
