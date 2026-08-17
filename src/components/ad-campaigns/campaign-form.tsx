"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Save, Megaphone } from "lucide-react";
import { toast } from "sonner";
import { createCampaign, updateCampaign } from "@/lib/ad-campaign-actions";
import type { AdCampaignRow, AdCampaignStatus } from "@/lib/ad-campaign-types";
import { cn } from "@/lib/utils";

const rtlFlip = "rtl:scale-x-[-1]";

const PLATFORMS = ["facebook", "google", "tiktok", "instagram", "youtube", "snapchat", "other"] as const;
const CURRENCIES = ["EGP", "USD", "SAR", "AED"] as const;

export function CampaignForm({
  mode,
  existing,
  onSuccess,
}: {
  mode: "create" | "edit";
  existing?: AdCampaignRow | null;
  onSuccess?: () => void;
}) {
  const t = useTranslations("AdCampaigns");
  const router = useRouter();

  const [name, setName] = useState(existing?.name ?? "");
  const [totalCost, setTotalCost] = useState(existing?.total_cost?.toString() ?? "");
  const [platform, setPlatform] = useState(existing?.platform ?? "");
  const [status, setStatus] = useState<AdCampaignStatus>(existing?.status ?? "active");
  const [startDate, setStartDate] = useState(existing?.start_date ?? "");
  const [endDate, setEndDate] = useState(existing?.end_date ?? "");
  const [currency, setCurrency] = useState(existing?.currency ?? "EGP");
  const [color, setColor] = useState(existing?.color ?? "#276ef1");
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError(t("validationNameRequired"));
      return;
    }
    const cost = Number(totalCost);
    if (totalCost === "" || Number.isNaN(cost) || cost < 0) {
      setError(t("validationCostRequired"));
      return;
    }

    setError(null);
    setSubmitting(true);
    const input = {
      name,
      total_cost: cost,
      platform,
      status,
      start_date: startDate || null,
      end_date: endDate || null,
      currency,
      color,
      notes,
    };

    const result = mode === "create" ? await createCampaign(input) : await updateCampaign(existing!.id, input);
    setSubmitting(false);

    if (result.success) {
      toast.success(mode === "create" ? t("createSuccess") : t("updateSuccess"));
      onSuccess?.();
      router.push("/ad-campaigns");
    } else {
      setError(result.error || (mode === "create" ? t("createFailed") : t("updateFailed")));
    }
  };

  const fieldClass = "w-full rounded-md border bg-card px-3 py-2 text-sm";

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/ad-campaigns")}>
          <ArrowLeft className={`size-5 ${rtlFlip}`} />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {mode === "create" ? t("addCampaign") : t("editCampaign")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
      </div>

      <Card>
        <CardContent className="space-y-5 p-6">
          <div className="flex items-center gap-2 text-base font-semibold">
            <Megaphone className="size-5 text-primary" />
            {t("campaignInfo")}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-sm font-medium">{t("name")} *</Label>
              <Input placeholder={t("namePlaceholder")} value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">{t("totalCost")} *</Label>
              <Input
                type="number"
                min={0}
                placeholder="0"
                value={totalCost}
                onChange={(e) => setTotalCost(e.target.value)}
                dir="ltr"
              />
              <p className="text-[11px] text-muted-foreground">{t("totalCostHint")}</p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">{t("platform")}</Label>
              <select value={platform} onChange={(e) => setPlatform(e.target.value)} className={fieldClass}>
                <option value="">{t("platformPlaceholder")}</option>
                {PLATFORMS.map((p) => (
                  <option key={p} value={p}>{t(`platform_${p}`)}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">{t("status")}</Label>
              <select value={status} onChange={(e) => setStatus(e.target.value as AdCampaignStatus)} className={fieldClass}>
                <option value="active">{t("status_active")}</option>
                <option value="paused">{t("status_paused")}</option>
                <option value="completed">{t("status_completed")}</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">{t("currency")}</Label>
              <select value={currency} onChange={(e) => setCurrency(e.target.value)} className={fieldClass}>
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>{t(`currency_${c}`)}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">{t("startDate")}</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">{t("endDate")}</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">{t("color")}</Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-9 w-12 cursor-pointer rounded-md border bg-card p-1"
                />
                <span className="text-xs text-muted-foreground">{color}</span>
              </div>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-sm font-medium">{t("notes")}</Label>
              <Textarea placeholder={t("notesPlaceholder")} value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
            </div>
          </div>

          {error && (
            <p className={cn("rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive")}>{error}</p>
          )}

          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => router.push("/ad-campaigns")}>{t("cancel")}</Button>
            <Button onClick={handleSubmit} disabled={submitting} className="flex-1 gap-2">
              <Save className="size-4" />
              {submitting ? "..." : mode === "create" ? t("save") : t("update")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
