/// <reference types="vitest/globals" />

import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";

// ── Mocks ──

const mockRedirect = vi.fn();
const mockRevalidatePath = vi.fn();

vi.mock("next/navigation", () => ({
  redirect: (...args: unknown[]) => {
    mockRedirect(...args);
    throw new Error("NEXT_REDIRECT");
  },
}));

vi.mock("next-intl/server", () => ({
  getLocale: () => Promise.resolve("ar"),
}));

vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}));

// ── Supabase mock state ──

let getUserResult: { data: { user: { id: string; email: string } | null }; error: unknown } = {
  data: { user: null },
  error: null,
};
let profileRoleResult: { data: { role: string } | null; error: unknown } = {
  data: null,
  error: null,
};
let dealInsertResult: { data: { id: string } | null; error: unknown } = {
  data: { id: "deal-123" },
  error: null,
};
let dealUpdateResult = { error: null };
let dealDeleteResult = { error: null };
let dealSelectSingleResult: { data: unknown; error: unknown } = { data: null, error: null };
let dealSelectListResult: { data: unknown[]; error: unknown } = { data: [], error: null };
let dealEmployeeInsertResult = { error: null };
let profileListResult: { data: unknown[]; error: unknown } = { data: [], error: null };
let clientListResult: { data: unknown[]; error: unknown } = { data: [], error: null };
let unitListResult: { data: unknown[]; error: unknown } = { data: [], error: null };
let employeeDealSelectResult: { data: unknown[]; error: unknown } = { data: [], error: null };
let partnerConfigListResult: { data: unknown[]; error: unknown } = { data: [], error: null };
let partnerInsertResult: { data: unknown; error: unknown } = { data: null, error: null };
let partnerDeleteResult = { error: null };
let dealPartnerInsertResult: { data: unknown; error: unknown } = { data: null, error: null };
let partnerTargetResult: { data: { role: string; approval_status: string } | null; error: unknown } = {
  data: { role: "admin", approval_status: "approved" },
  error: null,
};

function makeSupabaseQuery(methods: Record<string, (...args: unknown[]) => unknown>) {
  const handler: ProxyHandler<Record<string, unknown>> = {
    get(_target, prop: string) {
      if (prop === "then") return undefined;
      if (methods[prop]) return methods[prop];
      // chain methods that return self
      if (["eq", "neq", "gt", "gte", "lt", "lte", "in", "not", "is", "ilike", "match", "order", "limit", "select", "single"].includes(prop)) {
        return () => new Proxy({}, handler);
      }
      return () => new Proxy({}, handler);
    },
  };
  return new Proxy({}, handler);
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => ({
    auth: {
      getUser: () => Promise.resolve(getUserResult),
    },
  }),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === "profiles") {
        return makeSupabaseQuery({
          select: (cols: unknown) => makeSupabaseQuery({
            eq: () => makeSupabaseQuery({
              single: () => Promise.resolve(
                typeof cols === "string" && cols.includes("approval_status") ? partnerTargetResult : profileRoleResult
              ),
            }),
            order: () => Promise.resolve(profileListResult),
          }),
        });
      }
      if (table === "deals") {
        return makeSupabaseQuery({
          select: () => makeSupabaseQuery({
            eq: () => makeSupabaseQuery({
              single: () => Promise.resolve(dealSelectSingleResult),
            }),
            gte: () => makeSupabaseQuery({
              order: () => Promise.resolve(dealSelectListResult),
            }),
            order: () => Promise.resolve(dealSelectListResult),
            in: () => makeSupabaseQuery({
              order: () => Promise.resolve(dealSelectListResult),
            }),
          }),
          insert: () => makeSupabaseQuery({
            select: () => makeSupabaseQuery({
              single: () => Promise.resolve(dealInsertResult),
            }),
          }),
          update: () => makeSupabaseQuery({
            eq: () => Promise.resolve(dealUpdateResult),
          }),
          delete: () => makeSupabaseQuery({
            eq: () => Promise.resolve(dealDeleteResult),
          }),
        });
      }
      if (table === "deal_employees") {
        return makeSupabaseQuery({
          insert: () => Promise.resolve(dealEmployeeInsertResult),
          delete: () => makeSupabaseQuery({
            eq: () => Promise.resolve({ error: null }),
          }),
          select: () => makeSupabaseQuery({
            eq: () => Promise.resolve(employeeDealSelectResult),
          }),
        });
      }
      if (table === "clients") {
        return makeSupabaseQuery({
          select: () => makeSupabaseQuery({
            order: () => Promise.resolve(clientListResult),
          }),
        });
      }
      if (table === "units") {
        return makeSupabaseQuery({
          select: () => makeSupabaseQuery({
            order: () => Promise.resolve(unitListResult),
          }),
        });
      }
      if (table === "partners") {
        return makeSupabaseQuery({
          select: () => makeSupabaseQuery({
            order: () => Promise.resolve(partnerConfigListResult),
          }),
          insert: () => Promise.resolve(partnerInsertResult),
          delete: () => makeSupabaseQuery({
            eq: () => Promise.resolve(partnerDeleteResult),
          }),
        });
      }
      if (table === "deal_partners") {
        return makeSupabaseQuery({
          insert: () => Promise.resolve(dealPartnerInsertResult),
          delete: () => makeSupabaseQuery({
            eq: () => Promise.resolve({ error: null }),
          }),
          select: () => makeSupabaseQuery({
            eq: () => Promise.resolve(employeeDealSelectResult),
          }),
        });
      }
      return makeSupabaseQuery({});
    },
  }),
}));

