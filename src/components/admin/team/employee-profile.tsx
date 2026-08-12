"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  Ban,
  ShieldOff,
  Infinity,
  Timer,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  disableEmployee,
  enableEmployee,
  deleteEmployee,
  type TeamMemberProfile,
} from "@/lib/team-actions";
import { banEmployee, unbanEmployee } from "@/lib/ban-actions";
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

type SimpleDialog = { type: "disable" } | { type: "enable" } | { type: "delete" } | { type: "unban" } | null;

type BanConfirmDialog = { type: "ban"; banType: "temporary" | "permanent"; duration: number; reason: string } | null;

export function EmployeeProfile({ profile }: { profile: TeamMemberProfile }) {
  const t = useTranslations("Team");
  const router = useRouter();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("overview");
  const [isPending, startTransition] = useTransition();
  const [simpleDialog, setSimpleDialog] = useState<SimpleDialog>(null);
  const [banDialog, setBanDialog] = useState<BanConfirmDialog>(null);
  const [showBanForm, setShowBanForm] = useState(false);
  const [banType, setBanType] = useState<"temporary" | "permanent">("temporary");
  const [banDuration, setBanDuration] = useState(7);
  const [banReason, setBanReason] = useState("");

  const fullName = [profile.first_name, profile.second_name].filter(Boolean).join(" ") || profile.email;
  const initials = `${profile.first_name?.[0] ?? ""}${profile.second_name?.[0] ?? ""}`.toUpperCase() || "?";
  const isDisabled = profile.approval_status === "rejected";

  const handleSimpleAction = () => {
    if (!simpleDialog) return;

    startTransition(async () => {
      let result: { success: boolean };
      if (simpleDialog.type === "disable") {
        result = await disableEmployee(profile.id);
        if (result.success) toast.success(t("employeeDisabled", { name: fullName }));
      } else if (simpleDialog.type === "enable") {
        result = await enableEmployee(profile.id);
        if (result.success) toast.success(t("employeeEnabled", { name: fullName }));
      } else if (simpleDialog.type === "unban") {
        result = await unbanEmployee(profile.id);
        if (result.success) toast.success(t("employeeUnbanned", { name: fullName }));
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

    setSimpleDialog(null);
  };

  const handleBanExec = () => {
    startTransition(async () => {
      const result = await banEmployee(
        profile.id,
        banType,
        banType === "temporary" ? banDuration : null,
        banReason.trim() || null
      );

      if (result.success) {
        toast.success(t("employeeBanned", { name: fullName }));
        queryClient.invalidateQueries({ queryKey: queryKeys.team.all });
        router.refresh();
        setShowBanForm(false);
        setBanReason("");
      } else if (result.error === "already_banned") {
        toast.error(t("alreadyBanned"));
      }
    });
  };

  const getSimpleDialogTitle = () => {
    if (!simpleDialog) return "";
    if (simpleDialog.type === "disable") return t("disableConfirmTitle", { name: fullName });
    if (simpleDialog.type === "enable") return t("enableEmployee");
    if (simpleDialog.type === "unban") return t("unbanConfirmTitle", { name: fullName });
    return t("deleteConfirmTitle", { name: fullName });
  };

  const getSimpleDialogDesc = () => {
    if (!simpleDialog) return undefined;
    if (simpleDialog.type === "disable") return t("disableConfirmDesc");
    if (simpleDialog.type === "unban") return t("unbanConfirmDesc");
    if (simpleDialog.type === "delete") return `${t("deleteConfirmDesc")}\n\n${t("deletePermanent")}`;
    return undefined;
  };

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
                onClick={() => setSimpleDialog({ type: "enable" })}
                disabled={isPending}
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />}
                <span className="ms-1.5">{t("enable")}</span>
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSimpleDialog({ type: "disable" })}
                disabled={isPending}
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserX className="h-4 w-4" />}
                <span className="ms-1.5">{t("disable")}</span>
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              className="border-destructive/30 text-destructive hover:bg-destructive/10"
              onClick={() => setShowBanForm(true)}
              disabled={isPending}
            >
              <Ban className="h-4 w-4" />
              <span className="ms-1.5">{t("banEmployee")}</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setSimpleDialog({ type: "unban" })}
              disabled={isPending}
            >
              <ShieldOff className="h-4 w-4" />
              <span className="ms-1.5">{t("unbanEmployee")}</span>
            </Button>

            <Button
              variant="destructive"
              size="sm"
              onClick={() => setSimpleDialog({ type: "delete" })}
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
        open={simpleDialog !== null}
        onOpenChange={(open) => { if (!open) setSimpleDialog(null); }}
        title={getSimpleDialogTitle()}
        description={getSimpleDialogDesc()}
        confirmLabel={t(simpleDialog?.type === "disable" ? "disable" : simpleDialog?.type === "enable" ? "enable" : simpleDialog?.type === "unban" ? "unban" : "delete")}
        cancelLabel={t("cancel")}
        variant={simpleDialog?.type === "delete" ? "destructive" : "default"}
        loading={isPending}
        onConfirm={handleSimpleAction}
      />

      <Dialog open={showBanForm} onOpenChange={(open) => { if (!open) { setShowBanForm(false); setBanReason(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ban className="h-5 w-5 text-destructive" />
              {t("banEmployee")}: {fullName}
            </DialogTitle>
            <DialogDescription>
              {t("banDescription")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setBanType("temporary")}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all",
                  banType === "temporary"
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border hover:border-muted-foreground/30"
                )}
              >
                <Timer className="h-6 w-6" />
                <span className="text-sm font-medium">{t("banTemporary")}</span>
              </button>
              <button
                type="button"
                onClick={() => setBanType("permanent")}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all",
                  banType === "permanent"
                    ? "border-destructive bg-destructive/5 text-destructive"
                    : "border-border hover:border-muted-foreground/30"
                )}
              >
                <Infinity className="h-6 w-6" />
                <span className="text-sm font-medium">{t("banPermanent")}</span>
              </button>
            </div>

            {banType === "temporary" && (
              <div className="space-y-2">
                <Label>{t("banDuration")}</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={365}
                    value={banDuration}
                    onChange={(e) => setBanDuration(Number(e.target.value) || 1)}
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">{t("banDays")}</span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>{t("banReason")} ({t("optional")})</Label>
              <Textarea
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder={t("banReasonPlaceholder")}
                rows={3}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => { setShowBanForm(false); setBanReason(""); }}>
                {t("cancel")}
              </Button>
              <Button
                variant="destructive"
                disabled={isPending}
                onClick={handleBanExec}
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
                <span className="ms-2">{t("confirmBan")}</span>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
