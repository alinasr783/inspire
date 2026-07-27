"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { BarChart3, Eye } from "lucide-react";

function formatPct(v: number) { return `${Math.round(v)}%`; }

function AnalysisModal({ deal, locale, onClose }: { deal: any; locale: string; onClose: () => void }) {
  const formatDate = (d: string) => { if (!d) return "—"; return new Date(d).toLocaleDateString(locale === "ar" ? "ar-EG" : "en-US", { year: "numeric", month: "short", day: "numeric" }); };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="relative max-h-[90vh] w-[600px] overflow-y-auto rounded-xl border bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-bold">Analysis: {deal.units?.compound_name || deal.property_id}</h3><Button variant="ghost" size="sm" onClick={onClose}>✕</Button></div>

        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Hard Filters ✓</p>
            <div className="grid grid-cols-2 gap-1 text-xs">
              <span className="text-muted-foreground">Transaction Type:</span><span className="text-green-600">✓ {deal.units?.rent_sale || "—"}</span>
              <span className="text-muted-foreground">Unit Type Match:</span><span>{formatPct(deal.unit_type_match)}</span>
              <span className="text-muted-foreground">Budget:</span><span className="text-green-600">✓ Within range</span>
              <span className="text-muted-foreground">Bedrooms:</span><span>{formatPct(deal.bedrooms_match)}</span>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Mathematical Analysis</p>
            <div className="grid grid-cols-2 gap-1 text-xs">
              <span className="text-muted-foreground">Budget Match:</span><span className="font-medium">{formatPct(deal.budget_match)}</span>
              <span className="text-muted-foreground">Unit Type Match:</span><span className="font-medium">{formatPct(deal.unit_type_match)}</span>
              <span className="text-muted-foreground">Bedrooms Match:</span><span className="font-medium">{formatPct(deal.bedrooms_match)}</span>
              <span className="text-muted-foreground">Freshness Score:</span><span className="font-medium">{formatPct(deal.freshness_score)}</span>
              <span className="text-muted-foreground">System Score:</span><span className="text-base font-bold text-primary">{formatPct(deal.system_score)}</span>
            </div>
          </div>

          {deal.ai_analysis && Object.keys(deal.ai_analysis).length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">AI Analysis</p>
              <div className="grid grid-cols-2 gap-1 text-xs">
                {Object.entries(deal.ai_analysis as Record<string, number | string>).map(([k, v]) => (
                  <><span className="text-muted-foreground capitalize">{k.replace(/([A-Z])/g, " $1")}:</span><span className="font-medium">{typeof v === "number" ? formatPct(v) : String(v)}</span></>
                ))}
              </div>
              <p className="text-xs font-medium mt-1">AI Score: {formatPct(deal.ai_score)} | Confidence: {formatPct(deal.ai_confidence)}</p>
            </div>
          )}

          <div className="border-t pt-3">
            <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Final Result</p>
            <p className="text-2xl font-bold text-primary">{formatPct(deal.final_score)}</p>
            <p className="text-xs text-muted-foreground mt-1">60% System · 40% AI</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function DealsResultsTable({ deals, locale, clientId }: { deals: any[]; locale: string; clientId: string }) {
  const [analysis, setAnalysis] = useState<any>(null);
  const formatDate = (d: string) => { if (!d) return "—"; return new Date(d).toLocaleDateString(locale === "ar" ? "ar-EG" : "en-US", { year: "numeric", month: "short", day: "numeric" }); };
  const formatNum = (n: number) => { if (n == null) return "—"; return Number(n).toLocaleString(); };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead><tr className="bg-muted/40 text-xs uppercase">
          <th className="px-2 py-2 text-start">#</th><th className="px-2 py-2 text-start">Match</th>
          <th className="px-2 py-2 text-start">Property</th><th className="px-2 py-2 text-start">Type</th>
          <th className="px-2 py-2 text-start">Area</th><th className="px-2 py-2 text-start">Price</th>
          <th className="px-2 py-2 text-start">Down</th><th className="px-2 py-2 text-start">Finishing</th>
          <th className="px-2 py-2 text-start">Owner</th><th className="px-2 py-2 text-start">Contact</th>
          <th className="px-2 py-2 text-start">AI</th><th className="px-2 py-2 text-start">Analysis</th>
        </tr></thead>
        <tbody>
          {deals.map((d) => (
            <tr key={d.id} className="border-b hover:bg-muted/30">
              <td className="px-2 py-2 font-bold">{d.rank}</td>
              <td className="px-2 py-2">
                <span className="inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">{Math.round(d.final_score)}%</span>
              </td>
              <td className="px-2 py-2 font-medium truncate max-w-[120px]">{d.units?.compound_name || d.property_id}</td>
              <td className="px-2 py-2 text-xs">{d.units?.unit_type || "—"}</td>
              <td className="px-2 py-2 text-xs">{d.units?.area || "—"}</td>
              <td className="px-2 py-2 text-xs" dir="ltr">{formatNum((d.units?.cash_required || 0) + (d.units?.remaining || 0))}</td>
              <td className="px-2 py-2 text-xs" dir="ltr">{formatNum(d.units?.cash_required)}</td>
              <td className="px-2 py-2 text-xs">{d.units?.finishing_status || "—"}</td>
              <td className="px-2 py-2 text-xs truncate max-w-[100px]">{d.units?.customer_name || "—"}</td>
              <td className="px-2 py-2 text-xs">{formatDate(d.units?.last_contact_date)}</td>
              <td className="px-2 py-2 text-xs">{d.ai_confidence ? `${Math.round(d.ai_confidence)}%` : "—"}</td>
              <td className="px-2 py-2">
                <Button variant="ghost" size="icon-xs" onClick={() => setAnalysis(d)}><BarChart3 className="h-3.5 w-3.5" /></Button>
                <Link href={`/properties/${d.property_id}`}><Button variant="ghost" size="icon-xs"><Eye className="h-3.5 w-3.5" /></Button></Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {analysis && <AnalysisModal deal={analysis} locale={locale} onClose={() => setAnalysis(null)} />}
    </div>
  );
}