// ── Import server actions AFTER mocks ──

import {
  createDeal, updateDeal, deleteDeal,
  getDeal, getFullDealDetail, getEmployeeFinanceDetail,
  queryFinances, queryFinancesSimple,
  queryClientsSelect, queryUnitsSelect, queryEmployeesForSelect,
  getPartnersConfig, addPartner, removePartner, getPartnerFinanceDetail,
} from "@/lib/finance-actions";

// ── Import pure functions ──

import {
  calcManualCommission, calcCompanyNetProfit, calcEmployeePool, calcEmployeeProfit,
  calcNathryat, calcPartnerProfit, splitPartnersEqually,
  hasBuyer, hasSeller, getTimeFilterDate,
} from "@/lib/finance-types";

// ── Helpers ──

function setAsAdmin() {
  getUserResult = {
    data: { user: { id: "admin-user", email: "admin@test.com" } },
    error: null,
  };
  profileRoleResult = { data: { role: "admin" }, error: null };
}

function setAsRegularUser() {
  getUserResult = {
    data: { user: { id: "regular-user", email: "user@test.com" } },
    error: null,
  };
  profileRoleResult = { data: { role: "user" }, error: null };
}

function setAsUnauthenticated() {
  getUserResult = { data: { user: null }, error: null };
  profileRoleResult = { data: null, error: null };
}

function resetResults() {
  dealInsertResult = { data: { id: "deal-123" }, error: null };
  dealUpdateResult = { error: null };
  dealDeleteResult = { error: null };
  dealSelectSingleResult = { data: { id: "deal-123" }, error: null };
  dealSelectListResult = { data: [], error: null };
  employeeDealSelectResult = { data: [], error: null };
  profileListResult = { data: [], error: null };
  clientListResult = { data: [], error: null };
  unitListResult = { data: [], error: null };
  partnerConfigListResult = { data: [], error: null };
  partnerInsertResult = { data: null, error: null };
  partnerDeleteResult = { error: null };
  partnerTargetResult = { data: { role: "admin", approval_status: "approved" }, error: null };
  mockRedirect.mockClear();
  mockRevalidatePath.mockClear();
}

// ── Pure function tests ──

