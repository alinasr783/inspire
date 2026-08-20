"use client";

import { useState, useRef, useTransition, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import { Camera, Bell, Shield, Trash2, Loader2, Upload, Palette, Check, Image } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useRealtime } from "@/components/providers/realtime-provider";
import { useThemeColor } from "@/components/providers/theme-color-provider";
import { updateProfile, removeAvatar, updateProfileSettings } from "@/lib/profile-actions";
import { uploadCrmLogo } from "@/lib/crm-actions";
import { THEME_COLORS } from "@/lib/theme-colors";
import { cn } from "@/lib/utils";

interface ProfileFormProps {
  firstName: string;
  secondName: string;
  email: string;
  avatarUrl: string | null;
  primaryColor: string | null;
  notificationPrefs: Record<string, boolean>;
  showAdTracking: boolean;
  role: string;
  logoUrl: string | null;
}

const USER_NOTIFICATIONS: { key: string; label: string }[] = [
  { key: "new_unit", label: "New property added" },
  { key: "unit_updated", label: "Property updated" },
  { key: "new_task", label: "New task assigned to you" },
  { key: "new_device", label: "New device login" },
];

const ADMIN_NOTIFICATIONS: { key: string; label: string }[] = [
  { key: "task_status", label: "Task status changed" },
  { key: "new_client", label: "New client added" },
  { key: "client_updated", label: "Client updated" },
  { key: "new_registration", label: "New user registration" },
];

