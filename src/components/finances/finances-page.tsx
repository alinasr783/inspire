"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { TimeFilter } from "@/components/finances/time-filter";
import { FinanceSummary } from "@/components/finances/finance-summary";
import { DealsTable } from "@/components/finances/deals-table";
import { queryKeys } from "@/hooks/queries/query-keys";
import { queryFinances } from "@/lib/finance-actions";
import { createClient } from "@/lib/supabase/client";
import type { TimeFilter as TimeFilterType, DealWithRelations, FinanceSummary as FinanceSummaryType } from "@/lib/finance-types";

type Props = {
  locale: string;
  initialDeals: DealWithRelations[];
  initialSummary: FinanceSummaryType;
};

export function FinancesPage({ locale, initialDeals, initialSummary }: Props) {
  const t = useTranslations("Finances");
  const router = useRouter();
  const queryClient = useQueryClient();
  const [timeFilter, setTimeFilter] = useState<TimeFilterType>("all");
  const [deals, setDeals] = useState<DealWithRelations[]>(initialDeals);
  const [summary, setSummary] = useState<FinanceSummaryType>(initialSummary);
  const [loading, setLoading] = useState(false);
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);

  const fetchData = useCallback(async (tf: TimeFilterType) => {
    setLoading(true);
    const data = await queryFinances(tf);
    setDeals(data.deals);
    setSummary(data.summary);
    setLoading(false);
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
        <Button onClick={() => router.push("/finances/new")} className="gap-2">
          <Plus className="size-4" />
          {t("addDeal")}
        </Button>
      </div>

      <TimeFilter value={timeFilter} onChange={setTimeFilter} />
      <FinanceSummary summary={summary} />

      <DealsTable deals={deals} locale={locale} onDeleted={handleDeleted} />
    </div>
  );
}