describe("Finances - Pure Calculation Functions", () => {
  test("calcManualCommission: both parties → sum of buyer + seller", () => {
    expect(calcManualCommission("both", 75000, 125000)).toBe(200000);
  });
  test("calcManualCommission: buyer only → buyer commission only", () => {
    expect(calcManualCommission("buyer_only", 15000, null)).toBe(15000);
  });
  test("calcManualCommission: seller only → seller commission only", () => {
    expect(calcManualCommission("seller_only", null, 50000)).toBe(50000);
  });
  test("calcManualCommission: null commissions → 0", () => {
    expect(calcManualCommission("both", null, null)).toBe(0);
  });
  test("calcCompanyNetProfit: no employees → full commission", () => {
    expect(calcCompanyNetProfit(100000, 70, false)).toBe(100000);
  });
  test("calcCompanyNetProfit: with employees, 70% → 70k gross - 10% nathryat = 63k net", () => {
    // Gross: 100000 * 0.70 = 70000; Nathryat: 70000 * 0.10 = 7000; Net: 63000
    expect(calcCompanyNetProfit(100000, 70, true)).toBe(63000);
  });
  test("calcCompanyNetProfit: 80% split → 80k gross - 8k = 72k", () => {
    expect(calcCompanyNetProfit(100000, 80, true)).toBe(72000);
  });
  test("calcNathryat: no employees → 0", () => {
    expect(calcNathryat(100000, 70, false)).toBe(0);
  });
  test("calcNathryat: with employees, 70% → 70000 * 0.10 = 7000", () => {
    expect(calcNathryat(100000, 70, true)).toBe(7000);
  });
  test("calcEmployeePool: no employees → 0", () => {
    expect(calcEmployeePool(100000, 30, false)).toBe(0);
  });
  test("calcEmployeePool: with employees, 30% → 30000", () => {
    expect(calcEmployeePool(100000, 30, true)).toBe(30000);
  });
  test("calcEmployeeProfit: 50% of 30000 → 15000", () => {
    expect(calcEmployeeProfit(30000, 50)).toBe(15000);
  });
  test("calcEmployeeProfit: 100% → full pool", () => {
    expect(calcEmployeeProfit(30000, 100)).toBe(30000);
  });
  test("hasBuyer: both → true", () => expect(hasBuyer("both")).toBe(true));
  test("hasBuyer: buyer_only → true", () => expect(hasBuyer("buyer_only")).toBe(true));
  test("hasBuyer: seller_only → false", () => expect(hasBuyer("seller_only")).toBe(false));
  test("hasSeller: both → true", () => expect(hasSeller("both")).toBe(true));
  test("hasSeller: seller_only → true", () => expect(hasSeller("seller_only")).toBe(true));
  test("hasSeller: buyer_only → false", () => expect(hasSeller("buyer_only")).toBe(false));
  test("getTimeFilterDate: 'all' → null", () => expect(getTimeFilterDate("all")).toBeNull());
  test("getTimeFilterDate: returns Date for week/month/3months/6months", () => {
    expect(getTimeFilterDate("week")).toBeInstanceOf(Date);
    expect(getTimeFilterDate("month")).toBeInstanceOf(Date);
    expect(getTimeFilterDate("3months")).toBeInstanceOf(Date);
    expect(getTimeFilterDate("6months")).toBeInstanceOf(Date);
  });

  test("calcPartnerProfit: 50% of company net profit", () => {
    expect(calcPartnerProfit(100000, 50)).toBe(50000);
  });

  test("calcPartnerProfit: 33.33% of company net profit", () => {
    expect(calcPartnerProfit(99990, 33.33)).toBe(33326.67);
  });

  test("splitPartnersEqually: 3 partners → ~33.33 each, sum 100", () => {
    const result = splitPartnersEqually(["a", "b", "c"]);
    const total = Object.values(result).reduce((s, v) => s + v, 0);
    expect(total).toBeCloseTo(100, 2);
    expect(result["a"]).toBeCloseTo(33.33, 1);
  });

  test("splitPartnersEqually: empty → {}", () => {
    expect(splitPartnersEqually([])).toEqual({});
  });

  test("splitPartnersEqually: 2 partners → 50/50", () => {
    const result = splitPartnersEqually(["a", "b"]);
    expect(result["a"]).toBe(50);
    expect(result["b"]).toBe(50);
  });
});

