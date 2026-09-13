"use client";

import { useState, useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, CheckCircle2, AlertCircle, Trash2 } from "lucide-react";
import { ExcelUploader } from "@/components/unconfirmed-data/excel-uploader";
import { AiProgressSteps, type Step } from "@/components/unconfirmed-data/ai-progress-steps";
import { DataPreviewTable } from "@/components/unconfirmed-data/data-preview-table";
import { ConfirmDialog } from "@/components/unconfirmed-data/confirm-dialog";
import { FolderFilePicker } from "@/components/unconfirmed-data/folder-file-picker";
import { processExcelFile, confirmUpload, type PreviewResult } from "@/lib/unconfirmed-data-actions";
import { Link } from "@/i18n/navigation";

export default function AddUnconfirmedDataPage() {
  const t = useTranslations("UnconfirmedData");

  const [currentStep, setCurrentStep] = useState<Step>("upload");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewData, setPreviewData] = useState<PreviewResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [processingDetails, setProcessingDetails] = useState<string[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [selectToInput, setSelectToInput] = useState("");
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [processedFileNames, setProcessedFileNames] = useState<string[]>([]);

  const selectedSet = useMemo(() => new Set(selectedIndices), [selectedIndices]);

  const remainingRows = useMemo(() => {
    if (!previewData) return [];
    return previewData.rows.filter((_, i) => !selectedSet.has(i));
  }, [previewData, selectedSet]);

  const handleFilesSelect = useCallback((files: File[]) => {
    setSelectedFiles((prev) => {
      const existing = new Set(prev.map((f) => `${f.name}-${f.size}-${f.lastModified}`));
      const fresh = files.filter((f) => !existing.has(`${f.name}-${f.size}-${f.lastModified}`));
      return [...prev, ...fresh];
    });
    setError(null);
  }, []);

  const handleRemoveFile = useCallback((index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setError(null);
  }, []);

  const handleClear = useCallback(() => {
    setSelectedFiles([]);
    setError(null);
  }, []);

  const handleStartProcessing = async () => {
    if (selectedFiles.length === 0) return;

    setProcessing(true);
    setError(null);
    setCurrentStep("ai");
    setProcessingDetails([t("processingFile")]);

    await new Promise((r) => setTimeout(r, 300));

    try {
      const totalFiles = selectedFiles.length;
      const mergedRows: PreviewResult["rows"] = [];
      const columnMap = new Map<string, PreviewResult["columns"][number]>();
      const headersSet = new Set<string>();
      let warningsTotal = 0;

      // Loop: استخراج البيانات من كل ملف على حدة ثم الدمج (union)
      // أي فشل يوقف العملية كلها حسب المطلوب
      for (let i = 0; i < totalFiles; i++) {
        const file = selectedFiles[i];
        setProcessingDetails((prev) => [
          ...prev,
          t("processingFileName", { name: file.name, current: i + 1, total: totalFiles }),
        ]);

        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error("file-read-failed"));
          reader.readAsDataURL(file);
        });

        let result: PreviewResult;
        try {
          result = await processExcelFile(base64, file.name);
        } catch (err: any) {
          throw new Error(`${file.name}: ${err?.message || "processing-failed"}`);
        }

        // وسم الصفوف باسم ملف المصدر (للمعاينة فقط)
        const taggedRows = result.rows.map((row) => ({ ...row, sourceFile: file.name }));
        mergedRows.push(...taggedRows);

        for (const col of result.columns) {
          if (!columnMap.has(col.key)) columnMap.set(col.key, col);
        }
        for (const h of result.headers) headersSet.add(h);
        warningsTotal += result.warningsCount;

        setProcessingDetails((prev) => [
          ...prev,
          t("processingFileDone", { name: file.name, rows: result.totalRows }),
        ]);

        await new Promise((r) => setTimeout(r, 200));
      }

      const merged: PreviewResult = {
        totalRows: mergedRows.length,
        warningsCount: warningsTotal,
        columns: Array.from(columnMap.values()),
        headers: Array.from(headersSet),
        rows: mergedRows,
      };

      setProcessingDetails((prev) => [
        ...prev,
        t("processingColumns", { cols: merged.columns.length, rows: merged.totalRows }),
        t("processingPhonesDone", {
          egyptian: merged.totalRows,
          international: 0,
          warnings: merged.warningsCount,
        }),
        t("processingDone"),
      ]);

      await new Promise((r) => setTimeout(r, 300));

      setPreviewData(merged);
      setProcessedFileNames(selectedFiles.map((f) => f.name));
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
    if (!previewData || selectedFiles.length === 0) return;
    setConfirming(true);

    try {
      const combinedFileName =
        selectedFiles.length === 1
          ? selectedFiles[0].name
          : selectedFiles.map((f) => f.name).join(" + ");
      // sourceFile للمُعاينة فقط — لا يُحفظ في قاعدة البيانات
      const rowsToSave = remainingRows.map(({ sourceFile: _omit, ...row }) => row);
      await confirmUpload({
        fileName: combinedFileName,
        headers: previewData.headers,
        rows: rowsToSave,
        fileId: selectedFileId,
      });
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
          <Link href="/unconfirmed-data">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {currentStep === "confirm" ? t("addData") : t("preview")}
            </h1>
            {currentStep === "confirm" ? (
              <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                <CheckCircle2 className="h-4 w-4 inline mr-1" />
                {t("uploadSuccess")}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                {remainingRows.length} / {previewData.totalRows} {t("totalRecords")}
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
                  <CardTitle className="text-base">{t("preview")}</CardTitle>
                  <div className="flex items-center gap-2">
                    {previewData.warningsCount > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                        <AlertCircle className="h-3 w-3" />
                        {previewData.warningsCount} {t("warnings")}
                      </span>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {processedFileNames.length > 0 && (
                  <div className="mb-3 flex flex-wrap items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">{t("sourceFiles")}:</span>
                    {processedFileNames.map((name) => (
                      <span key={name} className="inline-flex max-w-60 items-center truncate rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary" title={name}>
                        <span className="truncate">{name}</span>
                        <span className="ms-1 shrink-0 text-primary/60">
                          ({previewData.rows.filter((r) => r.sourceFile === name).length})
                        </span>
                      </span>
                    ))}
                  </div>
                )}
                <DataPreviewTable
                  columns={previewData.columns}
                  rows={previewData.rows}
                  locale="ar"
                  selectedIndices={selectedIndices}
                  onToggleSelect={toggleSelect}
                  showSourceFile
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  {selectedIndices.length > 0
                    ? t("deleteSelected", { count: selectedIndices.length })
                    : t("selectRows")}
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
                    {t("selectAll")}
                  </label>

                  <div className="flex items-center gap-1.5 text-sm">
                    <span className="text-muted-foreground">{t("selectTo")}</span>
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
                      {t("deleteSelected", { count: selectedIndices.length })}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="flex items-center justify-end gap-3">
              <Button variant="outline" onClick={() => { setPreviewData(null); setCurrentStep("upload"); setSelectedFiles([]); setProcessedFileNames([]); setSelectedIndices([]); }}>
                {t("backToUploads")}
              </Button>
              <Button onClick={() => setShowConfirm(true)} disabled={remainingRows.length === 0}>
                <CheckCircle2 className="h-4 w-4" />
                {t("confirmAdd")}
              </Button>
            </div>
          </>
        )}

        {currentStep === "confirm" && (
          <div className="flex justify-center">
            <Link href="/unconfirmed-data">
              <Button>
                <ArrowLeft className="h-4 w-4" />
                {t("backToUploads")}
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
        <Link href="/unconfirmed-data">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("addData")}</h1>
          <p className="text-sm text-muted-foreground">{t("uploadExcelMultiple")}</p>
        </div>
      </div>

      <AiProgressSteps currentStep={currentStep} />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t("selectFolder")}</CardTitle>
        </CardHeader>
        <CardContent>
          <FolderFilePicker selectedFileId={selectedFileId} onSelectFile={setSelectedFileId} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t("uploadExcelMultiple")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ExcelUploader
            multiple
            selectedFiles={selectedFiles}
            onFilesSelect={handleFilesSelect}
            onRemoveFile={handleRemoveFile}
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
            <Button onClick={handleStartProcessing} disabled={selectedFiles.length === 0 || processing}>
              {processing
                ? t("processingFiles", { current: processingDetails.length, total: selectedFiles.length })
                : t("startProcessing")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
