"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { updateEmployee, type TeamMemberProfile } from "@/lib/team-actions";
import { queryKeys } from "@/hooks/queries/query-keys";
import { Loader2, Save, AlertTriangle } from "lucide-react";

type DialogStage = "none" | "type" | "confirm";

export function EmployeeInfoTab({ profile }: { profile: TeamMemberProfile }) {
  const t = useTranslations("Team");
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();

  const [firstName, setFirstName] = useState(profile.first_name ?? "");
  const [secondName, setSecondName] = useState(profile.second_name ?? "");
  const [position, setPosition] = useState(profile.position ?? "");
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [isAdmin, setIsAdmin] = useState(profile.role === "admin");

  const [dialogStage, setDialogStage] = useState<DialogStage>("none");
  const [roleChangeText, setRoleChangeText] = useState("");

  const roleChanged = isAdmin !== (profile.role === "admin");

  const CONFIRM_SENTENCE = isAdmin
    ? "أوافق على ترقية الموظف إلى مشرف كامل الصلاحيات"
    : "أوافق على تغيير صلاحية الموظف إلى موظف عادي";

  const executeSave = (role: string) => {
    startTransition(async () => {
      const result = await updateEmployee(profile.id, {
        first_name: firstName,
        second_name: secondName,
        position,
        phone,
        role: role as "admin" | "user",
      });

      if (result.success) {
        toast.success(t("employeeUpdated", { name: firstName || profile.email }));
        queryClient.invalidateQueries({ queryKey: queryKeys.team.all });
      } else {
        toast.error(result.error);
      }
    });
  };

  const handleSaveClick = () => {
    if (roleChanged) {
      setDialogStage("type");
    } else {
      executeSave(profile.role);
    }
  };

  const handleTypeDialogClose = () => {
    setDialogStage("none");
    setRoleChangeText("");
    setIsAdmin(profile.role === "admin");
  };

  const fullName = [profile.first_name, profile.second_name].filter(Boolean).join(" ") || profile.email;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("editEmployee")}</CardTitle>
        <CardDescription>{fullName}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pb-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="firstName">{t("firstName")}</Label>
            <Input
              id="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="secondName">{t("secondName")}</Label>
            <Input
              id="secondName"
              value={secondName}
              onChange={(e) => setSecondName(e.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="email">{t("email")}</Label>
            <Input id="email" value={profile.email} disabled className="opacity-60" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">{t("phone")}</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              dir="ltr"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="position">{t("position")}</Label>
          <Input
            id="position"
            value={position}
            onChange={(e) => setPosition(e.target.value)}
          />
        </div>

        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <Label className="text-sm font-medium">{t("role")}</Label>
            <p className="text-xs text-muted-foreground">
              {isAdmin ? t("roleAdmin") : t("roleUser")}
            </p>
          </div>
          <Switch
            checked={isAdmin}
            onCheckedChange={setIsAdmin}
          />
        </div>

        <Button onClick={handleSaveClick} disabled={isPending} className="w-full sm:w-auto mb-4">
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          <span className="ms-2">{t("save")}</span>
        </Button>
      </CardContent>

      <Dialog open={dialogStage === "type"} onOpenChange={(open) => {
        if (!open) handleTypeDialogClose();
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              تأكيد تغيير الصلاحيات
            </DialogTitle>
            <DialogDescription>
              {isAdmin
                ? "أنت على وشك ترقية هذا الموظف إلى مشرف. هذا يعني أنه سيتمكن من الوصول إلى جميع بيانات النظام وإدارة الموظفين."
                : "أنت على وشك تخفيض صلاحيات هذا المشرف إلى موظف عادي. سيفقد الوصول إلى إدارة النظام."
              }
              <br /><br />
              <strong className="text-destructive">هذا الإجراء خطير ويتطلب تأكيداً كتابياً.</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              اكتب الجملة التالية بالضبط للتأكيد:
            </p>
            <p className="text-sm font-bold text-foreground border rounded-md p-2 bg-muted/50">
              {CONFIRM_SENTENCE}
            </p>
            <Input
              value={roleChangeText}
              onChange={(e) => setRoleChangeText(e.target.value)}
              placeholder="اكتب الجملة هنا..."
            />
          </div>
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="outline" onClick={handleTypeDialogClose}>
              {t("cancel")}
            </Button>
            <Button
              variant="destructive"
              disabled={roleChangeText.trim() !== CONFIRM_SENTENCE}
              onClick={() => {
                setDialogStage("confirm");
              }}
            >
              تأكيد تغيير الصلاحيات
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={dialogStage === "confirm"}
        onOpenChange={(open) => {
          if (!open) {
            setDialogStage("none");
            setRoleChangeText("");
            setIsAdmin(profile.role === "admin");
          }
        }}
        title="التأكيد النهائي"
        description={
          isAdmin
            ? "سيتم ترقية هذا الموظف إلى مشرف كامل الصلاحيات. هذا الإجراء لا يمكن التراجع عنه بسهولة."
            : "سيتم تخفيض صلاحيات هذا المشرف إلى موظف عادي. هذا الإجراء لا يمكن التراجع عنه بسهولة."
        }
        confirmLabel="نعم، قم بتغيير الصلاحيات"
        cancelLabel={t("cancel")}
        variant="destructive"
        loading={false}
        onConfirm={() => {
          setDialogStage("none");
          setRoleChangeText("");
          executeSave(isAdmin ? "admin" : "user");
        }}
      />
    </Card>
  );
}
