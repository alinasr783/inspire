"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { callDeepSeek, callDeepSeekJSON } from "@/lib/deepseek-client";
import type { UnitRow } from "@/lib/unit-actions";
import type { ClientRow } from "@/lib/client-actions";

type MatchResult = {
  propertyId: string;
  rank: number;
  finalScore: number;
  systemScore: number;
  aiScore: number;
  aiConfidence: number;
  budgetMatch: number;
  unitTypeMatch: number;
  bedroomsMatch: number;
  freshnessScore: number;
  hardFilterResults: Record<string, boolean | string>;
  aiAnalysis: Record<string, unknown>;
  recommendationStatus: "pending";
};

const AI_TOP_N = 20;

async function getSimilarityMatrix(table: string, colA: string, colB: string) {
  const supabase = await createClient();
  const { data } = await supabase.from(table).select(`${colA},${colB},similarity`);
  const map = new Map<string, number>();
  for (const row of (data ?? [])) {
    const r = row as unknown as Record<string, unknown>;
    const a = String(r[colA] ?? "").trim().toLowerCase();
    const b = String(r[colB] ?? "").trim().toLowerCase();
    const s = Number(r["similarity"] ?? 0);
    map.set(`${a}::${b}`, s);
    map.set(`${b}::${a}`, s);
  }
  return map;
}

function getUnitTypeSimilarity(unitType: string, clientType: string, matrix: Map<string, number>): number {
  const a = (unitType ?? "").trim().toLowerCase();
  const c = (clientType ?? "").trim().toLowerCase();
  if (!a || !c) return 50;
  if (a === c) return 100;
  const key = `${a}::${c}`;
  if (matrix.has(key)) return matrix.get(key)!;
  return 30;
}

function getLocationSimilarity(compound: string, preferred: string, matrix: Map<string, number>): number {
  const a = (compound ?? "").trim().toLowerCase();
  const p = (preferred ?? "").trim().toLowerCase();
  if (!a || !p) return 50;
  if (a === p) return 100;
  const key = `${a}::${p}`;
  if (matrix.has(key)) return matrix.get(key)!;
  return 40;
}

function parseNumeric(val: unknown, def = 0): number {
  const n = Number(val);
  return isNaN(n) ? def : n;
}

