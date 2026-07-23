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
import { createUnit, updateUnit } from "@/lib/unit-actions";
import { getUnitDropdownOptions } from "@/lib/unit-dropdown-actions";
import { UnitDynamicSelect } from "@/components/units/unit-dynamic-select";
import type { ColumnConfig } from "@/lib/unit-config-actions";

const maybeNum = (inner: z.ZodTypeAny) =>
  z.preprocess((v) => (v === "" ? undefined : v), inner);

const baseSchema = z.object({
  customer_name: z.string().trim().min(1),
  phone: z.string().trim().min(1),
  compound_name: z.string().trim().min(1),
  area: z.string().trim().optional().default(""),
  building_number: z.string().trim().optional().default(""),
  finishing_status: z.string().trim().optional().default(""),
  rent_sale: z.string().trim().optional().default(""),
  unit_type: z.string().trim().optional().default(""),
  cash_required: maybeNum(z.coerce.number().positive().optional()),
  remaining: maybeNum(z.coerce.number().positive().optional()),
  last_contact_date: z.string().trim().optional().default(""),
  additional_notes: z.string().trim().optional().default(""),
  feedback: z.string().trim().optional().default(""),
});

type FormValues = z.output<typeof baseSchema>;

interface UnitFormProps {
  mode: "create" | "edit";
  defaultValues?: Partial<FormValues>;
  unitId?: string;
  allColumns: ColumnConfig[];
}

const selectClass = "flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm text-foreground [&>option]:text-foreground [&>option]:bg-background";

