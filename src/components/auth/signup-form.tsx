"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { signUp } from "@/lib/auth-actions";

const schema = z
  .object({
    first_name: z.string().trim().min(1),
    second_name: z.string().trim().min(1),
    phone: z.string().trim().min(8),
    email: z.string().trim().email(),
    password: z.string().min(6),
    confirm: z.string().min(6),
  })
  .refine((d) => d.password === d.confirm, {
    path: ["confirm"],
    message: "passwords-do-not-match",
  });

type FormValues = z.infer<typeof schema>;

export function SignupForm() {
  const t = useTranslations("Auth");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = (values: FormValues) => {
    const fd = new FormData();
    fd.append("first_name", values.first_name);
    fd.append("second_name", values.second_name);
    fd.append("phone", values.phone);
    fd.append("email", values.email);
    fd.append("password", values.password);
    fd.append("confirm", values.confirm);
    return signUp(fd);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="first_name">{t("firstName")}</Label>
          <Input id="first_name" autoComplete="given-name" {...register("first_name")} />
          {errors.first_name && (
            <p className="text-sm text-destructive">{t("errors.validation")}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="second_name">{t("secondName")}</Label>
          <Input id="second_name" autoComplete="family-name" {...register("second_name")} />
          {errors.second_name && (
            <p className="text-sm text-destructive">{t("errors.validation")}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">{t("phone")}</Label>
        <Input id="phone" type="tel" autoComplete="tel" dir="ltr" {...register("phone")} />
        {errors.phone && (
          <p className="text-sm text-destructive">{t("errors.validation")}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">{t("email")}</Label>
        <Input id="email" type="email" autoComplete="email" dir="ltr" {...register("email")} />
        {errors.email && (
          <p className="text-sm text-destructive">{t("errors.validation")}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">{t("password")}</Label>
        <Input id="password" type="password" autoComplete="new-password" {...register("password")} />
        {errors.password && (
          <p className="text-sm text-destructive">{t("errors.validation")}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirm">{t("confirmPassword")}</Label>
        <Input id="confirm" type="password" autoComplete="new-password" {...register("confirm")} />
        {errors.confirm && (
          <p className="text-sm text-destructive">{t("errors.validation")}</p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {t("submit.signup")}
      </Button>
    </form>
  );
}