export async function runDealsMatching(clientId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("unauthorized");

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single();
  const isAdmin = profile?.role === "admin";
  const logs: string[] = [];
  const log = (msg: string) => { logs.push(msg); console.log("[MATCH]", msg); };

  /* 1. Read Client */
  const { data: client } = await admin.from("clients").select("*").eq("id", clientId).single();
  if (!client) throw new Error("client-not-found");
  const cl = client as ClientRow;

  if (!isAdmin && cl.created_by !== user.id) throw new Error("unauthorized");

  const clientBudget = parseNumeric(cl.budget_to) || parseNumeric(cl.budget_from) || 0;
  const clientUnitType = String(cl.unit_type ?? "");
  const clientBedrooms = parseNumeric(cl.bedrooms, 0);
  const clientTransactionType = String((cl as Record<string, unknown>).transaction_type ?? cl.custom_fields?.["transaction_type"] ?? "").trim().toLowerCase();
  const clientPreferred = String(cl.preferred_area ?? "");
  const clientNotes = String(cl.additional_notes ?? "");
  log(`Client: ${cl.customer_name}, budget=${clientBudget}, unit=${clientUnitType}, beds=${clientBedrooms}, txn=${clientTransactionType || "none"}, area=${clientPreferred || "none"}`);

  /* 2. Load Properties */
  const { data: allUnits } = await supabase.from("units").select("*");
  const units = (allUnits ?? []) as UnitRow[];
  log(`Loaded ${units.length} properties`);

  /* 3. Load similarity matrices */
  const [unitTypeMatrix, locationMatrix] = await Promise.all([
    getSimilarityMatrix("unit_type_similarity", "type_a", "type_b"),
    getSimilarityMatrix("location_similarity", "area_a", "area_b"),
  ]);
  log(`Unit type matrix: ${unitTypeMatrix.size} entries | Location matrix: ${locationMatrix.size} entries`);

  /* 4. Hard Filters */
  const filtered: { unit: UnitRow; rejection?: string }[] = [];

  for (const unit of units) {
    let rejected = false;

    if (clientTransactionType) {
      const propType = String(unit.rent_sale ?? "").trim().toLowerCase();
      if (propType && clientTransactionType !== propType) {
        rejected = true;
      }
    }

    if (!rejected && clientUnitType) {
      const sim = getUnitTypeSimilarity(String(unit.unit_type ?? ""), clientUnitType, unitTypeMatrix);
      if (sim < 60) rejected = true;
    }

    if (!rejected && clientBedrooms > 0) {
      const unitBeds = parseNumeric(unit.building_number, 0);
      if (unitBeds > 0 && unitBeds !== clientBedrooms) rejected = true;
    }

    if (!rejected && clientBudget > 0) {
      const total = parseNumeric(unit.cash_required) + parseNumeric(unit.remaining);
      if (total > clientBudget * 1.5) rejected = true;
    }

    if (!rejected && clientPreferred) {
      const locSim = getLocationSimilarity(String(unit.compound_name ?? ""), clientPreferred, locationMatrix);
      if (locSim < 60) rejected = true;
    }

    const downPayment = parseNumeric(unit.cash_required);
    if (!rejected && clientBudget > 0 && downPayment > clientBudget * 1.2) {
      rejected = true;
    }

    filtered.push({ unit, rejection: rejected ? "Hard filter failed" : undefined });
  }

  const remaining = filtered.filter((f) => !f.rejection);
  log(`Hard filters: ${units.length} → ${remaining.length} passed (${filtered.length - remaining.length} rejected)`);

  /* 5. System Matching Engine */
  const scored = remaining.map(({ unit }) => {
    const totalPrice = parseNumeric(unit.cash_required) + parseNumeric(unit.remaining);
    const downPayment = parseNumeric(unit.cash_required);

    const budgetMatch = clientBudget > 0 && totalPrice > 0
      ? Math.max(0, Math.min(100, 100 - Math.abs(totalPrice - clientBudget) / Math.max(clientBudget, 1) * 100))
      : 50;

    const utSim = clientUnitType
      ? getUnitTypeSimilarity(String(unit.unit_type ?? ""), clientUnitType, unitTypeMatrix)
      : 50;

    const unitBeds = parseNumeric(unit.building_number, 0);
    const bedsMatch = clientBedrooms > 0 && unitBeds > 0
      ? (unitBeds === clientBedrooms ? 100 : Math.abs(unitBeds - clientBedrooms) === 1 ? 70 : 40)
      : 50;

    const contactDate = unit.last_contact_date ? new Date(String(unit.last_contact_date)).getTime() : 0;
    const daysSinceContact = contactDate > 0 ? Math.max(0, (Date.now() - contactDate) / 86400000) : 365;
    const freshnessScore = Math.max(0, Math.min(100, 100 - Math.min(daysSinceContact * 0.5, 99)));

    const downPaymentScore = clientBudget > 0 && downPayment > 0
      ? Math.max(0, Math.min(100, 100 - Math.abs(downPayment - clientBudget * 0.3) / Math.max(clientBudget * 0.3, 1) * 100))
      : 50;

    const systemScore = (
      (isFinite(budgetMatch) ? budgetMatch : 50) * 0.30 +
      (isFinite(utSim) ? utSim : 50) * 0.25 +
      (isFinite(bedsMatch) ? bedsMatch : 50) * 0.20 +
      (isFinite(freshnessScore) ? freshnessScore : 50) * 0.15 +
      (isFinite(downPaymentScore) ? downPaymentScore : 50) * 0.10
    );

    const locSim = clientPreferred
      ? getLocationSimilarity(String(unit.compound_name ?? ""), clientPreferred, locationMatrix)
      : 50;

    return {
      unit,
      systemScore: isFinite(systemScore) ? Math.round(systemScore * 100) / 100 : 50,
      budgetMatch: isFinite(budgetMatch) ? Math.round(budgetMatch * 100) / 100 : 50,
      unitTypeMatch: isFinite(utSim) ? Math.round(utSim * 100) / 100 : 50,
      bedroomsMatch: isFinite(bedsMatch) ? Math.round(bedsMatch * 100) / 100 : 50,
      freshnessScore: isFinite(freshnessScore) ? Math.round(freshnessScore * 100) / 100 : 50,
      downPaymentScore: isFinite(downPaymentScore) ? Math.round(downPaymentScore * 100) / 100 : 50,
      locationScore: isFinite(locSim) ? Math.round(locSim * 100) / 100 : 50,
      totalPrice: Math.round(totalPrice * 100) / 100,
      downPayment: Math.round(downPayment * 100) / 100,
    };
  });

  scored.sort((a, b) => b.systemScore - a.systemScore);
  const top20 = scored.slice(0, AI_TOP_N);
  log(`Scored ${scored.length} properties. Top score: ${top20[0]?.systemScore ?? "N/A"}. Selecting top ${top20.length} for AI`);

  /* 6. AI Analysis */
  const aiResults: Record<string, { aiScore: number; aiConfidence: number; analysis: Record<string, unknown> }> = {};
  let aiError: string | null = null;

  if (top20.length > 0) {
    try {
      const aiPrompt = top20.map((s, i) => {
        const u = s.unit;
        return `Property ${i + 1}: ID=${u.id}, compound=${u.compound_name}, area=${u.area}, unit_type=${u.unit_type}, finishing=${u.finishing_status}, cash_required=${u.cash_required}, remaining=${u.remaining}, owner=${u.customer_name}, phone=${u.phone}, feedback="${u.feedback || ''}", notes="${u.additional_notes || ''}"`;
      }).join("\n");

      const messages = [
        {
          role: "system" as const,
          content: `You are an Egyptian real estate matching AI. Analyze properties for a client. Return JSON array of objects, each with: property_index, ownerReliability (0-100), notesMatching (0-100), negotiationProbability (0-100), aiConfidence (0-100), aiScore (0-100), reasoning (short Arabic text). Return ONLY valid JSON array, no other text.`,
        },
        {
          role: "user" as const,
          content: `Client: budget=${clientBudget}, unit_type=${clientUnitType}, bedrooms=${clientBedrooms}, area=${clientPreferred}, notes="${clientNotes}"\n\nProperties:\n${aiPrompt}\n\nAnalyze each property. Return JSON array.`,
        },
      ];

      const content = await callDeepSeek(messages);
      log(`AI response received (${content.length} chars)`);
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const list = JSON.parse(jsonMatch[0]) as Array<{
          property_index: number; ownerReliability: number; notesMatching: number;
          negotiationProbability: number; aiConfidence: number; aiScore: number; reasoning: string;
        }>;
        log(`AI parsed ${list.length} property analyses`);
        for (const item of list) {
          const s = top20[item.property_index - 1];
          if (s) {
            aiResults[s.unit.id] = {
              aiScore: item.aiScore,
              aiConfidence: item.aiConfidence,
              analysis: {
                ownerReliability: item.ownerReliability,
                notesMatching: item.notesMatching,
                negotiationProbability: item.negotiationProbability,
                reasoning: item.reasoning,
              },
            };
          }
        }
      } else {
        log(`AI response had no JSON array. First 300 chars: ${content.slice(0, 300)}`);
      }
    } catch (e: any) {
      aiError = e.message || "AI analysis failed";
      log(`AI ERROR: ${aiError}`);
    }
  } else {
    aiError = "No properties passed hard filters";
    log(aiError);
  }

  /* 7. Final Scoring */
  const final: MatchResult[] = scored.map((s) => {
    const ai = aiResults[s.unit.id];
    const aiScore = ai?.aiScore ?? 50;
    const aiConfidence = ai?.aiConfidence ?? 50;
    const finalScore = isFinite(s.systemScore) ? Math.round((s.systemScore * 0.6 + aiScore * 0.4) * 100) / 100 : 50;

    return {
      propertyId: s.unit.id,
      rank: 0,
      finalScore: isFinite(finalScore) ? finalScore : 50,
      systemScore: isFinite(s.systemScore) ? s.systemScore : 50,
      aiScore: isFinite(aiScore) ? aiScore : 50,
      aiConfidence: isFinite(aiConfidence) ? aiConfidence : 50,
      budgetMatch: isFinite(s.budgetMatch) ? s.budgetMatch : 50,
      unitTypeMatch: isFinite(s.unitTypeMatch) ? s.unitTypeMatch : 50,
      bedroomsMatch: isFinite(s.bedroomsMatch) ? s.bedroomsMatch : 50,
      freshnessScore: isFinite(s.freshnessScore) ? s.freshnessScore : 50,
      hardFilterResults: {},
      aiAnalysis: ai?.analysis ?? {},
      recommendationStatus: "pending",
    };
  });

  final.sort((a, b) => b.finalScore - a.finalScore);
  final.forEach((r, i) => (r.rank = i + 1));

  /* 8. Save results */
  const existingIds = new Set<string>();
  const { data: existingDeals } = await admin.from("generated_deals").select("property_id").eq("client_id", clientId);
  for (const ed of (existingDeals ?? [])) existingIds.add(ed.property_id as string);

  for (const r of final.slice(0, 30)) {
    if (existingIds.has(r.propertyId)) {
      await admin.from("generated_deals").update({
        rank: r.rank, final_score: r.finalScore, system_score: r.systemScore,
        ai_score: r.aiScore, ai_confidence: r.aiConfidence, budget_match: r.budgetMatch,
        unit_type_match: r.unitTypeMatch, bedrooms_match: r.bedroomsMatch,
        freshness_score: r.freshnessScore, hard_filter_results: r.hardFilterResults as any,
        ai_analysis: r.aiAnalysis as any, recommendation_status: "pending",
      }).eq("client_id", clientId).eq("property_id", r.propertyId);
    } else {
      await admin.from("generated_deals").insert({
        client_id: clientId, property_id: r.propertyId, rank: r.rank,
        final_score: r.finalScore, system_score: r.systemScore, ai_score: r.aiScore,
        ai_confidence: r.aiConfidence, budget_match: r.budgetMatch,
        unit_type_match: r.unitTypeMatch, bedrooms_match: r.bedroomsMatch,
        freshness_score: r.freshnessScore, hard_filter_results: r.hardFilterResults as any,
        ai_analysis: r.aiAnalysis as any, recommendation_status: "pending",
        created_by: user.id,
      });
    }
  }

  return { clientId, totalProperties: units.length, filteredCount: remaining.length, results: final.slice(0, 30), units: units.reduce((acc, u) => { acc[u.id] = u; return acc; }, {} as Record<string, UnitRow>), aiError, logs };
}

export async function getDealResults(clientId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("unauthorized");

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") {
    const { data: cl } = await admin.from("clients").select("created_by").eq("id", clientId).single();
    if (!cl || cl.created_by !== user.id) throw new Error("unauthorized");
  }

  const { data: deals } = await admin.from("generated_deals").select("*, units:property_id(*)").eq("client_id", clientId).order("rank");

  return { deals: deals ?? [] };
}