// ── Server actions authorization tests ──

const dealInput = {
  contact_type: "both" as const,
  buyer_name: "Ahmed",
  seller_name: "Mohamed",
  buyer_amount: 5000000,
  seller_amount: 5000000,
  buyer_commission: 75000,
  seller_commission: 125000,
  final_commission: 200000,
  company_percentage: 70,
  employee_percentage: 30,
};

describe("Finances - Server Actions Access Control", () => {
  beforeEach(() => resetResults());
  afterEach(() => vi.restoreAllMocks());

  describe("createDeal", () => {
    test("admin → success", async () => {
      setAsAdmin();
      const r = await createDeal(dealInput);
      expect(r.success).toBe(true);
    });
    test("regular user → unauthorized", async () => {
      setAsRegularUser();
      const r = await createDeal(dealInput);
      expect(r.success).toBe(false);
      if (!r.success) expect(r.error).toBe("unauthorized");
    });
    test("unauthenticated → unauthorized", async () => {
      setAsUnauthenticated();
      const r = await createDeal(dealInput);
      expect(r.success).toBe(false);
      if (!r.success) expect(r.error).toBe("unauthorized");
    });
  });

  describe("updateDeal", () => {
    test("admin → success", async () => {
      setAsAdmin();
      dealSelectSingleResult = { data: { id: "deal-123" }, error: null };
      const r = await updateDeal("deal-123", dealInput);
      expect(r.success).toBe(true);
    });
    test("regular user → unauthorized", async () => {
      setAsRegularUser();
      const r = await updateDeal("deal-123", dealInput);
      expect(r.success).toBe(false);
      if (!r.success) expect(r.error).toBe("unauthorized");
    });
    test("unauthenticated → unauthorized", async () => {
      setAsUnauthenticated();
      const r = await updateDeal("deal-123", dealInput);
      expect(r.success).toBe(false);
      if (!r.success) expect(r.error).toBe("unauthorized");
    });
  });

  describe("deleteDeal", () => {
    test("admin → success", async () => {
      setAsAdmin();
      const r = await deleteDeal("deal-123");
      expect(r.success).toBe(true);
    });
    test("regular user → unauthorized", async () => {
      setAsRegularUser();
      const r = await deleteDeal("deal-123");
      expect(r.success).toBe(false);
      if (!r.success) expect(r.error).toBe("unauthorized");
    });
    test("unauthenticated → unauthorized", async () => {
      setAsUnauthenticated();
      const r = await deleteDeal("deal-123");
      expect(r.success).toBe(false);
      if (!r.success) expect(r.error).toBe("unauthorized");
    });
  });

  describe("getDeal", () => {
    test("admin → returns data", async () => {
      setAsAdmin();
      dealSelectSingleResult = { data: { id: "deal-123", final_commission: 100 }, error: null };
      const r = await getDeal("deal-123");
      expect(r).not.toBeNull();
    });
    test("regular user → null", async () => {
      setAsRegularUser();
      const r = await getDeal("deal-123");
      expect(r).toBeNull();
    });
  });

  describe("getFullDealDetail", () => {
    test("regular user → null", async () => {
      setAsRegularUser();
      const r = await getFullDealDetail("deal-123");
      expect(r).toBeNull();
    });
  });

  describe("getEmployeeFinanceDetail", () => {
    test("regular user → null", async () => {
      setAsRegularUser();
      const r = await getEmployeeFinanceDetail("emp-id");
      expect(r).toBeNull();
    });
  });

  describe("queryFinances", () => {
    test("admin → returns summary", async () => {
      setAsAdmin();
      const r = await queryFinances();
      expect(r.summary.total_deals).toBe(0);
    });
    test("regular user → empty summary", async () => {
      setAsRegularUser();
      const r = await queryFinances();
      expect(r.deals).toEqual([]);
      expect(r.summary.total_deals).toBe(0);
    });
  });

  describe("queryFinancesSimple", () => {
    test("regular user → empty array", async () => {
      setAsRegularUser();
      const r = await queryFinancesSimple();
      expect(r).toEqual([]);
    });
  });

  describe("queryClientsSelect", () => {
    test("regular user → empty array", async () => {
      setAsRegularUser();
      const r = await queryClientsSelect();
      expect(r).toEqual([]);
    });
  });

  describe("queryUnitsSelect", () => {
    test("regular user → empty array", async () => {
      setAsRegularUser();
      const r = await queryUnitsSelect();
      expect(r).toEqual([]);
    });
  });

  describe("queryEmployeesForSelect", () => {
    test("regular user → empty array", async () => {
      setAsRegularUser();
      const r = await queryEmployeesForSelect();
      expect(r).toEqual([]);
    });
  });
});

