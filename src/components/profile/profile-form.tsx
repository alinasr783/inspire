"use client";

import { useState, useRef, useTransition, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import { Camera, Bell, Shield, Palette, Trash2, Loader2, Upload } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useRealtime } from "@/components/providers/realtime-provider";
import { updateProfile, removeAvatar } from "@/lib/profile-actions";
import { cn } from "@/lib/utils";

interface ProfileFormProps {
  firstName: string;
  secondName: string;
  email: string;
  avatarUrl: string | null;
}

export function ProfileForm({
  firstName: initialFirstName,
  secondName: initialSecondName,
  email,
  avatarUrl: initialAvatarUrl,
}: ProfileFormProps) {
  const t = useTranslations("Profile");
  const router = useRouter();
  const { refreshCurrentUser } = useRealtime();
  const [firstName, setFirstName] = useState(initialFirstName);
  const [secondName, setSecondName] = useState(initialSecondName);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAvatarUrl);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initials = `${initialFirstName?.[0] ?? ""}${initialSecondName?.[0] ?? ""}`.toUpperCase() || "IN";
  const displayAvatar = previewUrl ?? avatarUrl;
  const hasAvatar = Boolean(displayAvatar);

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

  const isDirty =
    firstName.trim() !== initialFirstName.trim() ||
    secondName.trim() !== initialSecondName.trim() ||
    selectedFile !== null;

  const comingSoonItems = [
    {
      icon: Palette,
      title: t("preferences"),
      description: t("preferencesDesc"),
    },
    {
      icon: Bell,
      title: t("notifications"),
      description: t("notificationsDesc"),
    },
    {
      icon: Shield,
      title: t("security"),
      description: t("securityDesc"),
    },
  ];

  return (
    <div className="space-y-8">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
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
          {comingSoonItems.map((item) => (
            <Card key={item.title} className="group transition-shadow hover:shadow-md">
              <CardHeader className="pb-3 px-5 pt-5">
                <div className="flex items-start justify-between">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted group-hover:bg-primary/10 transition-colors">
                    <item.icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-medium text-primary">
                    {t("comingSoon")}
                  </span>
                </div>
                <CardTitle className="text-sm mt-3">{item.title}</CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-5">
                <CardDescription className="text-xs leading-relaxed">
                  {item.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
