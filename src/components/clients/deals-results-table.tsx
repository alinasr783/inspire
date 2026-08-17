"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BarChart3, Eye, X } from "lucide-react";

function pct(v: number | null | undefined) {
  if (v == null || isNaN(v)) return "—";
  return `${Math.round(v)}%`;
}
function formatNum(v: number | null | undefined) {
  if (v == null || isNaN(v)) return "—";
  return Number(v).toLocaleString();
}

function AnalysisModal({ deal, locale, onClose }: { deal: any; locale: string; onClose: () => void }) {
  const u = deal.units;
  const ai = deal.aiAnalysis || deal.ai_analysis || {};

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-2xl p-0 sm:p-0 max-h-[92dvh]">
        <DialogHeader className="border-b px-6 py-5">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-bold">{u?.compound_name || deal.propertyId || "Analysis"}</DialogTitle>
            <Button variant="ghost" size="icon-xs" onClick={onClose}><X className="h-4 w-4" /></Button>
          </div>
        </DialogHeader>
        <div className="space-y-5 p-6">
          <div>
            <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Hard Filters</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              <span className="text-muted-foreground">Transaction Type:</span><span className="text-green-600">✓ {u?.rent_sale || "—"}</span>
              <span className="text-muted-foreground">Unit Type:</span><span className="text-green-600">✓ {u?.unit_type || "—"}</span>
              <span className="text-muted-foreground">Budget:</span><span className="text-green-600">✓ {formatNum((u?.cash_required || 0) + (u?.remaining || 0))}</span>
              <span className="text-muted-foreground">Bedrooms:</span><span className="text-green-600">✓ {u?.building_number || "—"}</span>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Mathematical Analysis</p>
            <div className="rounded-lg bg-muted/30 p-3">
              {[
                { label: "Budget Match", value: deal.budgetMatch, color: "bg-blue-500" },
                { label: "Unit Type Match", value: deal.unitTypeMatch, color: "bg-green-500" },
                { label: "Bedrooms Match", value: deal.bedroomsMatch, color: "bg-yellow-500" },
                { label: "Freshness", value: deal.freshnessScore, color: "bg-orange-500" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-3 py-1">
                  <span className="w-28 text-xs text-muted-foreground">{item.label}</span>
                  <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                    <div className={`h-full rounded-full ${item.color}`} style={{ width: `${Math.min(100, Math.max(0, item.value || 0))}%` }} />
                  </div>
                  <span className="w-10 text-right text-xs font-medium">{pct(item.value)}</span>
                </div>
              ))}
              <div className="flex items-center gap-3 py-2 border-t mt-1">
                <span className="w-28 text-xs font-semibold">System Score</span>
                <div className="flex-1 h-3 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, Math.max(0, deal.systemScore || 0))}%` }} />
                </div>
                <span className="w-10 text-right text-sm font-bold text-primary">{pct(deal.systemScore)}</span>
              </div>
            </div>
          </div>

          {Object.keys(ai).length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">AI Analysis</p>
              <div className="rounded-lg bg-purple-50/50 dark:bg-purple-950/20 p-3 space-y-2">
                {Object.entries(ai).filter(([k]) => k !== "reasoning").map(([k, v]) => (
                  <div key={k} className="flex items-center gap-3 py-1">
                    <span className="w-28 text-xs text-muted-foreground capitalize">{k.replace(/([A-Z])/g, " $1").trim()}</span>
                    <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-purple-500" style={{ width: `${Math.min(100, Math.max(0, Number(v) || 0))}%` }} />
                    </div>
                    <span className="w-10 text-right text-xs font-medium">{typeof v === "number" ? pct(v) : String(v).slice(0, 20)}</span>
                  </div>
                ))}
                {ai.reasoning && <p className="text-xs text-muted-foreground italic mt-2">"{ai.reasoning}"</p>}
                <div className="flex gap-4 pt-1 border-t">
                  <span className="text-xs"><span className="text-muted-foreground">AI Score:</span> <b className="text-purple-600">{pct(deal.aiScore)}</b></span>
                  <span className="text-xs"><span className="text-muted-foreground">Confidence:</span> <b>{pct(deal.aiConfidence)}</b></span>
                </div>
              </div>
            </div>
          )}

          <div className="border-t pt-3">
            <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Final Result</p>
            <div className="flex items-center gap-3">
              <span className="text-3xl font-bold text-primary">{pct(deal.finalScore)}</span>
              <span className="text-xs text-muted-foreground">60% System · 40% AI</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function DealsResultsTable({ deals, locale, clientId }: { deals: any[]; locale: string; clientId: string }) {
  const [analysis, setAnalysis] = useState<any>(null);
  const formatDate = (d: string) => { if (!d) return "—"; return new Date(d).toLocaleDateString(locale === "ar" ? "ar-EG" : "en-US", { year: "numeric", month: "short", day: "numeric" }); };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead><tr className="bg-muted/40 text-xs uppercase">
          <th className="px-2 py-2 text-start">#</th><th className="px-2 py-2 text-start">Match</th>
          <th className="px-2 py-2 text-start">Property</th><th className="px-2 py-2 text-start">Type</th>
          <th className="px-2 py-2 text-start">Area</th><th className="px-2 py-2 text-start">Price</th>
          <th className="px-2 py-2 text-start">Down</th><th className="px-2 py-2 text-start">Finishing</th>
          <th className="px-2 py-2 text-start">Owner</th><th className="px-2 py-2 text-start">Contact</th>
          <th className="px-2 py-2 text-start">AI</th><th className="px-2 py-2 text-start"></th>
        </tr></thead>
        <tbody>
          {deals.map((d) => (
            <tr key={d.propertyId || d.id} className="border-b hover:bg-muted/30">
              <td className="px-2 py-2 font-bold">{d.rank}</td>
              <td className="px-2 py-2">
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-bold ${(d.finalScore || 0) >= 80 ? "bg-green-100 text-green-800" : (d.finalScore || 0) >= 60 ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800"}`}>
                  {pct(d.finalScore)}
                </span>
              </td>
              <td className="px-2 py-2 font-medium truncate max-w-[120px]">
                <Link href={`/properties/${d.units?.id || d.propertyId}`} className="hover:underline">{d.units?.compound_name || "—"}</Link>
              </td>
              <td className="px-2 py-2 text-xs">{d.units?.unit_type || "—"}</td>
              <td className="px-2 py-2 text-xs">{d.units?.area || "—"}</td>
              <td className="px-2 py-2 text-xs" dir="ltr">{formatNum((d.units?.cash_required || 0) + (d.units?.remaining || 0))}</td>
              <td className="px-2 py-2 text-xs" dir="ltr">{formatNum(d.units?.cash_required)}</td>
              <td className="px-2 py-2 text-xs">{d.units?.finishing_status || "—"}</td>
              <td className="px-2 py-2 text-xs truncate max-w-[100px]">{d.units?.customer_name || "—"}</td>
              <td className="px-2 py-2 text-xs">{formatDate(d.units?.last_contact_date)}</td>
              <td className="px-2 py-2 text-xs">{pct(d.aiConfidence)}</td>
              <td className="px-2 py-2">
                <div className="flex items-center gap-0.5">
                  <Button variant="ghost" size="icon-xs" onClick={() => setAnalysis(d)}><BarChart3 className="h-3.5 w-3.5" /></Button>
                  <Link href={`/properties/${d.units?.id || d.propertyId}`}><Button variant="ghost" size="icon-xs"><Eye className="h-3.5 w-3.5" /></Button></Link>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {analysis && <AnalysisModal deal={analysis} locale={locale} onClose={() => setAnalysis(null)} />}
    </div>
  );
}
