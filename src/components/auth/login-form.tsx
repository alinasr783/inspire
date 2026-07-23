"use client";

import { useState } from "react";
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
import { signIn } from "@/lib/auth-actions";

export function LoginForm() {
  const t = useTranslations("Auth");
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(
      z.object({
        email: z.string().trim().min(1, "emailRequired").email("emailInvalid"),
        password: z.string().min(1, "passwordRequired"),
      })
    ),
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true);
    setServerError(null);
    const fd = new FormData();
    fd.append("email", values.email);
    fd.append("password", values.password);

    try {
      const result = await signIn(fd);

      if (result.success) {
        router.push("/");
        router.refresh();
        return;
      }

      if (result.fieldErrors) {
        for (const [field, msg] of Object.entries(result.fieldErrors)) {
          setError(field as keyof typeof values, { message: msg });
        }
      }

      setServerError(result.error);
    } finally {
      setSubmitting(false);
    }
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
            autoComplete="current-password"
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

      <div className="text-end">
        <a
          href="#"
          className="text-xs text-muted-foreground hover:text-primary"
        >
          {t("forgotPassword")}
        </a>
      </div>

      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
        {t("submit.login")}
      </Button>
    </form>
  );
}
