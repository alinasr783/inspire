"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { CampaignSummaryCards } from "./campaign-summary-cards";
import { CampaignCharts } from "./campaign-charts";
import { CampaignsTable } from "./campaigns-table";
import { MetricInfoDialog } from "./metric-info-dialog";
import { buildMetricContent, type MetricContent, type MetricKey } from "./metric-definitions";
import { getAdCampaignsOverview } from "@/lib/ad-campaign-actions";
import { createClient } from "@/lib/supabase/client";
import { queryKeys } from "@/hooks/queries/query-keys";
import { useQueryClient } from "@tanstack/react-query";
import type { AdCampaignWithStats } from "@/lib/ad-campaign-types";

export function AdCampaignsPage({
  initialCampaigns,
  locale,
}: {
  initialCampaigns: AdCampaignWithStats[];
  locale: string;
}) {
  const t = useTranslations("AdCampaigns");
  const router = useRouter();
  const queryClient = useQueryClient();
  const [campaigns, setCampaigns] = useState<AdCampaignWithStats[]>(initialCampaigns);
  const [loading, setLoading] = useState(false);
  const [activeMetric, setActiveMetric] = useState<MetricKey | null>(null);
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const data = await getAdCampaignsOverview();
    setCampaigns(data);
    setLoading(false);
  }, []);

  const handleOpenMetric = useCallback((key: MetricKey) => setActiveMetric(key), []);

  const metricContent: MetricContent | null = activeMetric
    ? buildMetricContent(activeMetric, (k) => t(k))
    : null;

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("ad-campaigns-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "ad_campaigns" }, () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.adCampaigns.list() });
        fetchData();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "clients" }, () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.adCampaigns.list() });
        fetchData();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "deals" }, () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.adCampaigns.list() });
        fetchData();
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, fetchData]);

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Button onClick={() => router.push("/ad-campaigns/new")} className="gap-2">
          <Plus className="size-4" />
          {t("addCampaign")}
        </Button>
      </div>

      {loading && campaigns.length === 0 ? (
        <div className="py-16 text-center text-sm text-muted-foreground">{t("loading")}</div>
      ) : (
        <>
          <CampaignSummaryCards campaigns={campaigns} onOpenMetric={handleOpenMetric} />
          <CampaignCharts campaigns={campaigns} />
          <CampaignsTable
            campaigns={campaigns}
            locale={locale}
            onOpenMetric={handleOpenMetric}
            onDeleted={fetchData}
          />
        </>
      )}

      <MetricInfoDialog
        open={!!activeMetric}
        onOpenChange={(open) => { if (!open) setActiveMetric(null); }}
        metric={metricContent}
      />
    </div>
  );
}
