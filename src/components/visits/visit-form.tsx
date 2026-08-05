"use client";

import { useRef, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { createVisit, updateVisit } from "@/lib/visit-actions";
import { SearchableSelect } from "@/components/visits/searchable-select";

const schema = z.object({
  client_id: z.string().trim().min(1),
  unit_id: z.string().trim().min(1),
  compound_name: z.string().trim().min(1),
  building_number: z.string().trim().min(1),
  apartment_number: z.string().trim().min(1),
  visit_date: z.string().trim().min(1),
  notes: z.string().trim().optional().default(""),
  post_visit_notes: z.string().trim().optional().default(""),
  status: z.enum(["upcoming", "completed", "cancelled"]).optional(),
  assigned_to: z.string().trim().optional().default(""),
});

type FormValues = z.output<typeof schema>;

interface VisitFormProps {
  mode: "create" | "edit";
  locale: string;
  isAdmin: boolean;
  defaultValues?: Partial<FormValues>;
  visitId?: string;
  clients: { id: string; customer_name: string; phone: string }[];
  units: {
    id: string;
    customer_name: string;
    phone: string;
    compound_name: string;
    building_number: string;
    unit_type: string;
  }[];
  employees: { id: string; first_name: string; second_name: string }[];
}

const selectClass =
  "flex h-9 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm text-foreground [&>option]:text-foreground [&>option]:bg-background";

export function VisitForm({
  mode,
  locale,
  isAdmin,
  defaultValues,
  visitId,
  clients,
  units,
  employees,
}: VisitFormProps) {
  const t = useTranslations("Visits");
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      client_id: "",
      unit_id: "",
      compound_name: "",
      building_number: "",
      apartment_number: "",
      visit_date: new Date().toISOString().slice(0, 16),
      notes: "",
      post_visit_notes: "",
      status: "upcoming",
      assigned_to: "",
      ...defaultValues,
    },
  });

  const selectedUnitId = watch("unit_id");

  const clientOptions = clients.map((c) => ({
    id: c.id,
    label: c.customer_name,
    sub: c.phone || undefined,
  }));

  const unitOptions = units.map((u) => ({
    id: u.id,
    label: `${u.customer_name}${u.unit_type ? ` - ${u.unit_type}` : ""}`,
    sub: `${u.compound_name}${u.phone ? ` - ${u.phone}` : ""}`,
  }));

  const employeeOptions = employees.map((emp) => ({
    id: emp.id,
    label: [emp.first_name, emp.second_name].filter(Boolean).join(" ") || emp.id,
  }));

  const handleUnitChange = useCallback(
    (id: string) => {
      setValue("unit_id", id);
      if (id) {
        const unit = units.find((u) => u.id === id);
        if (unit) {
          setValue("compound_name", unit.compound_name);
          setValue("building_number", unit.building_number);
        }
      }
    },
    [setValue, units]
  );

  const onSubmit = async (values: FormValues) => {
    const data = {
      client_id: values.client_id,
      unit_id: values.unit_id,
      compound_name: values.compound_name,
      building_number: values.building_number,
      apartment_number: values.apartment_number,
      visit_date: new Date(values.visit_date).toISOString(),
      notes: values.notes,
      post_visit_notes: values.post_visit_notes,
      assigned_to: values.assigned_to || undefined,
    };

    if (mode === "create") {
      const result = await createVisit(data);
      if (result.success) {
        toast.success(t("createSuccess"));
        router.push("/visits");
      } else {
        toast.error(t(`errors.${result.error}`));
      }
    } else if (mode === "edit" && visitId) {
      const result = await updateVisit(visitId, {
        ...data,
        status: values.status,
      });
      if (result.success) {
        toast.success(t("updateSuccess"));
        router.push("/visits");
      } else {
        toast.error(t(`errors.${result.error}`));
      }
    }
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>{t("client")} *</Label>
          <SearchableSelect
            options={clientOptions}
            value={watch("client_id")}
            onChange={(id) => setValue("client_id", id)}
            placeholder={t("searchClient")}
            emptyText={t("noClient")}
            addNewLabel={t("addNewClient")}
            addNewHref={`/${locale}/clients/new`}
          />
          {errors.client_id && (
            <p className="text-xs text-destructive">{errors.client_id.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label>{t("property")} *</Label>
          <SearchableSelect
            options={unitOptions}
            value={selectedUnitId || ""}
            onChange={handleUnitChange}
            placeholder={t("searchProperty")}
            addNewLabel={t("addNewProperty")}
            addNewHref={`/${locale}/properties/new`}
          />
          {errors.unit_id && (
            <p className="text-xs text-destructive">{errors.unit_id.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="compound_name">{t("compoundName")} *</Label>
          <Input id="compound_name" {...register("compound_name")} />
          {errors.compound_name && (
            <p className="text-xs text-destructive">{errors.compound_name.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="building_number">{t("buildingNumber")} *</Label>
          <Input id="building_number" {...register("building_number")} />
          {errors.building_number && (
            <p className="text-xs text-destructive">{errors.building_number.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="apartment_number">{t("apartmentNumber")} *</Label>
          <Input id="apartment_number" {...register("apartment_number")} />
          {errors.apartment_number && (
            <p className="text-xs text-destructive">{errors.apartment_number.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="visit_date">{t("visitDate")} *</Label>
          <Input
            id="visit_date"
            type="datetime-local"
            {...register("visit_date")}
          />
          {errors.visit_date && (
            <p className="text-xs text-destructive">{errors.visit_date.message}</p>
          )}
        </div>

        {isAdmin && (
          <div className="space-y-1.5">
            <Label>{t("assignedTo")}</Label>
            <SearchableSelect
              options={employeeOptions}
              value={watch("assigned_to")}
              onChange={(id) => setValue("assigned_to", id)}
              placeholder={t("selectEmployee")}
            />
          </div>
        )}

        {mode === "edit" && (
          <div className="space-y-1.5">
            <Label htmlFor="status">{t("status")}</Label>
            <select
              id="status"
              className={selectClass}
              {...register("status")}
            >
              <option value="upcoming">{t("status_upcoming")}</option>
              <option value="completed">{t("status_completed")}</option>
              <option value="cancelled">{t("status_cancelled")}</option>
            </select>
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="notes">{t("notes")}</Label>
        <textarea
          id="notes"
          rows={3}
          className="flex min-h-[80px] w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          placeholder={t("notesPlaceholder")}
          {...register("notes")}
        />
      </div>

      {mode === "edit" && (
        <div className="space-y-1.5">
          <Label htmlFor="post_visit_notes">{t("postVisitNotes")}</Label>
          <textarea
            id="post_visit_notes"
            rows={3}
            className="flex min-h-[80px] w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            placeholder={t("postVisitNotesPlaceholder")}
            {...register("post_visit_notes")}
          />
        </div>
      )}

      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/visits")}
          disabled={isSubmitting}
        >
          {t("cancel")}
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              {t("save")}
            </span>
          ) : (
            t("save")
          )}
        </Button>
      </div>
    </form>
  );
}
