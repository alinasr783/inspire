/// <reference types="vitest/globals" />

import { describe, test, expect } from "vitest";
import {
  calcNetProfit,
  calcRoiPct,
  calcCpa,
  calcCostPerDeal,
  calcConversionRatePct,
  calcAvgRevenuePerClient,
  calcAvgDealValue,
  computeCampaignStats,
} from "@/lib/ad-campaign-types";

describe("ad campaign metric calculations", () => {
  test("calcNetProfit subtracts campaign cost from company net profit", () => {
    expect(calcNetProfit(17000, 12000)).toBe(5000);
    expect(calcNetProfit(5000, 10000)).toBe(-5000);
    expect(calcNetProfit(0, 0)).toBe(0);
  });

  test("calcRoiPct returns percent of net profit over cost", () => {
    expect(calcRoiPct(5000, 10000)).toBe(50);
    expect(calcRoiPct(-5000, 10000)).toBe(-50);
    expect(calcRoiPct(0, 10000)).toBe(0);
  });

  test("calcRoiPct returns null when cost is zero (undefined division)", () => {
    expect(calcRoiPct(5000, 0)).toBeNull();
    expect(calcRoiPct(0, 0)).toBeNull();
  });

  test("calcCpa computes cost per client", () => {
    expect(calcCpa(10000, 50)).toBe(200);
    expect(calcCpa(10000, 0)).toBeNull();
  });

  test("calcCostPerDeal computes cost per deal", () => {
    expect(calcCostPerDeal(12000, 4)).toBe(3000);
    expect(calcCostPerDeal(12000, 0)).toBeNull();
  });

  test("calcConversionRatePct computes deals over clients", () => {
    expect(calcConversionRatePct(5, 50)).toBe(10);
    expect(calcConversionRatePct(0, 50)).toBe(0);
    expect(calcConversionRatePct(5, 0)).toBeNull();
  });

  test("calcAvgRevenuePerClient computes revenue per client", () => {
    expect(calcAvgRevenuePerClient(20000, 50)).toBe(400);
    expect(calcAvgRevenuePerClient(20000, 0)).toBeNull();
  });

  test("calcAvgDealValue computes commission per deal", () => {
    expect(calcAvgDealValue(20000, 5)).toBe(4000);
    expect(calcAvgDealValue(20000, 0)).toBeNull();
  });

  test("computeCampaignStats rolls all metrics together", () => {
    const stats = computeCampaignStats({
      totalCost: 10000,
      clientsCount: 50,
      dealsCount: 5,
      totalCommission: 30000,
      totalCompanyNetProfit: 20000,
    });

    expect(stats.clientsCount).toBe(50);
    expect(stats.dealsCount).toBe(5);
    expect(stats.totalCommission).toBe(30000);
    expect(stats.totalCompanyNetProfit).toBe(20000);
    expect(stats.netProfit).toBe(10000);
    expect(stats.roiPct).toBe(100);
    expect(stats.cpa).toBe(200);
    expect(stats.costPerDeal).toBe(2000);
    expect(stats.conversionRatePct).toBe(10);
    expect(stats.avgRevenuePerClient).toBe(600);
    expect(stats.avgDealValue).toBe(6000);
  });

  test("computeCampaignStats handles empty campaign with zero cost", () => {
    const stats = computeCampaignStats({
      totalCost: 0,
      clientsCount: 0,
      dealsCount: 0,
      totalCommission: 0,
      totalCompanyNetProfit: 0,
    });

    expect(stats.netProfit).toBe(0);
    expect(stats.roiPct).toBeNull();
    expect(stats.cpa).toBeNull();
    expect(stats.conversionRatePct).toBeNull();
  });
});
