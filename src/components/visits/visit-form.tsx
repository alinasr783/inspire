"use client";

import { useRef, useState, useCallback } from "react";
import { useForm, useFieldArray } from "react-hook-form";
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
import { Plus, Trash2 } from "lucide-react";

const propertyEntrySchema = z.object({
  unit_id: z.string().optional().default(""),
  compound_name: z.string().trim(),
  building_number: z.string().trim(),
  apartment_number: z.string().trim(),
  is_external_property: z.boolean().optional().default(false),
  property_broker_phone: z.string().trim().optional().default(""),
});

const schema = z.object({
  client_id: z.string().trim().optional().default(""),
  is_external_client: z.boolean().optional().default(false),
  client_broker_phone: z.string().trim().optional().default(""),
  properties: z.array(propertyEntrySchema).min(1, "At least one property required"),
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

const inputClass = "flex h-9 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm";

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
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      client_id: "",
      is_external_client: false,
      client_broker_phone: "",
      properties: [{ unit_id: "", compound_name: "", building_number: "", apartment_number: "", is_external_property: false, property_broker_phone: "" }],
      visit_date: new Date().toISOString().slice(0, 16),
      notes: "",
      post_visit_notes: "",
      status: "upcoming",
      assigned_to: "",
      ...defaultValues,
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "properties" });

  const isExternalClient = watch("is_external_client");

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
    (idx: number, id: string) => {
      setValue(`properties.${idx}.unit_id`, id);
      if (id) {
        const unit = units.find((u) => u.id === id);
        if (unit) {
          setValue(`properties.${idx}.compound_name`, unit.compound_name);
          setValue(`properties.${idx}.building_number`, unit.building_number);
        }
      }
    },
    [setValue, units]
  );

  const onSubmit = async (values: FormValues) => {
    const shared = {
      visit_date: new Date(values.visit_date).toISOString(),
      notes: values.notes,
      post_visit_notes: values.post_visit_notes,
      assigned_to: values.assigned_to || undefined,
      is_external_client: values.is_external_client,
      client_broker_phone: values.client_broker_phone,
    };

    if (mode === "create") {
      let allOk = true;
      for (const prop of values.properties) {
        const data = {
          client_id: values.is_external_client ? "external" : values.client_id,
          unit_id: prop.is_external_property ? "external" : prop.unit_id,
          compound_name: prop.compound_name,
          building_number: prop.building_number,
          apartment_number: prop.apartment_number,
          is_external_property: prop.is_external_property,
          property_broker_phone: prop.property_broker_phone,
          ...shared,
        };
        const result = await createVisit(data as any);
        if (!result.success) { allOk = false; toast.error(t(`errors.${result.error}`)); }
      }
      if (allOk) { toast.success(t("createSuccess")); router.push("/visits"); }
    } else if (mode === "edit" && visitId) {
      const prop = values.properties[0] || {};
      const result = await updateVisit(visitId, {
        client_id: values.is_external_client ? "external" : values.client_id,
        unit_id: prop.is_external_property ? "external" : prop.unit_id,
        compound_name: prop.compound_name,
        building_number: prop.building_number,
        apartment_number: prop.apartment_number,
        is_external_property: prop.is_external_property,
        property_broker_phone: prop.property_broker_phone,
        ...shared,
        status: values.status,
      } as any);
      if (result.success) { toast.success(t("updateSuccess")); router.push("/visits"); }
      else { toast.error(t(`errors.${result.error}`)); }
    }
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <div className="flex items-center gap-3">
            <Label className="text-sm">{t("client")} *</Label>
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
              <input type="checkbox" className="h-3.5 w-3.5" {...register("is_external_client")} />
              {t("externalBroker") || "External Broker"}
            </label>
          </div>

          {isExternalClient ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground whitespace-nowrap">{t("brokerPhone") || "Broker Phone"}:</span>
              <Input {...register("client_broker_phone")} placeholder="01xxxxxxxxx" className="h-9" />
            </div>
          ) : (
            <>
              <SearchableSelect
                options={clientOptions}
                value={watch("client_id")}
                onChange={(id) => setValue("client_id", id)}
                placeholder={t("searchClient")}
                emptyText={t("noClient")}
                addNewLabel={t("addNewClient")}
                addNewHref={`/${locale}/clients/new`}
              />
              {errors.client_id && <p className="text-xs text-destructive">{errors.client_id.message}</p>}
            </>
          )}
        </div>

        <div className="sm:col-span-2">
          <div className="flex items-center justify-between mb-2">
            <Label className="text-sm">{t("properties") || "Properties"} *</Label>
            {mode === "create" && (
              <Button type="button" variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => append({ unit_id: "", compound_name: "", building_number: "", apartment_number: "", is_external_property: false, property_broker_phone: "" })}>
                <Plus className="h-3.5 w-3.5" /> {t("addProperty") || "Add Property"}
              </Button>
            )}
          </div>

          <div className="space-y-4">
            {fields.map((field, idx) => {
              const isExtProp = watch(`properties.${idx}.is_external_property`);
              return (
                <div key={field.id} className="rounded-xl border bg-muted/20 p-4 space-y-3">
                  <div className="flex items-center gap-3 justify-between">
                    <span className="text-xs font-medium text-muted-foreground">{t("property") || "Property"} {idx + 1}</span>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
                        <input type="checkbox" className="h-3.5 w-3.5" {...register(`properties.${idx}.is_external_property`)} />
                        {t("externalBroker") || "External Broker"}
                      </label>
                      {fields.length > 1 && (
                        <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-400 hover:text-red-600" onClick={() => remove(idx)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {isExtProp ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground whitespace-nowrap">{t("brokerPhone") || "Broker Phone"}:</span>
                      <Input {...register(`properties.${idx}.property_broker_phone`)} placeholder="01xxxxxxxxx" className="h-9" />
                    </div>
                  ) : (
                    <SearchableSelect
                      options={unitOptions}
                      value={watch(`properties.${idx}.unit_id`) || ""}
                      onChange={(id) => handleUnitChange(idx, id)}
                      placeholder={t("searchProperty")}
                      addNewLabel={t("addNewProperty")}
                      addNewHref={`/${locale}/properties/new`}
                    />
                  )}

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="space-y-1">
                      <Label className="text-xs">{t("compoundName")} *</Label>
                      <Input {...register(`properties.${idx}.compound_name`)} className="h-9 text-sm" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">{t("buildingNumber")} *</Label>
                      <Input {...register(`properties.${idx}.building_number`)} className="h-9 text-sm" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">{t("apartmentNumber")} *</Label>
                      <Input {...register(`properties.${idx}.apartment_number`)} className="h-9 text-sm" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="visit_date">{t("visitDate")} *</Label>
          <Input id="visit_date" type="datetime-local" {...register("visit_date")} />
          {errors.visit_date && <p className="text-xs text-destructive">{errors.visit_date.message}</p>}
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
            <select id="status" className={selectClass} {...register("status")}>
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
        <Button type="button" variant="outline" onClick={() => router.push("/visits")} disabled={isSubmitting}>
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
