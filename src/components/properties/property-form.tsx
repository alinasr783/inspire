"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { createProperty, updateProperty } from "@/lib/property-actions";

const maybeNum = (inner: z.ZodTypeAny) =>
  z.preprocess((v) => (v === "" ? undefined : v), inner);

const numberOpt = () => maybeNum(z.coerce.number().positive().optional());
const intOpt = () => maybeNum(z.coerce.number().int().nonnegative().optional());

const schema = z.object({
  title: z.string().trim().min(1),
  description: z.string().trim().optional().default(""),
  price: numberOpt(),
  status: z.enum(["available", "sold", "rented", "under_construction", "reserved"]),
  type: z.enum(["apartment", "villa", "duplex", "office", "land", "commercial", "other"]),
  location: z.string().trim().optional().default(""),
  address: z.string().trim().optional().default(""),
  area_sqm: numberOpt(),
  bedrooms: intOpt(),
  bathrooms: intOpt(),
  floors: intOpt(),
});

type FormValues = z.output<typeof schema>;

interface PropertyFormProps {
  mode: "create" | "edit";
  defaultValues?: Partial<FormValues>;
  propertyId?: string;
}

export function PropertyForm({ mode, defaultValues, propertyId }: PropertyFormProps) {
  const t = useTranslations("Properties");
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      title: "",
      description: "",
      status: "available",
      type: "apartment",
      location: "",
      address: "",
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

    if (mode === "edit" && propertyId) {
      await updateProperty(propertyId, fd);
    } else {
      await createProperty(fd);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="title">{t("titleLabel")} *</Label>
          <Input id="title" {...register("title")} />
          {errors.title && <p className="text-sm text-destructive">{t("errors.createFailed")}</p>}
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="description">{t("description")}</Label>
          <textarea
            id="description"
            className="flex min-h-20 w-full resize-y rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm"
            {...register("description")}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="price">{t("price")}</Label>
          <Input id="price" type="number" dir="ltr" step="0.01" {...register("price")} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">{t("status")} *</Label>
          <select
            id="status"
            className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm"
            {...register("status")}
          >
            {["available", "sold", "rented", "under_construction", "reserved"].map((s) => (
              <option key={s} value={s}>{t(`status_${s}`)}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="type">{t("type")} *</Label>
          <select
            id="type"
            className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm"
            {...register("type")}
          >
            {["apartment", "villa", "duplex", "office", "land", "commercial", "other"].map((s) => (
              <option key={s} value={s}>{t(`type_${s}`)}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="location">{t("location")}</Label>
          <Input id="location" {...register("location")} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="address">{t("address")}</Label>
          <Input id="address" {...register("address")} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="area_sqm">{t("area")}</Label>
          <Input id="area_sqm" type="number" dir="ltr" step="0.1" {...register("area_sqm")} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="bedrooms">{t("bedrooms")}</Label>
          <Input id="bedrooms" type="number" dir="ltr" {...register("bedrooms")} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="bathrooms">{t("bathrooms")}</Label>
          <Input id="bathrooms" type="number" dir="ltr" {...register("bathrooms")} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="floors">{t("floors")}</Label>
          <Input id="floors" type="number" dir="ltr" {...register("floors")} />
        </div>
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
