"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Card } from "@/components/ui/card";
import {
  LayoutDashboard,
  UserCircle,
  Users,
  Building2,
  CalendarCheck,
  ListChecks,
  CalendarDays,
  Banknote,
  ChevronLeft,
  Shield,
  ShieldCheck,
  Loader2,
  UserX,
  UserCheck,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  disableEmployee,
  enableEmployee,
  deleteEmployee,
  type TeamMemberProfile,
} from "@/lib/team-actions";
import { queryKeys } from "@/hooks/queries/query-keys";
import { EmployeeOverviewTab } from "@/components/admin/team/tabs/employee-overview-tab";
import { EmployeeInfoTab } from "@/components/admin/team/tabs/employee-info-tab";
import { EmployeeClientsTab } from "@/components/admin/team/tabs/employee-clients-tab";
import { EmployeePropertiesTab } from "@/components/admin/team/tabs/employee-properties-tab";
import { EmployeeVisitsTab } from "@/components/admin/team/tabs/employee-visits-tab";
import { EmployeeTasksTab } from "@/components/admin/team/tabs/employee-tasks-tab";
import { EmployeeAttendanceTab } from "@/components/admin/team/tabs/employee-attendance-tab";
import { EmployeeDealsTab } from "@/components/admin/team/tabs/employee-deals-tab";

type Tab = "overview" | "info" | "clients" | "properties" | "visits" | "tasks" | "attendance" | "deals";

const TABS: { key: Tab; labelKey: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "overview", labelKey: "overview", icon: LayoutDashboard },
  { key: "info", labelKey: "info", icon: UserCircle },
  { key: "clients", labelKey: "clientsTab", icon: Users },
  { key: "properties", labelKey: "propertiesTab", icon: Building2 },
  { key: "visits", labelKey: "visitsTab", icon: CalendarCheck },
  { key: "tasks", labelKey: "tasksTab", icon: ListChecks },
  { key: "attendance", labelKey: "attendanceTab", icon: CalendarDays },
  { key: "deals", labelKey: "dealsTab", icon: Banknote },
];

type DialogAction = { type: "disable" } | { type: "enable" } | { type: "delete" } | null;

export function EmployeeProfile({ profile }: { profile: TeamMemberProfile }) {
  const t = useTranslations("Team");
  const router = useRouter();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("overview");
  const [isPending, startTransition] = useTransition();
  const [dialog, setDialog] = useState<DialogAction>(null);

  const fullName = [profile.first_name, profile.second_name].filter(Boolean).join(" ") || profile.email;
  const initials = `${profile.first_name?.[0] ?? ""}${profile.second_name?.[0] ?? ""}`.toUpperCase() || "?";
  const isDisabled = profile.approval_status === "rejected";

  const handleAction = () => {
    if (!dialog) return;

    startTransition(async () => {
      let result: { success: boolean };
      if (dialog.type === "disable") {
        result = await disableEmployee(profile.id);
        if (result.success) toast.success(t("employeeDisabled", { name: fullName }));
      } else if (dialog.type === "enable") {
        result = await enableEmployee(profile.id);
        if (result.success) toast.success(t("employeeEnabled", { name: fullName }));
      } else {
        result = await deleteEmployee(profile.id);
        if (result.success) {
          toast.success(t("employeeDeleted", { name: fullName }));
          queryClient.invalidateQueries({ queryKey: queryKeys.team.all });
          router.push("/admin/team");
          return;
        }
      }

      if (result.success) {
        queryClient.invalidateQueries({ queryKey: queryKeys.team.all });
        router.refresh();
      }
    });

    setDialog(null);
  };

  const isSelf = false;

  return (
    <div className="space-y-6">
      <button
        onClick={() => router.push("/admin/team")}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        {t("title")}
      </button>

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 ring-2 ring-border ring-offset-2 ring-offset-background">
              <AvatarImage src={profile.avatar_url ?? undefined} alt={fullName} className="object-cover" />
              <AvatarFallback className="text-xl font-semibold bg-primary/10 text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold">{fullName}</h2>
                {isDisabled ? (
                  <Badge variant="destructive" className="text-[11px]">{t("statusRejected")}</Badge>
                ) : (
                  <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200 text-[11px]">{t("statusApproved")}</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{profile.email}</p>
              {profile.position && (
                <p className="text-sm text-muted-foreground">{profile.position}</p>
              )}
              <span className="inline-flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                {profile.role === "admin" ? (
                  <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                ) : (
                  <Shield className="h-3.5 w-3.5" />
                )}
                {t(profile.role === "admin" ? "roleAdmin" : "roleUser")}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {isDisabled ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDialog({ type: "enable" })}
                disabled={isPending}
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />}
                <span className="ms-1.5">{t("enable")}</span>
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDialog({ type: "disable" })}
                disabled={isPending}
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserX className="h-4 w-4" />}
                <span className="ms-1.5">{t("disable")}</span>
              </Button>
            )}
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDialog({ type: "delete" })}
              disabled={isPending}
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              <span className="ms-1.5">{t("delete")}</span>
            </Button>
          </div>
        </div>

        <div className="border-t">
          <div className="flex overflow-x-auto">
            {TABS.map(({ key, labelKey, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={cn(
                  "flex items-center gap-2 whitespace-nowrap px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px",
                  tab === key
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
                )}
              >
                <Icon className="h-4 w-4" />
                {t(labelKey)}
              </button>
            ))}
          </div>
        </div>
      </Card>

      <div>
        {tab === "overview" && <EmployeeOverviewTab profile={profile} />}
        {tab === "info" && <EmployeeInfoTab profile={profile} />}
        {tab === "clients" && <EmployeeClientsTab employeeId={profile.id} />}
        {tab === "properties" && <EmployeePropertiesTab employeeId={profile.id} />}
        {tab === "visits" && <EmployeeVisitsTab employeeId={profile.id} />}
        {tab === "tasks" && <EmployeeTasksTab employeeId={profile.id} />}
        {tab === "attendance" && <EmployeeAttendanceTab employeeId={profile.id} />}
        {tab === "deals" && <EmployeeDealsTab employeeId={profile.id} />}
      </div>

      <ConfirmDialog
        open={dialog !== null}
        onOpenChange={(open) => { if (!open) setDialog(null); }}
        title={
          dialog?.type === "disable"
            ? t("disableConfirmTitle", { name: fullName })
            : dialog?.type === "enable"
              ? t("enableEmployee")
              : t("deleteConfirmTitle", { name: fullName })
        }
        description={
          dialog?.type === "disable"
            ? t("disableConfirmDesc")
            : dialog?.type === "delete"
              ? `${t("deleteConfirmDesc")}\n\n${t("deletePermanent")}`
              : undefined
        }
        confirmLabel={t(dialog?.type === "disable" ? "disable" : dialog?.type === "enable" ? "enable" : "delete")}
        cancelLabel={t("cancel")}
        variant={dialog?.type === "delete" ? "destructive" : "default"}
        loading={isPending}
        onConfirm={handleAction}
      />
    </div>
  );
}
