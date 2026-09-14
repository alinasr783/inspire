"use client";

import { useRef, useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { createUnit, updateUnit } from "@/lib/unit-actions";
import { getUnitDropdownOptions } from "@/lib/unit-dropdown-actions";
import { getAllEmployees } from "@/lib/client-dropdown-actions";
import { UnitDynamicSelect } from "@/components/units/unit-dynamic-select";
import type { ColumnConfig } from "@/lib/unit-config";

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
  assigned_employee: z.string().trim().optional().default(""),
});

type FormValues = z.output<typeof baseSchema>;

interface UnitFormProps {
  mode: "create" | "edit";
  defaultValues?: Partial<FormValues>;
  unitId?: string;
  allColumns: ColumnConfig[];
  customFieldValues?: Record<string, unknown>;
}

const selectClass = "flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm text-foreground [&>option]:text-foreground [&>option]:bg-background";

export function UnitForm({ mode, defaultValues, unitId, allColumns, customFieldValues }: UnitFormProps) {
  const t = useTranslations("Properties");
  const formRef = useRef<HTMLFormElement>(null);
  const enabledColumns = allColumns.filter((c) => c.enabled);
  const customColumns = enabledColumns.filter((c) => !c.is_builtin);

  const [dropdownOptions, setDropdownOptions] = useState<Record<string, string[]>>({});
  const [employees, setEmployees] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    Promise.all([
      getUnitDropdownOptions("finishing_status"),
      getUnitDropdownOptions("rent_sale"),
      getUnitDropdownOptions("unit_type"),
      getAllEmployees(),
    ]).then(([fs, rs, ut, emps]) => {
      setDropdownOptions({ finishing_status: fs, rent_sale: rs, unit_type: ut });
      setEmployees(emps as { id: string; name: string }[]);
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
    console.log("[UnitForm] onSubmit called with values:", values);

    const fd = new FormData();
    Object.entries(values).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") {
        fd.append(k, String(v));
      }
    });

    const native = formRef.current ? new FormData(formRef.current) : new FormData();
    for (const col of customColumns) {
      if (col.type === "multi_select" || col.type === "checkbox") continue;
      const val = native.get(col.key);
      if (val && typeof val === "string" && val.length > 0) {
        fd.append(col.key, val);
      }
    }

    const customFields: Record<string, unknown> = {};
    for (const col of customColumns) {
      if (col.type === "multi_select") {
        // Strict: only values from the native checkboxes (which mirror col.options).
        const picked = native.getAll(`${col.key}__multi`).filter((v): v is string => typeof v === "string" && v.length > 0);
        const allowed = new Set(col.options ?? []);
        const clean = [...new Set(picked.filter((v) => allowed.has(v)))];
        if (clean.length > 0) customFields[col.key] = clean;
        continue;
      }
      if (col.type === "checkbox") {
        const val = native.get(col.key);
        if (val === "true" || val === "on") customFields[col.key] = true;
        continue;
      }
      const val = fd.get(col.key) ?? native.get(col.key);
      if (val && typeof val === "string" && val.length > 0) {
        if (col.type === "select" && !(col.options ?? []).includes(val)) continue;
        customFields[col.key] = col.type === "number" ? Number(val) : val;
      }
    }
    fd.append("custom_fields", JSON.stringify(customFields));

    console.log("[UnitForm] FormData entries:", Array.from(fd.entries()));

    try {
      console.log("[UnitForm] Calling createUnit...");
      await createUnit(fd);
      console.log("[UnitForm] createUnit succeeded (redirect should happen)");
    } catch (err) {
      console.error("[UnitForm] createUnit error:", err);
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
        case "assigned_employee":
          return (
            <div key={key} className="space-y-2">
              <Label htmlFor={key}>{col.label_ar}</Label>
              <select id={key} className={selectClass} value={String(watch(key as any) ?? "")} onChange={(e) => setValue(key as any, e.target.value)}>
                <option value="">—</option>
                {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
          );
        default:
          return null;
      }
    }

    const storedMulti: string[] = Array.isArray(customFieldValues?.[key])
      ? (customFieldValues?.[key] as unknown[]).map((v) => String(v))
      : [];
    const storedCheck = customFieldValues?.[key] === true || customFieldValues?.[key] === "true";

    return (
      <div key={key} className="space-y-2">
        <Label htmlFor={key}>{col.label_ar}</Label>
        {col.type === "select" ? (
          <select id={key} name={key} className={selectClass} defaultValue={String(customFieldValues?.[key] ?? "")}>
            <option value=""></option>
            {(col.options ?? []).map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        ) : col.type === "multi_select" ? (
          <div className="space-y-1.5 rounded-lg border border-input p-2.5">
            {(col.options ?? []).map((opt) => (
              <label key={opt} className="flex cursor-pointer items-center gap-2 text-sm select-none">
                <input
                  type="checkbox"
                  name={`${key}__multi`}
                  value={opt}
                  defaultChecked={storedMulti.includes(opt)}
                  className="h-4 w-4"
                />
                <span>{opt}</span>
              </label>
            ))}
            {(col.options ?? []).length === 0 && (
              <p className="text-xs text-muted-foreground">لا توجد اختيارات معرفة لهذا العمود</p>
            )}
          </div>
        ) : col.type === "checkbox" ? (
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-input px-2.5 py-2 text-sm select-none">
            <input
              type="checkbox"
              id={key}
              name={key}
              value="true"
              defaultChecked={storedCheck}
              className="h-4 w-4"
            />
            <span className="text-muted-foreground">نعم</span>
          </label>
        ) : col.type === "textarea" ? (
          <textarea id={key} name={key} className="flex min-h-20 w-full resize-y rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm" defaultValue={String(customFieldValues?.[key] ?? "")} />
        ) : (
          <Input
            id={key}
            name={key}
            type={col.type === "number" ? "number" : col.type === "date" ? "date" : "text"}
            dir={col.type === "number" ? "ltr" : undefined}
            defaultValue={String(customFieldValues?.[key] ?? "")}
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
        <Button type="button" variant="outline" onClick={() => window.history.back()}>
          {mode === "edit" ? t("cancel") : t("cancel")}
        </Button>
      </div>
    </form>
  );
}