export function UnitForm({ mode, defaultValues, unitId, allColumns }: UnitFormProps) {
  const t = useTranslations("Properties");
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const enabledColumns = allColumns.filter((c) => c.enabled);
  const customColumns = enabledColumns.filter((c) => !c.is_builtin);

  const [dropdownOptions, setDropdownOptions] = useState<Record<string, string[]>>({});

  useEffect(() => {
    Promise.all([
      getUnitDropdownOptions("finishing_status"),
      getUnitDropdownOptions("rent_sale"),
      getUnitDropdownOptions("unit_type"),
    ]).then(([fs, rs, ut]) => {
      setDropdownOptions({ finishing_status: fs, rent_sale: rs, unit_type: ut });
    });
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
      compound_name: "",
      area: "",
      building_number: "",
      finishing_status: "",
      rent_sale: "",
      unit_type: "",
      additional_notes: "",
      feedback: "",
      ...defaultValues,
    },
  });

  const onSubmit = async (values: FormValues) => {
    const fd = new FormData();
    Object.entries(values).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") {
        fd.append(k, String(v));
      }
    });

    if (formRef.current) {
      const native = new FormData(formRef.current);
      for (const col of customColumns) {
        const val = native.get(col.key);
        if (val && typeof val === "string" && val.length > 0) {
          fd.append(col.key, val);
        }
      }
    }

    const customFields: Record<string, unknown> = {};
    for (const col of customColumns) {
      const val = fd.get(col.key);
      if (val && typeof val === "string" && val.length > 0) {
        customFields[col.key] = col.type === "number" ? Number(val) : val;
      }
    }
    fd.append("custom_fields", JSON.stringify(customFields));

    if (mode === "edit" && unitId) {
      await updateUnit(unitId, fd);
    } else {
      await createUnit(fd);
    }
  };

  const renderField = (col: ColumnConfig) => {
    const key = col.key;

    if (col.is_builtin) {
      switch (key) {
        case "customer_name":
          return (
            <div key={key} className="space-y-2">
              <Label htmlFor={key}>{col.label_ar} *</Label>
              <Input id={key} {...register(key)} />
              {errors.customer_name && <p className="text-sm text-destructive">{t("errors.createFailed")}</p>}
            </div>
          );
        case "phone":
          return (
            <div key={key} className="space-y-2">
              <Label htmlFor={key}>{col.label_ar} *</Label>
              <Input id={key} dir="ltr" {...register(key)} />
              {errors.phone && <p className="text-sm text-destructive">{t("errors.createFailed")}</p>}
            </div>
          );
        case "compound_name":
          return (
            <div key={key} className="space-y-2">
              <Label htmlFor={key}>{col.label_ar} *</Label>
              <Input id={key} {...register(key)} />
              {errors.compound_name && <p className="text-sm text-destructive">{t("errors.createFailed")}</p>}
            </div>
          );
        case "area":
          return (
            <div key={key} className="space-y-2">
              <Label htmlFor={key}>{col.label_ar}</Label>
              <Input id={key} {...register(key)} />
            </div>
          );
        case "building_number":
          return (
            <div key={key} className="space-y-2">
              <Label htmlFor={key}>{col.label_ar}</Label>
              <Input id={key} {...register(key)} />
            </div>
          );
        case "finishing_status":
          return (
            <div key={key} className="space-y-2">
              <Label htmlFor={key}>{col.label_ar}</Label>
              <UnitDynamicSelect
                options={dropdownOptions.finishing_status ?? []}
                value={watch(key) ?? ""}
                onChange={(val) => setValue(key, val)}
                category={key}
                placeholder={col.label_ar}
              />
            </div>
          );
        case "rent_sale":
          return (
            <div key={key} className="space-y-2">
              <Label htmlFor={key}>{col.label_ar}</Label>
              <UnitDynamicSelect
                options={dropdownOptions.rent_sale ?? []}
                value={watch(key) ?? ""}
                onChange={(val) => setValue(key, val)}
                category={key}
                placeholder={col.label_ar}
              />
            </div>
          );
        case "unit_type":
          return (
            <div key={key} className="space-y-2">
              <Label htmlFor={key}>{col.label_ar}</Label>
              <UnitDynamicSelect
                options={dropdownOptions.unit_type ?? []}
                value={watch(key) ?? ""}
                onChange={(val) => setValue(key, val)}
                category={key}
                placeholder={col.label_ar}
              />
            </div>
          );
        case "cash_required":
          return (
            <div key={key} className="space-y-2">
              <Label htmlFor={key}>{col.label_ar}</Label>
              <Input id={key} type="number" dir="ltr" step="0.01" {...register(key)} />
            </div>
          );
        case "remaining":
          return (
            <div key={key} className="space-y-2">
              <Label htmlFor={key}>{col.label_ar}</Label>
              <Input id={key} type="number" dir="ltr" step="0.01" {...register(key)} />
            </div>
          );
        case "last_contact_date":
          return (
            <div key={key} className="space-y-2">
              <Label htmlFor={key}>{col.label_ar}</Label>
              <Input id={key} type="date" dir="ltr" {...register(key)} />
            </div>
          );
        case "additional_notes":
          return (
            <div key={key} className="space-y-2 sm:col-span-2">
              <Label htmlFor={key}>{col.label_ar}</Label>
              <textarea id={key} className="flex min-h-20 w-full resize-y rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm" {...register(key)} />
            </div>
          );
        case "feedback":
          return (
            <div key={key} className="space-y-2 sm:col-span-2">
              <Label htmlFor={key}>{col.label_ar}</Label>
              <textarea id={key} className="flex min-h-20 w-full resize-y rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm" {...register(key)} />
            </div>
          );
        default:
          return null;
      }
    }

    return (
      <div key={key} className="space-y-2">
        <Label htmlFor={key}>{col.label_ar}</Label>
        {col.type === "select" ? (
          <select id={key} name={key} className={selectClass}>
            <option value=""></option>
            {(col.options ?? []).map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        ) : col.type === "textarea" ? (
          <textarea id={key} name={key} className="flex min-h-20 w-full resize-y rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm" />
        ) : (
          <Input
            id={key}
            name={key}
            type={col.type === "number" ? "number" : col.type === "date" ? "date" : "text"}
            dir={col.type === "number" ? "ltr" : undefined}
          />
        )}
      </div>
    );
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        {enabledColumns.map(renderField)}
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
