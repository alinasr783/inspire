"use client";

import { useState, useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, CheckCircle2, AlertCircle, Trash2 } from "lucide-react";
import { ExcelUploader } from "@/components/unconfirmed-data/excel-uploader";
import { DataPreviewTable } from "@/components/unconfirmed-data/data-preview-table";
import { processClientsExcel, confirmGroupClients } from "@/lib/client-actions";
import type { PreviewResult } from "@/lib/unconfirmed-data-actions";
import { Link } from "@/i18n/navigation";

export default function GroupAddClientsPage() {
  const t = useTranslations("Clients");
  const tU = useTranslations("UnconfirmedData");

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<PreviewResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [done, setDone] = useState(false);
  const [inserted, setInserted] = useState(0);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const selectedSet = useMemo(() => new Set(selectedIndices), [selectedIndices]);

  const handleFileSelect = useCallback((file: File) => { setSelectedFile(file); setError(null); }, []);
  const handleClear = useCallback(() => { setSelectedFile(null); setError(null); setPreviewData(null); }, []);

  const handleStartProcessing = async () => {
    if (!selectedFile) return;
    setProcessing(true); setError(null);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = (e.target!.result as string).split(",")[1];
        const result = await processClientsExcel(`data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${base64}`);
        setPreviewData(result as unknown as PreviewResult);
        setProcessing(false);
      };
      reader.onerror = () => { setError("Failed to read file"); setProcessing(false); };
      reader.readAsDataURL(selectedFile);
    } catch (e: any) { setError(e.message); setProcessing(false); }
  };

  const handleConfirm = async () => {
    if (!previewData) return;
    setConfirming(true);
    try {
      const rows = previewData.rows
        .map((r) => ({ mapped: r.mapped as Record<string, string> }))
        .filter((_, i) => !selectedSet.has(i));
      const result = await confirmGroupClients(rows);
      setInserted(result.inserted);
      setDone(true);
    } catch (e: any) { setError(e.message); }
    setConfirming(false);
  };

  const toggleAll = () => {
    if (!previewData) return;
    if (selectedIndices.length === previewData.rows.length) setSelectedIndices([]);
    else setSelectedIndices(previewData.rows.map((_, i) => i));
  };
  const toggleOne = (i: number) => setSelectedIndices((p) => p.includes(i) ? p.filter((x) => x !== i) : [...p, i]);

  if (done) {
    return (
      <div className="space-y-6">
        <Link href="/clients" className="text-sm text-muted-foreground hover:underline inline-flex items-center gap-1"><ArrowLeft className="h-3 w-3" />Back</Link>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
            <h2 className="text-xl font-bold">Success</h2>
            <p className="text-muted-foreground mt-1">{inserted} clients added successfully</p>
            <Link href="/clients"><Button className="mt-4">Back to Clients</Button></Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/clients" className="text-sm text-muted-foreground hover:underline inline-flex items-center gap-1"><ArrowLeft className="h-3 w-3" />Back</Link>
        <h1 className="text-2xl font-bold tracking-tight">{t("groupAddUnits")}</h1>
      </div>

      {!previewData && (
        <Card>
          <CardHeader><CardTitle className="text-base">{tU("uploadExcel")}</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Input type="file" accept=".xlsx,.xls" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }} />
            </div>
            {selectedFile && (
              <div className="mt-4 flex items-center gap-3">
                <span className="text-sm text-muted-foreground">{selectedFile.name}</span>
                <Button variant="ghost" size="sm" onClick={handleClear}><Trash2 className="h-3 w-3" /></Button>
              </div>
            )}
            <Button className="mt-4" onClick={handleStartProcessing} disabled={!selectedFile || processing}>
              {processing ? "Processing..." : "Process Excel"}
            </Button>
            {error && <div className="mt-3 flex items-center gap-2 text-sm text-destructive"><AlertCircle className="h-4 w-4" />{error}</div>}
          </CardContent>
        </Card>
      )}

      {previewData && (
        <Card>
          <CardHeader><CardTitle className="text-base">Preview ({previewData.rows.length} rows)</CardTitle></CardHeader>
          <CardContent>
            <div className="mb-3 flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={selectedIndices.length === previewData.rows.length && previewData.rows.length > 0} onChange={toggleAll} /> Select All
              </label>
            </div>
            <DataPreviewTable columns={previewData.columns} rows={previewData.rows} locale="en" selectedIndices={selectedIndices} onToggleSelect={toggleOne} />
            <div className="mt-4 flex gap-3">
              <Button onClick={handleConfirm} disabled={confirming}>
                {confirming ? "Adding..." : `Add ${previewData.rows.length - selectedIndices.length} Clients`}
              </Button>
              <Button variant="outline" onClick={handleClear}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
