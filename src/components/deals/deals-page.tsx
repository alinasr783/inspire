"use client";

import { useState, useTransition, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import {
  Handshake,
  Sparkles,
  Phone,
  MapPin,
  Banknote,
  CheckCircle2,
  XCircle,
  Clock,
  Trash2,
  Loader2,
  Layers,
  ChevronDown,
  ArrowRight,
  Save,
  CheckCheck,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { runAIMatching, saveSelectedMatches, type AIMatchResult } from "@/lib/ai-matching";
import { updateDealStatus, deleteDeal, type DealRow } from "@/lib/deal-actions";

interface ClientOption {
  id: string;
  name: string;
  phone: string;
  type: string;
  area: string;
}

interface DealsPageProps {
  initialDeals: DealRow[];
  userId: string;
  clients: ClientOption[];
}

const STATUS_TABS = [
  { key: "all", icon: Layers },
  { key: "pending", icon: Clock },
  { key: "approved", icon: CheckCircle2 },
  { key: "rejected", icon: XCircle },
] as const;

function initialsOf(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() || "??";
}

function formatPrice(amount: number | null | undefined) {
  if (amount == null) return "—";
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}K`;
  return String(amount);
}

function AnimatedScoreBar({ value, animate }: { value: number; animate: boolean }) {
  const [w, setW] = useState(animate ? 0 : value);
  useEffect(() => { if (animate) setTimeout(() => setW(value), 100); }, [animate, value]);

  const pct = Math.min(100, Math.max(0, w));
  const color = pct >= 70 ? "var(--primary)" : pct >= 40 ? "var(--chart-4)" : "var(--destructive)";

  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div
        className="h-full rounded-full transition-all duration-1000 ease-out"
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
    </div>
  );
}

export function DealsPage({ initialDeals, userId, clients }: DealsPageProps) {
  const t = useTranslations("Deals");
  const router = useRouter();

  const [deals] = useState<DealRow[]>(initialDeals);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [expandedDeal, setExpandedDeal] = useState<string | null>(null);
  const [pendingActions, setPendingActions] = useState<Set<string>>(new Set());

  const [showModal, setShowModal] = useState(false);
  const [selectedClients, setSelectedClients] = useState<Set<string>>(new Set());
  const [clientSearch, setClientSearch] = useState("");

  const [aiResults, setAiResults] = useState<AIMatchResult[] | null>(null);
  const [isGenerating, startGenerating] = useTransition();
  const [selectedMatches, setSelectedMatches] = useState<Set<string>>(new Set());
  const [isSaving, startSaving] = useTransition();

  const [showSavedDeals, setShowSavedDeals] = useState(initialDeals.length > 0);

  const filteredClients = clients.filter(
    (c) =>
      !clientSearch ||
      c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
      c.phone.includes(clientSearch)
  );

  const handleToggleClient = (id: string) => {
    setSelectedClients((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < 3) next.add(id);
      return next;
    });
  };

  const handleStartGeneration = () => {
    if (selectedClients.size === 0) return;
    setShowModal(false);

    startGenerating(async () => {
      const result = await runAIMatching(Array.from(selectedClients));
      if (result.success && result.matches.length > 0) {
        setAiResults(result.matches);
        setSelectedMatches(new Set());
        setShowSavedDeals(false);
        toast.success(t("aiGenerated", { count: result.matches.length }));
      } else if (result.success && result.matches.length === 0) {
        toast.error(t("noMatchesFound"));
      } else {
        toast.error(result.error ?? t("generatedFailed"));
      }
    });
  };

  const handleToggleMatch = (clientId: string, unitId: string) => {
    const key = `${clientId}::${unitId}`;
    setSelectedMatches((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleSaveSelected = () => {
    const toSave: { client_id: string; unit_id: string; rank: number; score: number; reasoning: string }[] = [];
    for (const client of aiResults ?? []) {
      for (const unit of client.top_units) {
        if (selectedMatches.has(`${client.client_id}::${unit.unit_id}`)) {
          toSave.push({
            client_id: client.client_id,
            unit_id: unit.unit_id,
            rank: unit.rank,
            score: unit.score,
            reasoning: unit.reasoning,
          });
        }
      }
    }
    if (toSave.length === 0) { toast.error(t("selectAtLeastOne")); return; }

    startSaving(async () => {
      const r = await saveSelectedMatches(toSave, userId);
      if (r.success) { toast.success(t("savedSuccess", { count: r.saved })); setAiResults(null); router.refresh(); }
      else toast.error(t("saveFailed"));
    });
  };

  const handleAction = (dealId: string, action: "approved" | "rejected" | "delete") => {
    setPendingActions((prev) => new Set(prev).add(dealId));
    (async () => {
      const r = action === "delete" ? await deleteDeal(dealId) : await updateDealStatus(dealId, action);
      setPendingActions((prev) => { const n = new Set(prev); n.delete(dealId); return n; });
      if (r.success) {
        if (action === "delete") {
          toast.success(t("dealDeleted"));
          router.refresh();
        } else {
          toast.success(t(action === "approved" ? "approvedSuccess" : "rejectedSuccess"));
        }
      } else toast.error(t("actionFailed"));
    })();
  };

  const filteredDeals = activeTab === "all" ? deals : deals.filter((d) => d.recommendation_status === activeTab);
  const stats = { total: deals.length, pending: deals.filter((d) => d.recommendation_status === "pending").length, approved: deals.filter((d) => d.recommendation_status === "approved").length, rejected: deals.filter((d) => d.recommendation_status === "rejected").length };
  const totalCash = deals.filter((d) => d.recommendation_status === "approved").reduce((s, d) => s + (d.unit?.cash_required ?? 0), 0);

  if (aiResults) {
    return (
      <div className="space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1.5">
            <h1 className="text-2xl font-bold tracking-tight">{t("reviewTitle")}</h1>
            <p className="text-sm text-muted-foreground">
              {t("reviewSubtitle", { clients: aiResults.length, matches: aiResults.reduce((s, c) => s + c.top_units.length, 0) })}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { setAiResults(null); setSelectedClients(new Set()); }} size="lg">{t("discard")}</Button>
            <Button onClick={handleSaveSelected} disabled={selectedMatches.size === 0 || isSaving} size="lg">
              {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t("saving")}</> : <><Save className="mr-2 h-4 w-4" />{t("saveSelected", { count: selectedMatches.size })}</>}
            </Button>
          </div>
        </div>

        {aiResults.map((client) => (
          <Card key={client.client_id} className="overflow-hidden">
            <CardHeader className="bg-muted/30 border-b px-6 py-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-base font-bold text-primary">
                    {initialsOf(client.client_name)}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">{client.client_name}</h3>
                    <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-foreground">
                      {client.client_phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{client.client_phone}</span>}
                      {client.client_type && <Badge variant="outline" className="text-[10px] h-5">{client.client_type}</Badge>}
                      {client.client_budget && <span className="flex items-center gap-1"><Banknote className="h-3 w-3" />{client.client_budget} EGP</span>}
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => {
                  const keys = client.top_units.map((u) => `${client.client_id}::${u.unit_id}`);
                  const all = keys.every((k) => selectedMatches.has(k));
                  setSelectedMatches((prev) => {
                    const n = new Set(prev);
                    if (all) keys.forEach((k) => n.delete(k));
                    else keys.forEach((k) => n.add(k));
                    return n;
                  });
                }} className="text-xs">
                  <CheckCheck className="mr-1.5 h-3.5 w-3.5" />
                  {client.top_units.every((u) => selectedMatches.has(`${client.client_id}::${u.unit_id}`)) ? t("deselectAll") : t("selectAll")}
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/20">
                      <th className="w-10 px-4 py-3"></th>
                      <th className="px-4 py-3 text-left text-[11px] font-medium text-muted-foreground">#</th>
                      <th className="px-4 py-3 text-left text-[11px] font-medium text-muted-foreground">{t("property")}</th>
                      <th className="px-4 py-3 text-left text-[11px] font-medium text-muted-foreground">{t("details")}</th>
                      <th className="px-4 py-3 text-left text-[11px] font-medium text-muted-foreground">{t("price")}</th>
                      <th className="px-4 py-3 text-left text-[11px] font-medium text-muted-foreground">{t("matchScore")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {client.top_units.map((unit) => {
                      const key = `${client.client_id}::${unit.unit_id}`;
                      return (
                        <tr key={unit.unit_id} className={cn("border-b last:border-b-0 transition-colors hover:bg-muted/20", selectedMatches.has(key) && "bg-primary/5")}>
                          <td className="px-4 py-3.5">
                            <input type="checkbox" checked={selectedMatches.has(key)} onChange={() => handleToggleMatch(client.client_id, unit.unit_id)} className="h-4 w-4 rounded accent-primary" />
                          </td>
                          <td className="px-4 py-3.5">
                            <Badge variant={unit.rank === 1 ? "default" : "outline"} className="text-[10px] h-5">#{unit.rank}</Badge>
                          </td>
                          <td className="px-4 py-3.5 min-w-[160px]">
                            <div>
                              <p className="text-sm font-medium">{unit.unit_name}</p>
                              <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                                <MapPin className="h-3 w-3" />{unit.unit_compound || "—"}
                              </p>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 min-w-[140px]">
                            <div className="flex flex-wrap gap-1">
                              {unit.unit_type && <Badge variant="outline" className="text-[10px] h-5">{unit.unit_type}</Badge>}
                              {unit.unit_finishing && <Badge variant="outline" className="text-[10px] h-5">{unit.unit_finishing}</Badge>}
                              {unit.unit_area && <Badge variant="outline" className="text-[10px] h-5">{unit.unit_area} m²</Badge>}
                              {unit.unit_rent_sale && <Badge variant="outline" className="text-[10px] h-5">{unit.unit_rent_sale}</Badge>}
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed line-clamp-2">{unit.reasoning}</p>
                          </td>
                          <td className="px-4 py-3.5 font-medium tabular-nums text-sm whitespace-nowrap">{unit.unit_price} EGP</td>
                          <td className="px-4 py-3.5 min-w-[180px]">
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between gap-2">
                                <span className={cn("text-base font-bold tabular-nums", unit.score >= 70 ? "text-primary" : unit.score >= 40 ? "text-amber-500" : "text-destructive")}>{Math.round(unit.score)}%</span>
                              </div>
                              <AnimatedScoreBar value={unit.score} animate />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1.5">
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <div className="flex gap-2">
          {deals.length > 0 && !showSavedDeals && (
            <Button variant="outline" onClick={() => setShowSavedDeals(true)} size="lg">{t("viewSavedDeals")}</Button>
          )}
          <Button onClick={() => setShowModal(true)} size="lg" className="shrink-0">
            <Sparkles className="mr-2 h-4 w-4" />{t("generate")}
          </Button>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <Card className="relative z-10 mx-4 w-full max-w-lg max-h-[80vh] overflow-hidden">
            <CardHeader className="border-b px-6 py-5">
              <CardTitle className="text-base">{t("selectClients")}</CardTitle>
              <p className="text-sm text-muted-foreground">{t("selectClientsDesc")}</p>
            </CardHeader>
            <div className="p-4 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={clientSearch} onChange={(e) => setClientSearch(e.target.value)} placeholder={t("searchClients")} className="h-9 pl-9" />
              </div>
            </div>
            <CardContent className="p-4 max-h-[40vh] overflow-y-auto space-y-1">
              {filteredClients.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">{t("noClients")}</p>
              )}
              {filteredClients.map((c) => (
                <label key={c.id} className={cn("flex items-center gap-3 rounded-lg px-3 py-2.5 cursor-pointer transition-colors hover:bg-muted/50", selectedClients.has(c.id) && "bg-primary/5 ring-1 ring-primary/20")}>
                  <input type="checkbox" checked={selectedClients.has(c.id)} onChange={() => handleToggleClient(c.id)} disabled={!selectedClients.has(c.id) && selectedClients.size >= 3} className="h-4 w-4 rounded accent-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{c.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{c.phone}{c.type ? ` · ${c.type}` : ""}{c.area ? ` · ${c.area}` : ""}</p>
                  </div>
                  {selectedClients.has(c.id) && <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />}
                </label>
              ))}
            </CardContent>
            <div className="border-t px-6 py-4 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{t("selectedCount", { count: selectedClients.size })}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => { setShowModal(false); setClientSearch(""); }}>{t("cancel")}</Button>
                <Button size="sm" onClick={handleStartGeneration} disabled={selectedClients.size === 0 || isGenerating}>
                  {isGenerating ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />{t("analyzing")}</> : <><Sparkles className="mr-1.5 h-3.5 w-3.5" />{t("generateFor")}</>}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {deals.length > 0 && showSavedDeals && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {STATUS_TABS.map((tab) => {
              const Icon = tab.icon;
              const count = tab.key === "all" ? stats.total : stats[tab.key as keyof typeof stats];
              return (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={cn("flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-all sm:p-4", activeTab === tab.key ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-border hover:bg-muted/50")}>
                  <div className="flex items-center gap-2"><Icon className={cn("h-4 w-4", activeTab === tab.key ? "text-primary" : "text-muted-foreground")} /><span className="text-xs text-muted-foreground">{tab.key === "all" ? t("allDeals") : t(`status_${tab.key}`)}</span></div>
                  <span className="text-2xl font-bold tabular-nums">{count}</span>
                </button>
              );
            })}
          </div>

          {stats.approved > 0 && (
            <Card className="border-0 bg-gradient-to-r from-primary/5 to-transparent">
              <CardContent className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10"><Banknote className="h-4 w-4 text-primary" /></div>
                  <div><p className="text-xs text-muted-foreground">{t("totalApprovedCash")}</p><p className="text-lg font-bold tabular-nums">{formatPrice(totalCash)} EGP</p></div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredDeals.map((deal) => {
              const isExpanded = expandedDeal === deal.id;
              const isBusy = pendingActions.has(deal.id);
              return (
                <Card key={deal.id} className={cn("group transition-all hover:shadow-md", deal.recommendation_status === "approved" && "ring-1 ring-primary/20", deal.recommendation_status === "rejected" && "opacity-60")}>
                  <CardHeader className="pb-3 px-5 pt-5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-sm font-bold text-primary">{initialsOf(deal.client?.customer_name ?? "")}</div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{deal.client?.customer_name ?? "—"}</p>
                          <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5"><ArrowRight className="h-3 w-3 shrink-0" />{deal.unit?.customer_name ?? "—"}</p>
                        </div>
                      </div>
                      <Badge variant={deal.recommendation_status === "approved" ? "default" : deal.recommendation_status === "rejected" ? "destructive" : "secondary"} className="shrink-0 text-[10px] h-5">{t(`status_${deal.recommendation_status}`)}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="px-5 pb-5 space-y-3">
                    <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
                      {deal.client?.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{deal.client.phone}</span>}
                      {deal.unit?.compound_name && <span className="flex items-center gap-1 truncate"><MapPin className="h-3 w-3 shrink-0" />{deal.unit.compound_name}</span>}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {deal.client?.unit_type && <Badge variant="outline" className="text-[10px] h-5">{deal.client.unit_type}</Badge>}
                      {deal.unit?.unit_type && <Badge variant="outline" className="text-[10px] h-5">{deal.unit.unit_type}</Badge>}
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2"><span className="text-xs font-medium">{t("matchScore")}</span>
                          <span className={cn("text-lg font-bold tabular-nums", deal.final_score >= 70 ? "text-primary" : deal.final_score >= 40 ? "text-amber-500" : "text-destructive")}>{Math.round(deal.final_score)}%</span>
                        </div>
                        <button onClick={() => setExpandedDeal(isExpanded ? null : deal.id)} className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors">{t("details")}<ChevronDown className={cn("h-3 w-3 transition-transform", isExpanded && "rotate-180")} /></button>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted"><div className={cn("h-full rounded-full transition-all duration-700", deal.final_score >= 70 ? "bg-primary" : deal.final_score >= 40 ? "bg-amber-500" : "bg-destructive")} style={{ width: `${Math.min(100, deal.final_score)}%` }} /></div>
                    </div>
                    {isExpanded && (
                      <div className="space-y-2.5 border-t pt-3 animate-in fade-in">
                        {deal.ai_analysis && typeof deal.ai_analysis === "object" && <p className="text-[10px] text-muted-foreground leading-relaxed">{(deal.ai_analysis as Record<string, unknown>).reasoning as string ?? ""}</p>}
                      </div>
                    )}
                    {deal.recommendation_status === "pending" && (
                      <div className="flex gap-2 pt-2">
                        <Button size="sm" variant="outline" className="flex-1 h-8 text-xs border-primary/30 text-primary hover:bg-primary/5" onClick={() => handleAction(deal.id, "approved")} disabled={isBusy}>{isBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : <><CheckCircle2 className="mr-1 h-3 w-3" />{t("approve")}</>}</Button>
                        <Button size="sm" variant="outline" className="flex-1 h-8 text-xs border-destructive/30 text-destructive hover:bg-destructive/5" onClick={() => handleAction(deal.id, "rejected")} disabled={isBusy}><XCircle className="mr-1 h-3 w-3" />{t("reject")}</Button>
                        <Button size="sm" variant="ghost" className="h-8 px-2 text-xs text-muted-foreground hover:text-destructive" onClick={() => handleAction(deal.id, "delete")} disabled={isBusy}><Trash2 className="h-3 w-3" /></Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
          {filteredDeals.length === 0 && <Card><CardContent className="flex flex-col items-center gap-3 py-12"><Handshake className="h-10 w-10 text-muted-foreground/40" /><p className="text-sm text-muted-foreground">{t("noDeals")}</p></CardContent></Card>}
        </>
      )}

      {deals.length === 0 && (
        <Card><CardContent className="flex flex-col items-center gap-4 py-16">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted"><Sparkles className="h-7 w-7 text-muted-foreground" /></div>
          <div className="text-center space-y-1.5"><h3 className="text-base font-semibold">{t("emptyTitle")}</h3><p className="text-sm text-muted-foreground max-w-sm">{t("emptyDesc")}</p></div>
        </CardContent></Card>
      )}
    </div>
  );
}
