"use client";

import { useRef, useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { addClient, updateClient } from "@/lib/client-actions";
import { getDropdownOptions } from "@/lib/client-dropdown-actions";
import { DynamicSelect } from "./dynamic-select";
import type { ColumnConfig } from "@/lib/client-config-actions";

const maybeNum = (inner: z.ZodTypeAny) =>
  z.preprocess((v) => (v === "" ? undefined : v), inner);

const baseSchema = z.object({
  customer_name: z.string().trim().min(1),
  phone: z.string().trim().min(1),
  phone_alt: z.string().trim().optional().default(""),
  budget_from: maybeNum(z.coerce.number().positive().optional()),
  budget_to: maybeNum(z.coerce.number().positive().optional()),
  payment_method: z.string().trim().optional().default(""),
  preferred_area: z.string().trim().optional().default(""),
  unit_type: z.string().trim().optional().default(""),
  bedrooms: z.string().trim().optional().default(""),
  preferred_developer: z.string().trim().optional().default(""),
  source: z.string().trim().optional().default(""),
  additional_notes: z.string().trim().optional().default(""),
  last_contact_date: z.string().trim().optional().default(""),
  assigned_employee: z.string().trim().optional().default(""),
});

type FormValues = z.output<typeof baseSchema>;

interface ClientFormProps {
  mode: "create" | "edit";
  defaultValues?: Partial<FormValues>;
  clientId?: string;
  customColumns: ColumnConfig[];
  assignedEmployeeValue?: string;
  employees?: { id: string; name: string }[];
}

const selectClass = "flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm text-foreground [&>option]:text-foreground [&>option]:bg-background";

export function ClientForm({ mode, defaultValues, clientId, customColumns, assignedEmployeeValue, employees }: ClientFormProps) {
  const t = useTranslations("Clients");
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  const [dropdownOptions, setDropdownOptions] = useState<Record<string, string[]>>({
    source: [],
    unit_type: [],
    payment_method: [],
    preferred_area: [],
    preferred_developer: [],
    bedrooms: [],
  });

  useEffect(() => {
    const load = async () => {
      const [source, unit_type, payment_method, preferred_area, preferred_developer, bedrooms] =
        await Promise.all([
          getDropdownOptions("source"),
          getDropdownOptions("unit_type"),
          getDropdownOptions("payment_method"),
          getDropdownOptions("preferred_area"),
          getDropdownOptions("preferred_developer"),
          getDropdownOptions("bedrooms"),
        ]);
      setDropdownOptions({ source, unit_type, payment_method, preferred_area, preferred_developer, bedrooms });
    };
    load();
  }, []);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(baseSchema) as any,
    defaultValues: {
      customer_name: "",
      phone: "",
      phone_alt: "",
      budget_from: undefined,
      budget_to: undefined,
      payment_method: "",
      preferred_area: "",
      unit_type: "",
      bedrooms: "",
      preferred_developer: "",
      source: "",
      additional_notes: "",
      last_contact_date: "",
      assigned_employee: assignedEmployeeValue || "",
      ...defaultValues,
    },
  });

  const watchedFields = {
    source: watch("source"),
    unit_type: watch("unit_type"),
    payment_method: watch("payment_method"),
    preferred_area: watch("preferred_area"),
    preferred_developer: watch("preferred_developer"),
    bedrooms: watch("bedrooms"),
  };

  const onSubmit = async (values: FormValues) => {
    const fd = new FormData();
    Object.entries(values).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") {
        fd.append(k, String(v));
      }
    });

    if (formRef.current) {
      const native = new FormData(formRef.current);
      for (const col of customColumns.filter((c) => c.enabled)) {
        const val = native.get(col.key);
        if (val && typeof val === "string" && val.length > 0) {
          fd.append(col.key, val);
        }
      }
    }

    const customFields: Record<string, unknown> = {};
    for (const col of customColumns.filter((c) => c.enabled)) {
      const val = fd.get(col.key);
      if (val && typeof val === "string" && val.length > 0) {
        customFields[col.key] = col.type === "number" ? Number(val) : val;
      }
    }
    fd.append("custom_fields", JSON.stringify(customFields));

    if (mode === "edit" && clientId) {
      await updateClient(clientId, fd);
    } else {
      await addClient(fd);
    }
  };

  const renderDynamicSelect = (
    label: string,
    fieldName: keyof FormValues,
    category: string,
    required?: boolean
  ) => (
    <div className="space-y-2">
      <Label htmlFor={fieldName}>
        {label}
        {required ? " *" : ""}
      </Label>
      <DynamicSelect
        options={dropdownOptions[category] || []}
        value={String(watchedFields[fieldName as keyof typeof watchedFields] || "")}
        onChange={(val) => setValue(fieldName, val)}
        placeholder={label}
        category={category}
      />
    </div>
  );

  return (
    <form ref={formRef} onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="customer_name">{t("customerName")} *</Label>
          <Input id="customer_name" {...register("customer_name")} />
          {errors.customer_name && (
            <p className="text-sm text-destructive">{t("errors.createFailed")}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">{t("phone")} *</Label>
          <Input id="phone" dir="ltr" {...register("phone")} />
          {errors.phone && (
            <p className="text-sm text-destructive">{t("errors.createFailed")}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone_alt">{t("phoneAlt")}</Label>
          <Input id="phone_alt" dir="ltr" {...register("phone_alt")} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="budget_from">{t("budget")} (from)</Label>
          <Input id="budget_from" type="number" dir="ltr" step="0.01" {...register("budget_from")} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="budget_to">{t("budget")} (to)</Label>
          <Input id="budget_to" type="number" dir="ltr" step="0.01" {...register("budget_to")} />
        </div>

        {renderDynamicSelect(t("paymentMethod"), "payment_method", "payment_method")}
        {renderDynamicSelect(t("preferredArea"), "preferred_area", "preferred_area")}
        {renderDynamicSelect(t("unitType"), "unit_type", "unit_type")}
        {renderDynamicSelect(t("bedrooms"), "bedrooms", "bedrooms")}
        {renderDynamicSelect(t("preferredDeveloper"), "preferred_developer", "preferred_developer")}
        {renderDynamicSelect(t("source"), "source", "source")}

        <div className="space-y-2">
          <Label htmlFor="last_contact_date">{t("lastContactDate")}</Label>
          <Input id="last_contact_date" type="date" dir="ltr" {...register("last_contact_date")} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="assigned_employee">{t("assignedEmployee")}</Label>
          <select
            id="assigned_employee"
            className={selectClass}
            {...register("assigned_employee")}
          >
            <option value="">—</option>
            {(employees ?? []).map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="additional_notes">{t("additionalNotes")}</Label>
          <textarea
            id="additional_notes"
            className="flex min-h-20 w-full resize-y rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm"
            {...register("additional_notes")}
          />
        </div>

        {customColumns
          .filter((c) => c.enabled)
          .map((col) => (
            <div key={col.key} className="space-y-2">
              <Label htmlFor={col.key}>
                {col.label_ar}
              </Label>
              {col.type === "select" ? (
                <select
                  id={col.key}
                  name={col.key}
                  className={selectClass}
                >
                  <option value=""></option>
                  {(col.options ?? []).map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              ) : (
                <Input
                  id={col.key}
                  name={col.key}
                  type={col.type === "number" ? "number" : col.type === "date" ? "date" : "text"}
                  dir={col.type === "number" ? "ltr" : undefined}
                />
              )}
            </div>
          ))}
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {t("save")}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          {t("cancel")}
        </Button>
      </div>
    </form>
  );
}