describe("Finances - Complete Access Control Matrix", () => {
  beforeEach(() => resetResults());
  afterEach(() => vi.restoreAllMocks());

  const allActions = [
    { name: "createDeal", fn: createDeal, args: [dealInput] },
    { name: "updateDeal", fn: updateDeal, args: ["deal-id", dealInput] },
    { name: "deleteDeal", fn: deleteDeal, args: ["deal-id"] },
    { name: "getDeal", fn: getDeal, args: ["deal-id"] },
    { name: "getFullDealDetail", fn: getFullDealDetail, args: ["deal-id"] },
    { name: "getEmployeeFinanceDetail", fn: getEmployeeFinanceDetail, args: ["emp-id"] },
    { name: "queryFinances", fn: queryFinances, args: [] },
    { name: "queryFinancesSimple", fn: queryFinancesSimple, args: [] },
    { name: "queryClientsSelect", fn: queryClientsSelect, args: [] },
    { name: "queryUnitsSelect", fn: queryUnitsSelect, args: [] },
    { name: "queryEmployeesForSelect", fn: queryEmployeesForSelect, args: [] },
    { name: "getPartnersConfig", fn: getPartnersConfig, args: [] },
    { name: "addPartner", fn: addPartner, args: ["admin-2"] },
    { name: "removePartner", fn: removePartner, args: ["admin-2"] },
    { name: "getPartnerFinanceDetail", fn: getPartnerFinanceDetail, args: ["partner-id"] },
  ];

  test("REGULAR USER: 100% of actions blocked", async () => {
    setAsRegularUser();
    dealSelectSingleResult = { data: { id: "deal-123" }, error: null };
    profileListResult = { data: [], error: null };

    for (const action of allActions) {
      const result = await (action.fn as (...a: unknown[]) => unknown)(...action.args);

      if (result && typeof result === "object" && "success" in result) {
        const r = result as { success: boolean; error?: string };
        expect(r.success, `${action.name}: must be blocked`).toBe(false);
        expect(
          ["unauthorized", "not-found"].includes(r.error || ""),
          `${action.name}: error should be unauthorized/not-found, got "${r.error}"`
        ).toBe(true);
      } else if (result === null) {
        // getDeal, getFullDealDetail, getEmployeeFinanceDetail → null
        expect(result, `${action.name}: should return null`).toBeNull();
      } else if (Array.isArray(result)) {
        expect(result, `${action.name}: should return []`).toEqual([]);
      } else if (result && typeof result === "object" && "summary" in result) {
        const r = result as { deals: unknown[]; summary: { total_deals: number; employee_profits: unknown[] } };
        expect(r.deals, `${action.name}: deals should be empty`).toEqual([]);
        expect(r.summary.total_deals, `${action.name}: total_deals should be 0`).toBe(0);
        expect(r.summary.employee_profits, `${action.name}: employee_profits should be empty`).toEqual([]);
      }
    }
  });

  test("UNAUTHENTICATED: 100% of actions blocked", async () => {
    setAsUnauthenticated();

    for (const action of allActions) {
      const result = await (action.fn as (...a: unknown[]) => unknown)(...action.args);

      if (result && typeof result === "object" && "success" in result) {
        const r = result as { success: boolean; error?: string };
        expect(r.success, `${action.name}: must be blocked`).toBe(false);
        expect(
          ["unauthorized", "not-found"].includes(r.error || ""),
          `${action.name}: error should be unauthorized, got "${r.error}"`
        ).toBe(true);
      } else if (result === null) {
        expect(result).toBeNull();
      } else if (Array.isArray(result)) {
        expect(result).toEqual([]);
      } else if (result && typeof result === "object" && "summary" in result) {
        const r = result as { deals: unknown[]; summary: { total_deals: number; employee_profits: unknown[] } };
        expect(r.deals).toEqual([]);
        expect(r.summary.total_deals).toBe(0);
        expect(r.summary.employee_profits).toEqual([]);
      }
    }
  });
});

