"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { ArrowLeft, Sparkles, RefreshCw, Loader2 } from "lucide-react";
import { runDealsMatching, getDealResults } from "@/lib/matching-engine";
import { DealsResultsTable } from "@/components/clients/deals-results-table";

export function DealsClient({ clientId, locale }: { clientId: string; locale: string }) {
  const t = useTranslations("Clients");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<{ totalProperties: number; filteredCount: number } | null>(null);
  const [unitsMap, setUnitsMap] = useState<Record<string, any>>({});

  const handleGenerate = async () => {
    setLoading(true); setError(null);
    try {
      const result = await runDealsMatching(clientId);
      setStats({ totalProperties: result.totalProperties, filteredCount: result.filteredCount });
      setUnitsMap(result.units || {});
      const enriched = (result.results || []).map((r: any) => ({ ...r, units: result.units?.[r.propertyId] || null }));
      setResults(enriched);
    } catch (e: any) { setError(e.message || "Failed"); }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/clients/${clientId}`} className="text-sm text-muted-foreground hover:underline inline-flex items-center gap-1"><ArrowLeft className="h-3 w-3" />Back</Link>
        <h1 className="text-2xl font-bold tracking-tight">Generate Deals</h1>
      </div>

      {results === null && !loading && (
        <Card><CardContent className="flex flex-col items-center justify-center py-16">
          <Sparkles className="h-12 w-12 text-primary mb-4" />
          <h2 className="text-lg font-semibold">Smart Deal Matching</h2>
          <p className="text-sm text-muted-foreground mt-1 mb-6 text-center max-w-md">Our AI will analyze all properties to find the best matches for this client.</p>
          <Button size="lg" onClick={handleGenerate} disabled={loading} className="gap-2">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}{loading ? "Analyzing..." : "Generate Deals"}</Button>
          {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
        </CardContent></Card>
      )}

      {results !== null && results.length === 0 && !loading && (
        <Card><CardContent className="flex flex-col items-center justify-center py-16">
          <Sparkles className="h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-lg font-semibold">No Matches Found</h2>
          <p className="text-sm text-muted-foreground mt-1 mb-6 text-center max-w-md">
            {stats ? `${stats.filteredCount} of ${stats.totalProperties} properties passed hard filters, but none scored high enough.` : "No properties matched this client's criteria."}
          </p>
          <Button variant="outline" size="sm" onClick={handleGenerate} disabled={loading} className="gap-2"><RefreshCw className="h-3.5 w-3.5" />Try Again</Button>
        </CardContent></Card>
      )}

      {loading && (
        <Card><CardContent className="flex flex-col items-center justify-center py-16">
          <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
          <h2 className="text-lg font-semibold">Analyzing Properties...</h2>
          <p className="text-sm text-muted-foreground mt-1">Running smart matching engine with AI analysis</p>
        </CardContent></Card>
      )}

      {results !== null && results.length > 0 && !loading && (
        <>
          <div className="flex items-center justify-between">
            {stats && <p className="text-sm text-muted-foreground">{stats.filteredCount} of {stats.totalProperties} properties passed hard filters</p>}
            <Button variant="outline" size="sm" onClick={handleGenerate} disabled={loading} className="gap-2"><RefreshCw className="h-3.5 w-3.5" />Regenerate</Button>
          </div>
          <Card><CardHeader className="pb-3"><CardTitle className="text-base">Matching Results ({results.length})</CardTitle></CardHeader><CardContent>
            <DealsResultsTable deals={results} locale={locale} clientId={clientId} />
          </CardContent></Card>
        </>
      )}
    </div>
  );
}