export function ProfileForm({
  firstName: initialFirstName,
  secondName: initialSecondName,
  email,
  avatarUrl: initialAvatarUrl,
  primaryColor: initialPrimaryColor,
  notificationPrefs: initialNotificationPrefs,
  showAdTracking: initialShowAdTracking,
  role,
  logoUrl: initialLogoUrl,
}: ProfileFormProps) {
  const t = useTranslations("Profile");
  const router = useRouter();
  const { refreshCurrentUser } = useRealtime();
  const { color: themeColor, setColor: setThemeColor } = useThemeColor();

  const [firstName, setFirstName] = useState(initialFirstName);
  const [secondName, setSecondName] = useState(initialSecondName);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAvatarUrl);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedColor, setSelectedColor] = useState<string | null>(initialPrimaryColor);
  const [pendingColor, setPendingColor] = useState<string | null>(null);
  const [notifPrefs, setNotifPrefs] = useState<Record<string, boolean>>(initialNotificationPrefs);
  const [showAdTracking, setShowAdTracking] = useState<boolean>(initialShowAdTracking);
  const [logoUrl, setLogoUrl] = useState<string | null>(initialLogoUrl);
  const [isUploadingLogo, startUploadLogo] = useTransition();
  const logoInputRef = useRef<HTMLInputElement>(null);

  const initials = `${initialFirstName?.[0] ?? ""}${initialSecondName?.[0] ?? ""}`.toUpperCase() || "IN";
  const displayAvatar = previewUrl ?? avatarUrl;
  const hasAvatar = Boolean(displayAvatar);
  const isAdmin = role === "admin";

  const allNotifications = isAdmin
    ? [...USER_NOTIFICATIONS, ...ADMIN_NOTIFICATIONS]
    : USER_NOTIFICATIONS;

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Invalid file type. Please select an image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File is too large. Maximum size is 5MB.");
      return;
    }
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    handleFile(file);
    e.target.value = "";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    handleFile(file);
  };

  const handleSave = () => {
    startTransition(async () => {
      if (
        firstName.trim() === initialFirstName.trim() &&
        secondName.trim() === initialSecondName.trim() &&
        !selectedFile
      ) {
        return;
      }

      const formData = new FormData();
      formData.set("first_name", firstName.trim());
      formData.set("second_name", secondName.trim());
      if (selectedFile) {
        formData.set("avatar", selectedFile);
      }

      const result = await updateProfile(formData);

      if (result.success) {
        if (result.avatar_url) {
          setAvatarUrl(result.avatar_url);
          setPreviewUrl(null);
          setSelectedFile(null);
        }
        refreshCurrentUser({
          firstName: firstName.trim(),
          secondName: secondName.trim(),
          avatarUrl: result.avatar_url ?? avatarUrl,
        });
        toast.success(t("savedSuccess"));
        router.refresh();
      } else {
        const errorMessages: Record<string, string> = {
          uploadFailed: t("uploadFailed"),
          saveFailed: t("saveFailed"),
          unauthorized: t("saveFailed"),
        };
        toast.error(errorMessages[result.error] ?? t("saveFailed"));
      }
    });
  };

  const handleRemoveAvatar = () => {
    startTransition(async () => {
      const result = await removeAvatar();
      if (result.success) {
        setAvatarUrl(null);
        setPreviewUrl(null);
        setSelectedFile(null);
        refreshCurrentUser({ avatarUrl: null });
        toast.success(t("savedSuccess"));
        router.refresh();
      } else {
        toast.error(t("saveFailed"));
      }
    });
  };

  const handleColorSelect = (color: string) => {
    setPendingColor(color);
    setThemeColor(color);

    startTransition(async () => {
      const result = await updateProfileSettings({ primary_color: color });
      if (result.success) {
        setSelectedColor(color);
        toast.success(t("savedSuccess"));
      } else {
        setPendingColor(null);
        setThemeColor(selectedColor ?? "");
        toast.error(t("saveFailed"));
      }
    });
  };

  const handleNotifToggle = (key: string, enabled: boolean) => {
    const updated = { ...notifPrefs, [key]: enabled };
    setNotifPrefs(updated);

    startTransition(async () => {
      const result = await updateProfileSettings({ notification_prefs: updated });
      if (!result.success) {
        setNotifPrefs(notifPrefs);
        toast.error(t("saveFailed"));
      }
    });
  };

  const handleAdTrackingToggle = (enabled: boolean) => {
    setShowAdTracking(enabled);

    startTransition(async () => {
      const result = await updateProfileSettings({ show_ad_tracking: enabled });
      if (!result.success) {
        setShowAdTracking(!enabled);
        toast.error(t("saveFailed"));
      }
    });
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    startUploadLogo(async () => {
      const f = new FormData();
      f.set("logo", file);
      const r = await uploadCrmLogo(f);
      if (r.success && r.logoUrl) {
        setLogoUrl(r.logoUrl);
        toast.success(t("savedSuccess"));
        router.refresh();
      } else {
        toast.error(t("uploadFailed"));
      }
      e.target.value = "";
    });
  };

  const isDirty =
    firstName.trim() !== initialFirstName.trim() ||
    secondName.trim() !== initialSecondName.trim() ||
    selectedFile !== null;

  return (
    <div className="space-y-8">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 lg:self-start">
          <CardHeader className="border-b px-6 py-5">
            <CardTitle className="text-base">{t("title")}</CardTitle>
            <CardDescription>
              Update your photo and personal details.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-6 py-6 space-y-8">
            <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={handleFileChange}
              />

              <div
                className={cn(
                  "relative shrink-0 cursor-pointer rounded-full transition-all duration-200",
                  isDragOver
                    ? "scale-105 ring-[3px] ring-primary ring-offset-4 ring-offset-background"
                    : "ring-1 ring-border ring-offset-4 ring-offset-background hover:ring-primary/40"
                )}
                onDragOver={handleDragOver}
                onDragEnter={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                title={t("uploadAvatar")}
              >
                <Avatar className="h-28 w-28">
                  <AvatarImage src={displayAvatar ?? undefined} />
                  <AvatarFallback className="text-3xl">{initials}</AvatarFallback>
                </Avatar>

                <div
                  className={cn(
                    "absolute inset-0 flex items-center justify-center rounded-full transition-all duration-200",
                    isDragOver
                      ? "bg-primary/80 text-primary-foreground"
                      : "bg-black/30 opacity-0 hover:opacity-100"
                  )}
                >
                  {isDragOver ? (
                    <Upload className="h-6 w-6" />
                  ) : (
                    <Camera className="h-5 w-5 text-white" />
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-2.5 min-w-0 pt-1">
                <div>
                  <p className="text-sm font-medium">{t("avatar")}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    JPEG, PNG, WebP or GIF. Drag & drop or click to browse. Max 5MB.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                  >
                    {hasAvatar ? t("changeAvatar") : t("uploadAvatar")}
                  </Button>
                  {hasAvatar && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveAvatar();
                      }}
                      disabled={isPending}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                      {t("removeAvatar")}
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="first_name">{t("firstName")}</Label>
                <Input
                  id="first_name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  disabled={isPending}
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="second_name">{t("secondName")}</Label>
                <Input
                  id="second_name"
                  value={secondName}
                  onChange={(e) => setSecondName(e.target.value)}
                  disabled={isPending}
                  className="h-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">{t("email")}</Label>
              <Input
                id="email"
                value={email}
                disabled
                className="h-10 bg-muted/50"
              />
              <p className="text-xs text-muted-foreground">{t("emailHint")}</p>
            </div>

            {isAdmin && (
              <div className="space-y-2">
                <Label>{t("crmLogo")}</Label>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-muted overflow-hidden border">
                    {logoUrl ? (
                      <img src={logoUrl} alt="CRM Logo" className="h-full w-full object-cover" />
                    ) : (
                      <Image className="h-5 w-5 text-muted-foreground/40" />
                    )}
                  </div>
                  <div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => logoInputRef.current?.click()}
                      disabled={isUploadingLogo}
                    >
                      {isUploadingLogo ? (
                        <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />{t("uploading")}</>
                      ) : (
                        <><Upload className="mr-1.5 h-3.5 w-3.5" />{logoUrl ? t("changeLogo") : t("uploadLogo")}</>
                      )}
                    </Button>
                    <p className="text-[11px] text-muted-foreground mt-1">{t("crmLogoDesc")}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 border-t pt-5">
              <Button
                onClick={handleSave}
                disabled={!isDirty || isPending}
              >
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isPending ? t("saving") : t("saveChanges")}
              </Button>
              {isDirty && !isPending && (
                <span className="text-xs text-muted-foreground">
                  You have unsaved changes
                </span>
              )}
            </div>
            </CardContent>
          </Card>

        <div className="flex flex-col gap-4">
          <Card className="group transition-shadow hover:shadow-md">
            <CardHeader className="pb-3 px-5 pt-5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                  <Palette className="h-4 w-4 text-muted-foreground" />
                </div>
                <CardTitle className="text-sm">{t("appearance")}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="px-5 pb-5 space-y-3">
              <CardDescription className="text-xs">
                {t("appearanceDesc")}
              </CardDescription>
              <div className="flex flex-wrap gap-2.5">
                {THEME_COLORS.map((c) => {
                  const isActive = (pendingColor ?? themeColor) === c.color || (!pendingColor && !themeColor && c.id === "green");
                  return (
                    <button
                      key={c.id}
                      type="button"
                      title={c.label}
                      onClick={() => handleColorSelect(c.color)}
                      className={cn(
                        "relative flex h-8 w-8 items-center justify-center rounded-full transition-all duration-150 hover:scale-110",
                        isActive && "ring-2 ring-offset-2 ring-offset-card"
                      )}
                      style={{
                        backgroundColor: c.color,
                        ...(isActive && { ringColor: c.color }),
                      }}
                    >
                      {isActive && <Check className="h-4 w-4 text-white drop-shadow-sm" />}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="group transition-shadow hover:shadow-md">
            <CardHeader className="pb-3 px-5 pt-5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                  <Bell className="h-4 w-4 text-muted-foreground" />
                </div>
                <CardTitle className="text-sm">{t("notifications")}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="px-5 pb-5 space-y-1">
              <CardDescription className="text-xs mb-3">
                {t("notificationsDesc")}
              </CardDescription>
              {allNotifications.map((item) => (
                <div
                  key={item.key}
                  className="flex items-center justify-between py-1.5"
                >
                  <Label
                    htmlFor={`notif-${item.key}`}
                    className="text-xs cursor-pointer flex-1 pr-2"
                  >
                    {item.label}
                  </Label>
                  <Switch
                    id={`notif-${item.key}`}
                    checked={notifPrefs[item.key] ?? true}
                    onCheckedChange={(checked) => handleNotifToggle(item.key, checked)}
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="group transition-shadow hover:shadow-md">
            <CardHeader className="pb-3 px-5 pt-5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                  <Bell className="h-4 w-4 text-muted-foreground" />
                </div>
                <CardTitle className="text-sm">{t("adTrackingVisibility")}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="px-5 pb-5 space-y-3">
              <CardDescription className="text-xs">
                {t("adTrackingVisibilityDesc")}
              </CardDescription>
              <div className="flex items-center justify-between py-1.5">
                <Label
                  htmlFor="ad-tracking-toggle"
                  className="text-xs cursor-pointer flex-1 pr-2"
                >
                  {t("adTrackingVisibilityLabel")}
                </Label>
                <Switch
                  id="ad-tracking-toggle"
                  checked={showAdTracking}
                  onCheckedChange={handleAdTrackingToggle}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="group transition-shadow hover:shadow-md">
            <CardHeader className="pb-3 px-5 pt-5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                </div>
                <CardTitle className="text-sm">{t("security")}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <CardDescription className="text-xs leading-relaxed">
                {t("securityDesc")}
              </CardDescription>
              <span className="mt-2 inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-medium text-primary">
                {t("comingSoon")}
              </span>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
