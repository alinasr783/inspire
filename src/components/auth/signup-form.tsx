"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Eye, EyeOff, Loader2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { signUp } from "@/lib/auth-actions";

export function SignupForm() {
  const t = useTranslations("Auth");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(
      z
        .object({
          first_name: z.string().trim().min(1, "firstNameRequired"),
          second_name: z.string().trim().min(1, "secondNameRequired"),
          phone: z.string().trim().min(8, "phoneMin"),
          email: z.string().trim().min(1, "emailRequired").email("emailInvalid"),
          password: z.string().min(6, "passwordMin"),
          confirm: z.string().min(1, "confirmRequired"),
        })
        .refine((d) => d.password === d.confirm, {
          path: ["confirm"],
          message: "passwordMismatch",
        })
    ),
  });

  const onSubmit = handleSubmit((values) => {
    setServerError(null);
    const fd = new FormData();
    fd.append("first_name", values.first_name);
    fd.append("second_name", values.second_name);
    fd.append("phone", values.phone);
    fd.append("email", values.email);
    fd.append("password", values.password);
    fd.append("confirm", values.confirm);

    startTransition(async () => {
      const result = await signUp(fd);

      if (result.success) {
        router.push(`/auth/confirmed?sent=1`);
        router.refresh();
        return;
      }

      if (result.fieldErrors) {
        for (const [field, msg] of Object.entries(result.fieldErrors)) {
          setError(field as keyof typeof values, { message: msg });
        }
      }

      setServerError(result.error);
    });
  });

  const errorMsg = (key: string | undefined) =>
    key ? t(`errors.${key}`) : undefined;

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {serverError && (
        <Alert variant="destructive">
          <AlertDescription>{t(`errors.${serverError}`)}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="first_name">
            {t("firstName")} <span className="text-destructive">*</span>
          </Label>
          <Input
            id="first_name"
            autoComplete="given-name"
            {...register("first_name")}
          />
          {errors.first_name && (
            <p className="text-sm text-destructive">{errorMsg(errors.first_name.message)}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="second_name">
            {t("secondName")} <span className="text-destructive">*</span>
          </Label>
          <Input
            id="second_name"
            autoComplete="family-name"
            {...register("second_name")}
          />
          {errors.second_name && (
            <p className="text-sm text-destructive">{errorMsg(errors.second_name.message)}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">
          {t("phone")} <span className="text-destructive">*</span>
        </Label>
        <Input
          id="phone"
          type="tel"
          autoComplete="tel"
          dir="ltr"
          {...register("phone")}
        />
        {errors.phone && (
          <p className="text-sm text-destructive">{errorMsg(errors.phone.message)}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">
          {t("email")} <span className="text-destructive">*</span>
        </Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          dir="ltr"
          {...register("email")}
        />
        {errors.email && (
          <p className="text-sm text-destructive">{errorMsg(errors.email.message)}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">
          {t("password")} <span className="text-destructive">*</span>
        </Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            {...register("password")}
          />
          <button
            type="button"
            className="absolute end-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
            onClick={() => setShowPassword(!showPassword)}
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.password && (
          <p className="text-sm text-destructive">{errorMsg(errors.password.message)}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirm">
          {t("confirmPassword")} <span className="text-destructive">*</span>
        </Label>
        <div className="relative">
          <Input
            id="confirm"
            type={showConfirm ? "text" : "password"}
            autoComplete="new-password"
            {...register("confirm")}
          />
          <button
            type="button"
            className="absolute end-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
            onClick={() => setShowConfirm(!showConfirm)}
            tabIndex={-1}
          >
            {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.confirm && (
          <p className="text-sm text-destructive">{errorMsg(errors.confirm.message)}</p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
        {t("submit.signup")}
      </Button>
    </form>
  );
}