describe("Finances - Partner Server Actions", () => {
  beforeEach(() => resetResults());
  afterEach(() => vi.restoreAllMocks());

  describe("addPartner", () => {
    test("admin can add a partner", async () => {
      setAsAdmin();
      partnerTargetResult = { data: { role: "admin", approval_status: "approved" }, error: null };
      partnerInsertResult = { data: { id: "p1" }, error: null };
      const r = await addPartner("admin-2");
      expect(r.success).toBe(true);
    });

    test("regular user CANNOT add a partner", async () => {
      setAsRegularUser();
      const r = await addPartner("admin-2");
      expect(r.success).toBe(false);
      if (!r.success) expect(r.error).toBe("unauthorized");
    });

    test("cannot add non-admin as partner", async () => {
      setAsAdmin();
      partnerTargetResult = { data: { role: "user", approval_status: "approved" }, error: null };
      const r = await addPartner("user-1");
      expect(r.success).toBe(false);
      if (!r.success) expect(r.error).toBe("not-an-admin");
    });

    test("cannot add unapproved user as partner", async () => {
      setAsAdmin();
      partnerTargetResult = { data: { role: "admin", approval_status: "pending" }, error: null };
      const r = await addPartner("admin-3");
      expect(r.success).toBe(false);
      if (!r.success) expect(r.error).toBe("not-an-admin");
    });

    test("duplicate partner insert returns success (idempotent)", async () => {
      setAsAdmin();
      partnerTargetResult = { data: { role: "admin", approval_status: "approved" }, error: null };
      partnerInsertResult = { data: null, error: { code: "23505" } };
      const r = await addPartner("admin-2");
      expect(r.success).toBe(true);
    });
  });

  describe("removePartner", () => {
    test("admin can remove a partner", async () => {
      setAsAdmin();
      partnerDeleteResult = { error: null };
      const r = await removePartner("admin-2");
      expect(r.success).toBe(true);
    });

    test("regular user CANNOT remove a partner", async () => {
      setAsRegularUser();
      const r = await removePartner("admin-2");
      expect(r.success).toBe(false);
      if (!r.success) expect(r.error).toBe("unauthorized");
    });
  });

  describe("getPartnersConfig", () => {
    test("admin can get partners config", async () => {
      setAsAdmin();
      partnerConfigListResult = { data: [{ id: "p1", partner_id: "admin-2", created_by: "admin-1" }], error: null };
      const r = await getPartnersConfig();
      expect(r.length).toBe(1);
      expect(r[0].partner_id).toBe("admin-2");
    });

    test("regular user gets empty array", async () => {
      setAsRegularUser();
      const r = await getPartnersConfig();
      expect(r).toEqual([]);
    });
  });

  describe("getPartnerFinanceDetail", () => {
    test("admin can get partner finance detail", async () => {
      setAsAdmin();
      profileRoleResult = { data: { role: "admin" } as unknown as { role: string }, error: null };
      employeeDealSelectResult = { data: [{ deal_id: "deal-1", percentage: 50, profit_amount: 63000 }], error: null };
      dealSelectListResult = { data: [], error: null };
      const r = await getPartnerFinanceDetail("admin-2");
      expect(r).not.toBeNull();
      expect(r!.total_profit).toBe(63000);
    });

    test("regular user gets null", async () => {
      setAsRegularUser();
      const r = await getPartnerFinanceDetail("admin-2");
      expect(r).toBeNull();
    });
  });
});
