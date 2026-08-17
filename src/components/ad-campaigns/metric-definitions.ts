export type MetricKey =
  | "campaignsCount"
  | "totalSpend"
  | "totalNetProfit"
  | "overallRoi"
  | "totalClients"
  | "totalDeals"
  | "clientsCount"
  | "dealsCount"
  | "roi"
  | "netProfit"
  | "commission"
  | "cpa"
  | "costPerDeal"
  | "conversionRate"
  | "breakEven"
  | "avgRevenuePerClient"
  | "avgDealValue";

export type MetricContent = {
  key: MetricKey;
  title: string;
  what: string;
  formula: string;
  example: string;
  impact: string;
  impactUp: string;
  impactDown: string;
};

type TranslateFn = (key: string) => string;

export function buildMetricContent(key: MetricKey, t: TranslateFn): MetricContent {
  return {
    key,
    title: t(`metrics.${key}.title`),
    what: t(`metrics.${key}.what`),
    formula: t(`metrics.${key}.formula`),
    example: t(`metrics.${key}.example`),
    impact: t(`metrics.${key}.impact`),
    impactUp: t(`metrics.${key}.impactUp`),
    impactDown: t(`metrics.${key}.impactDown`),
  };
}
