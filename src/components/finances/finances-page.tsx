"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus, Handshake } from "lucide-react";
import { TimeFilter } from "@/components/finances/time-filter";
import { FinanceSummary } from "@/components/finances/finance-summary";
import { DealsTable } from "@/components/finances/deals-table";
import { PartnerManager } from "@/components/finances/partner-manager";
import { queryKeys } from "@/hooks/queries/query-keys";
import { queryFinances, getPartnersConfig } from "@/lib/finance-actions";
import { createClient } from "@/lib/supabase/client";
import type { TimeFilter as TimeFilterType, DealWithRelations, FinanceSummary as FinanceSummaryType } from "@/lib/finance-types";
import type { AdCampaignOption } from "@/lib/ad-campaign-types";

type AdminUser = {
  id: string;
  first_name: string | null;
  second_name: string | null;
  position: string | null;
  avatar_url: string | null;
};

type Props = {
  locale: string;
  initialDeals: DealWithRelations[];
  initialSummary: FinanceSummaryType;
  initialPartnerIds: string[];
  initialAdmins: AdminUser[];
  campaignOptions?: AdCampaignOption[];
};

export function FinancesPage({ locale, initialDeals, initialSummary, initialPartnerIds, initialAdmins, campaignOptions }: Props) {
  const t = useTranslations("Finances");
  const router = useRouter();
  const queryClient = useQueryClient();
  const [timeFilter, setTimeFilter] = useState<TimeFilterType>("all");
  const [deals, setDeals] = useState<DealWithRelations[]>(initialDeals);
  const [summary, setSummary] = useState<FinanceSummaryType>(initialSummary);
  const [loading, setLoading] = useState(false);
  const [managerOpen, setManagerOpen] = useState(false);
  const [partnerIds, setPartnerIds] = useState<Set<string>>(new Set(initialPartnerIds));
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);

  const fetchData = useCallback(async (tf: TimeFilterType) => {
    setLoading(true);
    const data = await queryFinances(tf);
    setDeals(data.deals);
    setSummary(data.summary);
    setLoading(false);
  }, []);

  const fetchPartners = useCallback(async () => {
    const config = await getPartnersConfig();
    setPartnerIds(new Set(config.map((p) => p.partner_id)));
  }, []);

  useEffect(() => {
    fetchData(timeFilter);
  }, [timeFilter, fetchData]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("finances-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "deals" }, () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.finances.list() });
        fetchData(timeFilter);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "deal_employees" }, () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.finances.list() });
        fetchData(timeFilter);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "deal_partners" }, () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.finances.list() });
        fetchData(timeFilter);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "partners" }, () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.finances.list() });
        fetchData(timeFilter);
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, fetchData, timeFilter]);

  const handleDeleted = useCallback(() => {
    fetchData(timeFilter);
  }, [fetchData, timeFilter]);

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setManagerOpen(true)} className="gap-2">
            <Handshake className="size-4" />
            {t("managePartners")}
          </Button>
          <Button onClick={() => router.push("/finances/new")} className="gap-2">
            <Plus className="size-4" />
            {t("addDeal")}
          </Button>
        </div>
      </div>

      <TimeFilter value={timeFilter} onChange={setTimeFilter} />
      <FinanceSummary summary={summary} />

      <DealsTable deals={deals} locale={locale} onDeleted={handleDeleted} campaignOptions={campaignOptions} />

      <PartnerManager
        open={managerOpen}
        onOpenChange={setManagerOpen}
        allAdmins={initialAdmins}
        partnerIds={partnerIds}
        onChanged={() => {
          fetchData(timeFilter);
          fetchPartners();
        }}
      />
    </div>
  );
}
