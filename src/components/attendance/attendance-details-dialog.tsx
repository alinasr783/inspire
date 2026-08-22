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
  Clock,
  Cpu,
  Globe,
  HardDrive,
  Languages,
  MapPin,
  MonitorSmartphone,
  Network,
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

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className="shrink-0">{icon}</span>
        {label}
      </span>
      <span className="min-w-0 truncate text-xs font-medium text-foreground">{value}</span>
    </div>
  );
}

function MetaSection({
  title,
  time,
  battery,
  deviceName,
  lat,
  lng,
  meta,
  mapLinkLabel,
  t,
}: {
  title: string;
  time: string | null;
  battery: number | null;
  deviceName: string;
  lat: number | null;
  lng: number | null;
  meta: Record<string, unknown>;
  mapLinkLabel: string;
  t: (key: string) => string;
}) {
  const coords = lat != null && lng != null ? `${lat.toFixed(5)}, ${lng.toFixed(5)}` : null;
  const colorClass = title === t("checkIn") ? "text-blue-600" : "text-amber-600";

  return (
    <div className="rounded-xl border bg-muted/20 p-3">
      <p className={`mb-1 text-xs font-semibold uppercase tracking-wide ${colorClass}`}>{title}</p>
      <DetailRow icon={<Clock className="h-3.5 w-3.5" />} label={t("time")} value={fmtTime(time)} />
      <DetailRow
        icon={<MapPin className="h-3.5 w-3.5" />}
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
            "—"
          )
        }
      />
      <DetailRow
        icon={<MonitorSmartphone className="h-3.5 w-3.5" />}
        label={t("device")}
        value={deviceName || "—"}
      />
      <DetailRow
        icon={<Battery className="h-3.5 w-3.5" />}
        label={t("battery")}
        value={battery != null ? `${battery}%` : "—"}
      />
      <DetailRow icon={<Globe className="h-3.5 w-3.5" />} label={t("ip")} value={(meta.ip as string) || "—"} />
      <DetailRow
        icon={<Network className="h-3.5 w-3.5" />}
        label={t("network")}
        value={(meta.network_type as string) || "—"}
      />
      <DetailRow
        icon={<Languages className="h-3.5 w-3.5" />}
        label={t("language")}
        value={(meta.language as string) || "—"}
      />
      <DetailRow
        icon={<Globe className="h-3.5 w-3.5" />}
        label={t("timezone")}
        value={(meta.timezone as string) || "—"}
      />
      <DetailRow
        icon={<Cpu className="h-3.5 w-3.5" />}
        label={t("os")}
        value={(meta.os as string) || "—"}
      />
      <DetailRow
        icon={<HardDrive className="h-3.5 w-3.5" />}
        label={t("memory")}
        value={meta.memory != null ? `${meta.memory} GB` : "—"}
      />
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
            {employeeName} · {fmtDate(record.check_in_date)}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <MetaSection
            title={t("checkIn")}
            time={record.check_in_time}
            battery={record.check_in_battery}
            deviceName={record.check_in_device_name}
            lat={record.latitude}
            lng={record.longitude}
            meta={inMeta}
            mapLinkLabel={t("viewOnMap")}
            t={t}
          />
          {record.check_out_time && (
            <MetaSection
              title={t("checkOut")}
              time={record.check_out_time}
              battery={record.check_out_battery}
              deviceName={record.check_out_device_name}
              lat={record.check_out_latitude}
              lng={record.check_out_longitude}
              meta={outMeta}
              mapLinkLabel={t("viewOnMap")}
              t={t}
            />
          )}
          {record.notes && (
            <div className="rounded-xl border bg-muted/20 p-3">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
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
