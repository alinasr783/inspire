export type ContactType = "both" | "buyer_only" | "seller_only";
export type DealSide = "buyer" | "seller" | "both";

export type DealRow = {
  id: string;
  created_at: string;
  created_by: string;
  contact_type: ContactType;
  buyer_client_id: string | null;
  seller_unit_id: string | null;
  buyer_name: string;
  seller_name: string;
  buyer_amount: number | null;
  seller_amount: number | null;
  buyer_commission: number | null;
  seller_commission: number | null;
  auto_commission: number | null;
  final_commission: number;
  has_employee: boolean;
  company_percentage: number;
  employee_percentage: number;
  company_net_profit: number;
  nathryat: number;
};

export type DealEmployeeRow = {
  id: string;
  deal_id: string;
  employee_id: string;
  side: DealSide;
  percentage: number;
  profit_amount: number;
};

export type DealWithRelations = DealRow & {
  buyer_client: {
    id: string;
    customer_name: string;
    phone: string;
    phone_alt: string | null;
    budget_from: number | null;
    budget_to: number | null;
    payment_method: string | null;
    preferred_area: string | null;
    unit_type: string | null;
    bedrooms: string | null;
    preferred_developer: string | null;
    source: string | null;
    additional_notes: string | null;
    seriousness_rating: number | null;
    last_contact_date: string | null;
    created_at: string;
  } | null;
  seller_unit: {
    id: string;
    customer_name: string;
    phone: string;
    compound_name: string | null;
    area: string | null;
    building_number: string | null;
    finishing_status: string | null;
    rent_sale: string | null;
    unit_type: string | null;
    cash_required: number | null;
    remaining: number | null;
    additional_notes: string | null;
    feedback: string | null;
    last_contact_date: string | null;
    created_at: string;
  } | null;
  employees: (DealEmployeeRow & {
    profile: {
      id: string;
      first_name: string | null;
      second_name: string | null;
      position: string | null;
      avatar_url: string | null;
    };
  })[];
};

export type EmployeeProfitSummary = {
  employee_id: string;
  first_name: string | null;
  second_name: string | null;
  avatar_url: string | null;
  total_profit: number;
  deal_count: number;
};

export type FinanceSummary = {
  total_deals: number;
  total_commission: number;
  total_company_net_profit: number;
  total_employee_profit: number;
  total_nathryat: number;
  employee_profits: EmployeeProfitSummary[];
};

export type TimeFilter = "week" | "month" | "3months" | "6months" | "all";

export function getTimeFilterDate(filter: TimeFilter): Date | null {
  const now = new Date();
  switch (filter) {
    case "week": now.setDate(now.getDate() - 7); return now;
    case "month": now.setMonth(now.getMonth() - 1); return now;
    case "3months": now.setMonth(now.getMonth() - 3); return now;
    case "6months": now.setMonth(now.getMonth() - 6); return now;
    case "all": return null;
  }
}

export function hasBuyer(contactType: ContactType): boolean {
  return contactType === "both" || contactType === "buyer_only";
}

export function hasSeller(contactType: ContactType): boolean {
  return contactType === "both" || contactType === "seller_only";
}

export function calcManualCommission(
  contactType: ContactType,
  buyerCommission: number | null | undefined,
  sellerCommission: number | null | undefined
): number {
  let total = 0;
  if (hasBuyer(contactType) && buyerCommission != null) total += Number(buyerCommission);
  if (hasSeller(contactType) && sellerCommission != null) total += Number(sellerCommission);
  return Math.round(total * 100) / 100;
}

export function calcCompanyNetProfit(finalCommission: number, companyPercentage: number, hasEmployee: boolean): number {
  if (!hasEmployee) return finalCommission;
  const gross = finalCommission * (companyPercentage / 100);
  const nathryat = gross * 0.10;
  return Math.round((gross - nathryat) * 100) / 100;
}

export function calcNathryat(finalCommission: number, companyPercentage: number, hasEmployee: boolean): number {
  if (!hasEmployee) return 0;
  const gross = finalCommission * (companyPercentage / 100);
  return Math.round(gross * 0.10 * 100) / 100;
}

export function calcEmployeePool(finalCommission: number, employeePercentage: number, hasEmployee: boolean): number {
  if (!hasEmployee) return 0;
  return Math.round(finalCommission * (employeePercentage / 100) * 100) / 100;
}

export function calcEmployeeProfit(employeePool: number, percentage: number): number {
  return Math.round(employeePool * (percentage / 100) * 100) / 100;
}
