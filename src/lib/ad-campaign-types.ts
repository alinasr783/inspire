export type AdCampaignStatus = "active" | "paused" | "completed";

export type AdCampaignRow = {
  id: string;
  name: string;
  total_cost: number;
  platform: string;
  status: AdCampaignStatus;
  start_date: string | null;
  end_date: string | null;
  notes: string;
  currency: string;
  color: string;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type AdCampaignInput = {
  name: string;
  total_cost: number;
  platform?: string;
  status?: AdCampaignStatus;
  start_date?: string | null;
  end_date?: string | null;
  notes?: string;
  currency?: string;
  color?: string;
};

export type AdCampaignStats = {
  clientsCount: number;
  dealsCount: number;
  totalCommission: number;
  totalCompanyNetProfit: number;
  netProfit: number;
  roiPct: number | null;
  cpa: number | null;
  costPerDeal: number | null;
  conversionRatePct: number | null;
  avgRevenuePerClient: number | null;
  avgDealValue: number | null;
};

export type AdCampaignWithStats = AdCampaignRow & { stats: AdCampaignStats };

export type CampaignLinkedClient = {
  id: string;
  customer_name: string;
  phone: string;
  phone_alt: string | null;
  budget_from: number | null;
  budget_to: number | null;
  preferred_area: string | null;
  unit_type: string | null;
  source: string | null;
  seriousness_rating: number | null;
  last_contact_date: string | null;
  created_by: string;
  created_at: string;
};

export type CampaignLinkedDeal = {
  id: string;
  created_at: string;
  created_by: string;
  buyer_name: string;
  seller_name: string;
  buyer_amount: number | null;
  seller_amount: number | null;
  buyer_commission: number | null;
  seller_commission: number | null;
  final_commission: number;
  company_net_profit: number;
  nathryat: number;
  expenses: number;
  compound_name: string;
};

export type AdCampaignDetail = {
  campaign: AdCampaignRow;
  stats: AdCampaignStats;
  clients: CampaignLinkedClient[];
  deals: CampaignLinkedDeal[];
};

export type AdCampaignOption = {
  id: string;
  name: string;
  status: AdCampaignStatus;
  color: string;
};

// ─── Pure metric calculations (unit-testable) ───────────────────────────────

export function calcNetProfit(totalCompanyNetProfit: number, totalCost: number): number {
  return Math.round((totalCompanyNetProfit - totalCost) * 100) / 100;
}

export function calcRoiPct(netProfit: number, totalCost: number): number | null {
  if (totalCost <= 0) return null;
  return Math.round((netProfit / totalCost) * 10000) / 100;
}

export function calcCpa(totalCost: number, clientsCount: number): number | null {
  if (clientsCount <= 0) return null;
  return Math.round((totalCost / clientsCount) * 100) / 100;
}

export function calcCostPerDeal(totalCost: number, dealsCount: number): number | null {
  if (dealsCount <= 0) return null;
  return Math.round((totalCost / dealsCount) * 100) / 100;
}

export function calcConversionRatePct(dealsCount: number, clientsCount: number): number | null {
  if (clientsCount <= 0) return null;
  return Math.round((dealsCount / clientsCount) * 10000) / 100;
}

export function calcAvgRevenuePerClient(totalCommission: number, clientsCount: number): number | null {
  if (clientsCount <= 0) return null;
  return Math.round((totalCommission / clientsCount) * 100) / 100;
}

export function calcAvgDealValue(totalCommission: number, dealsCount: number): number | null {
  if (dealsCount <= 0) return null;
  return Math.round((totalCommission / dealsCount) * 100) / 100;
}

export type CampaignAggregates = {
  totalCost: number;
  clientsCount: number;
  dealsCount: number;
  totalCommission: number;
  totalCompanyNetProfit: number;
};

export function computeCampaignStats(agg: CampaignAggregates): AdCampaignStats {
  const netProfit = calcNetProfit(agg.totalCompanyNetProfit, agg.totalCost);
  return {
    clientsCount: agg.clientsCount,
    dealsCount: agg.dealsCount,
    totalCommission: Math.round(agg.totalCommission * 100) / 100,
    totalCompanyNetProfit: Math.round(agg.totalCompanyNetProfit * 100) / 100,
    netProfit,
    roiPct: calcRoiPct(netProfit, agg.totalCost),
    cpa: calcCpa(agg.totalCost, agg.clientsCount),
    costPerDeal: calcCostPerDeal(agg.totalCost, agg.dealsCount),
    conversionRatePct: calcConversionRatePct(agg.dealsCount, agg.clientsCount),
    avgRevenuePerClient: calcAvgRevenuePerClient(agg.totalCommission, agg.clientsCount),
    avgDealValue: calcAvgDealValue(agg.totalCommission, agg.dealsCount),
  };
}
