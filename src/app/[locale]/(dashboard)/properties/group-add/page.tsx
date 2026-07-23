"use client";

import { useState, useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, CheckCircle2, AlertCircle, Trash2 } from "lucide-react";
import { ExcelUploader } from "@/components/unconfirmed-data/excel-uploader";
import { AiProgressSteps, type Step } from "@/components/unconfirmed-data/ai-progress-steps";
import { DataPreviewTable } from "@/components/unconfirmed-data/data-preview-table";
import { ConfirmDialog } from "@/components/unconfirmed-data/confirm-dialog";
import { processUnitsExcel, confirmGroupUnits } from "@/lib/unit-actions";
import type { PreviewResult } from "@/lib/unconfirmed-data-actions";
import { Link } from "@/i18n/navigation";

const UNIT_STANDARD_KEYS = [
  "customer_name", "phone", "compound_name", "area", "building_number",
  "finishing_status", "rent_sale", "unit_type", "cash_required", "remaining",
  "last_contact_date", "additional_notes", "feedback",
];

export default function GroupAddUnitsPage() {
  const t = useTranslations("Properties");
  const tU = useTranslations("UnconfirmedData");
  const router = useRouter();

  const [currentStep, setCurrentStep] = useState<Step>("upload");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<PreviewResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [processingDetails, setProcessingDetails] = useState<string[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [selectToInput, setSelectToInput] = useState("");

  const selectedSet = useMemo(() => new Set(selectedIndices), [selectedIndices]);

  const remainingRows = useMemo(() => {
    if (!previewData) return [];
    return previewData.rows.filter((_, i) => !selectedSet.has(i));
  }, [previewData, selectedSet]);

  const handleFileSelect = useCallback((file: File) => {
    setSelectedFile(file);
    setError(null);
  }, []);

  const handleClear = useCallback(() => {
    setSelectedFile(null);
    setError(null);
  }, []);

  const handleStartProcessing = async () => {
    if (!selectedFile) return;

    setProcessing(true);
    setError(null);
    setCurrentStep("ai");
    setProcessingDetails([tU("processingFile")]);

    await new Promise((r) => setTimeout(r, 300));

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("file-read-failed"));
        reader.readAsDataURL(selectedFile);
      });

      setProcessingDetails((prev) => [
        ...prev,
        tU("processingColumns", { cols: "?", rows: "?" }),
      ]);

      const result = await processUnitsExcel(base64);

      setProcessingDetails((prev) => [
        ...prev,
        tU("processingPhonesDone", {
          egyptian: result.totalRows,
          international: 0,
          warnings: result.warningsCount,
        }),
        tU("processingDone"),
      ]);

      await new Promise((r) => setTimeout(r, 300));

      setPreviewData(result);
      setSelectedIndices([]);
      setSelectToInput("");
      setCurrentStep("review");
      setProcessing(false);
    } catch (err: any) {
      setError(err.message || "processing-failed");
      setProcessing(false);
      setCurrentStep("upload");
    }
  };

  const toggleSelect = (index: number) => {
    setSelectedIndices((prev) => {
      if (prev.includes(index)) return prev.filter((i) => i !== index);
      return [...prev, index];
    });
  };

  const toggleSelectAll = () => {
    if (!previewData) return;
    if (selectedIndices.length === previewData.rows.length) {
      setSelectedIndices([]);
    } else {
      setSelectedIndices(previewData.rows.map((_, i) => i));
    }
  };

  const selectTo = () => {
    if (!previewData) return;
    const num = parseInt(selectToInput, 10);
    if (isNaN(num) || num < 1) return;
    const max = Math.min(num, previewData.rows.length);
    setSelectedIndices(Array.from({ length: max }, (_, i) => i));
  };

  const deleteSelected = () => {
    if (!previewData) return;
    const remaining = previewData.rows.filter((_, i) => !selectedSet.has(i));
    setPreviewData({ ...previewData, rows: remaining, totalRows: remaining.length });
    setSelectedIndices([]);
  };

  const handleConfirm = async () => {
    if (!previewData) return;
    setConfirming(true);

    try {
      await confirmGroupUnits(remainingRows);
      setCurrentStep("confirm");
      setShowConfirm(false);
      setConfirming(false);
    } catch (err: any) {
      setError(err.message || "confirm-failed");
      setConfirming(false);
      setShowConfirm(false);
    }
  };

  if (previewData && currentStep !== "upload") {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/properties">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {currentStep === "confirm" ? t("groupAddUnits") : tU("preview")}
            </h1>
            {currentStep === "confirm" ? (
              <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                <CheckCircle2 className="h-4 w-4 inline mr-1" />
                {tU("uploadSuccess")}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                {remainingRows.length} / {previewData.totalRows} {tU("totalRecords")}
              </p>
            )}
          </div>
        </div>

        <AiProgressSteps currentStep={currentStep} />

        {currentStep !== "confirm" && (
          <>
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{tU("preview")}</CardTitle>
                  <div className="flex items-center gap-2">
                    {previewData.warningsCount > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                        <AlertCircle className="h-3 w-3" />
                        {previewData.warningsCount} {tU("warnings")}
                      </span>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <DataPreviewTable
                  columns={previewData.columns}
                  rows={previewData.rows}
                  locale="ar"
                  selectedIndices={selectedIndices}
                  onToggleSelect={toggleSelect}
                  standardKeys={UNIT_STANDARD_KEYS}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  {selectedIndices.length > 0
                    ? tU("deleteSelected", { count: selectedIndices.length })
                    : tU("selectRows")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer select-none rounded-md border px-3 py-1.5 text-sm hover:bg-muted/50">
                    <input
                      type="checkbox"
                      checked={previewData.rows.length > 0 && selectedIndices.length === previewData.rows.length}
                      onChange={toggleSelectAll}
                      className="h-4 w-4"
                    />
                    {tU("selectAll")}
                  </label>

                  <div className="flex items-center gap-1.5 text-sm">
                    <span className="text-muted-foreground">{tU("selectTo")}</span>
                    <Input
                      type="number"
                      min={1}
                      max={previewData.rows.length}
                      value={selectToInput}
                      onChange={(e) => setSelectToInput(e.target.value)}
                      className="h-8 w-20 text-sm"
                      placeholder={String(previewData.rows.length)}
                    />
                    <Button size="sm" variant="outline" onClick={selectTo}>
                      Go
                    </Button>
                  </div>

                  {selectedIndices.length > 0 && (
                    <Button variant="destructive" size="sm" className="gap-1.5" onClick={deleteSelected}>
                      <Trash2 className="h-4 w-4" />
                      {tU("deleteSelected", { count: selectedIndices.length })}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="flex items-center justify-end gap-3">
              <Button variant="outline" onClick={() => { setPreviewData(null); setCurrentStep("upload"); setSelectedFile(null); setSelectedIndices([]); }}>
                {tU("backToUploads")}
              </Button>
              <Button onClick={() => setShowConfirm(true)} disabled={remainingRows.length === 0}>
                <CheckCircle2 className="h-4 w-4" />
                {tU("confirmAdd")}
              </Button>
            </div>
          </>
        )}

        {currentStep === "confirm" && (
          <div className="flex justify-center">
            <Link href="/properties">
              <Button>
                <ArrowLeft className="h-4 w-4" />
                {tU("backToUploads")}
              </Button>
            </Link>
          </div>
        )}

        <ConfirmDialog
          open={showConfirm}
          totalRows={remainingRows.length}
          totalColumns={previewData.columns.length}
          warningsCount={previewData.warningsCount}
          onConfirm={handleConfirm}
          onCancel={() => setShowConfirm(false)}
          loading={confirming}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6" suppressHydrationWarning>
      <div className="flex items-center gap-4">
        <Link href="/properties">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("groupAddUnits")}</h1>
          <p className="text-sm text-muted-foreground">{tU("uploadExcel")}</p>
        </div>
      </div>

      <AiProgressSteps currentStep={currentStep} />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{tU("uploadExcel")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ExcelUploader
            onFileSelect={handleFileSelect}
            selectedFile={selectedFile}
            onClear={handleClear}
          />

          {processing && (
            <div className="space-y-2 rounded-lg border bg-muted/30 p-4">
              {processingDetails.map((msg, i) => (
                <div key={i} className={`text-sm ${i === processingDetails.length - 1 ? "text-primary font-medium" : "text-muted-foreground"}`}>
                  {i < processingDetails.length - 1 ? "✓ " : "⟳ "}
                  {msg}
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span className="whitespace-pre-wrap font-mono text-xs">{error}</span>
            </div>
          )}

          <div className="flex justify-end">
            <Button onClick={handleStartProcessing} disabled={!selectedFile || processing}>
              {processing ? tU("processing") : tU("startProcessing")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
