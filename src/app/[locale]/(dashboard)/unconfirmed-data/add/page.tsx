"use client";

import { useState, useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, CheckCircle2, AlertCircle, Trash2, Clock, Loader2, MinusCircle } from "lucide-react";
import { ExcelUploader } from "@/components/unconfirmed-data/excel-uploader";
import { AiProgressSteps, type Step } from "@/components/unconfirmed-data/ai-progress-steps";
import { DataPreviewTable } from "@/components/unconfirmed-data/data-preview-table";
import { ConfirmDialog } from "@/components/unconfirmed-data/confirm-dialog";
import { FolderFilePicker } from "@/components/unconfirmed-data/folder-file-picker";
import { UploadIssuesPanel, type UploadIssue } from "@/components/unconfirmed-data/upload-issues-panel";
import { processExcelFile, confirmUpload, type PreviewResult } from "@/lib/unconfirmed-data-actions";
import { Link } from "@/i18n/navigation";

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB per file

type FileStatus = {
  name: string;
  status: "pending" | "reading" | "processing" | "success" | "failed" | "skipped";
  rows?: number;
  note?: string;
};

const makeId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export default function AddUnconfirmedDataPage() {
  const t = useTranslations("UnconfirmedData");

  const [currentStep, setCurrentStep] = useState<Step>("upload");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewData, setPreviewData] = useState<PreviewResult | null>(null);
  const [issues, setIssues] = useState<UploadIssue[]>([]);
  const [fileStatuses, setFileStatuses] = useState<FileStatus[]>([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [processingDetails, setProcessingDetails] = useState<string[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [selectToInput, setSelectToInput] = useState("");
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [processedFileNames, setProcessedFileNames] = useState<string[]>([]);

  const pushIssue = useCallback((issue: Omit<UploadIssue, "id">) => {
    const id = makeId();
    setIssues((prev) => [...prev, { ...issue, id }]);
    return id;
  }, []);

  const dismissIssue = useCallback((id: string) => {
    setIssues((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const clearIssues = useCallback(() => setIssues([]), []);

  const errorFileNames = useMemo(() => {
    const names = new Set<string>();
    for (const i of issues) {
      if (i.severity === "error" && i.fileName) names.add(i.fileName);
    }
    return names;
  }, [issues]);

  const errorIndices = useMemo(
    () =>
      selectedFiles
        .map((f, idx) => (errorFileNames.has(f.name) ? idx : -1))
        .filter((i) => i >= 0),
    [selectedFiles, errorFileNames]
  );

  const hasBlockingErrors = useMemo(
    () => issues.some((i) => i.severity === "error"),
    [issues]
  );

  const selectedSet = useMemo(() => new Set(selectedIndices), [selectedIndices]);

  const remainingRows = useMemo(() => {
    if (!previewData) return [];
    return previewData.rows.filter((_, i) => !selectedSet.has(i));
  }, [previewData, selectedSet]);

  const handleFilesSelect = useCallback((files: File[]) => {
    const existing = new Set(selectedFiles.map((f) => `${f.name}-${f.size}-${f.lastModified}`));
    const toAdd: File[] = [];
    for (const f of files) {
      const key = `${f.name}-${f.size}-${f.lastModified}`;
      if (existing.has(key)) {
        pushIssue({
          stage: "upload",
          severity: "info",
          code: "duplicate-file",
          fileName: f.name,
          title: t("errDuplicateTitle"),
          reason: t("errDuplicateReason", { name: f.name }),
          suggestion: t("errDuplicateFix"),
        });
        continue;
      }
      if (f.size === 0) {
        pushIssue({
          stage: "upload",
          severity: "error",
          code: "file-empty",
          fileName: f.name,
          title: t("errEmptyFileTitle"),
          reason: t("errEmptyFileReason", { name: f.name }),
          suggestion: t("errEmptyFileFix"),
        });
        continue;
      }
      if (f.size > MAX_FILE_SIZE) {
        pushIssue({
          stage: "upload",
          severity: "error",
          code: "file-too-large",
          fileName: f.name,
          title: t("errTooLargeTitle"),
          reason: t("errTooLargeReason", {
            name: f.name,
            size: (f.size / (1024 * 1024)).toFixed(1),
          }),
          suggestion: t("errTooLargeFix"),
        });
        continue;
      }
      existing.add(key);
      toAdd.push(f);
    }
    if (toAdd.length > 0) {
      setSelectedFiles((prev) => [...prev, ...toAdd]);
      setFileStatuses((prev) => [
        ...prev,
        ...toAdd.map((f) => ({ name: f.name, status: "pending" as const })),
      ]);
    }
  }, [selectedFiles, pushIssue, t]);

  const handleRejectedFiles = useCallback((files: File[]) => {
    for (const f of files) {
      pushIssue({
        stage: "upload",
        severity: "error",
        code: "invalid-type",
        fileName: f.name,
        title: t("errInvalidTypeTitle"),
        reason: t("errInvalidTypeReason", { name: f.name }),
        suggestion: t("errInvalidTypeFix"),
      });
    }
  }, [pushIssue, t]);

  const handleRemoveFile = useCallback((index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setFileStatuses((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleClear = useCallback(() => {
    setSelectedFiles([]);
    setFileStatuses([]);
  }, []);

  const codeToProcessingIssue = useCallback((rawCode: string, fileName: string, fileIndex: number): Omit<UploadIssue, "id"> => {
    const [code, detail] = rawCode.split(/:(.+)/).map((s) => s?.trim());
    switch (code) {
      case "file-read-failed":
        return {
          stage: "processing", severity: "error", code, fileName, fileIndex,
          title: t("errReadTitle"),
          reason: t("errReadReason", { name: fileName }),
          suggestion: t("errReadFix"),
        };
      case "invalid-base64":
        return {
          stage: "processing", severity: "error", code, fileName, fileIndex,
          title: t("errInvalidDataTitle"),
          reason: t("errInvalidDataReason", { name: fileName }),
          suggestion: t("errInvalidDataFix"),
        };
      case "corrupt-file":
        return {
          stage: "processing", severity: "error", code, fileName, fileIndex,
          title: t("errCorruptTitle"),
          reason: t("errCorruptReason", { name: fileName }),
          suggestion: t("errCorruptFix"),
        };
      case "no-sheets":
        return {
          stage: "processing", severity: "error", code, fileName, fileIndex,
          title: t("errNoSheetsTitle"),
          reason: t("errNoSheetsReason", { name: fileName }),
          suggestion: t("errNoSheetsFix"),
        };
      case "unreadable-sheet":
        return {
          stage: "processing", severity: "error", code, fileName, fileIndex,
          title: t("errSheetTitle"),
          reason: t("errSheetReason", { name: fileName, sheet: detail ?? "?" }),
          suggestion: t("errSheetFix"),
          details: detail ? [detail] : undefined,
        };
      case "excel-empty":
        return {
          stage: "processing", severity: "error", code, fileName, fileIndex,
          title: t("errEmptyExcelTitle"),
          reason: t("errEmptyExcelReason", { name: fileName }),
          suggestion: t("errEmptyExcelFix"),
        };
      case "no-headers":
        return {
          stage: "processing", severity: "error", code, fileName, fileIndex,
          title: t("errNoHeadersTitle"),
          reason: t("errNoHeadersReason", { name: fileName }),
          suggestion: t("errNoHeadersFix"),
        };
      case "only-empty-rows":
        return {
          stage: "processing", severity: "error", code, fileName, fileIndex,
          title: t("errOnlyEmptyRowsTitle"),
          reason: t("errOnlyEmptyRowsReason", { name: fileName }),
          suggestion: t("errOnlyEmptyRowsFix"),
        };
      case "unauthorized":
        return {
          stage: "processing", severity: "error", code, fileName, fileIndex,
          title: t("errAuthTitle"),
          reason: t("errAuthReason"),
          suggestion: t("errAuthFix"),
        };
      default:
        return {
          stage: "processing", severity: "error", code: code || "processing-failed", fileName, fileIndex,
          title: t("errProcessingTitle"),
          reason: t("errProcessingReason", { name: fileName, code: code || "unknown" }),
          suggestion: t("errProcessingFix"),
        };
    }
  }, [t]);

  const handleStartProcessing = async () => {
    if (selectedFiles.length === 0) return;

    setProcessing(true);
    // مسح مشاكل المعالجة السابقة مع الاحتفاظ بمشاكل الرفع
    setIssues((prev) => prev.filter((i) => i.stage === "upload"));
    setFileStatuses(selectedFiles.map((f) => ({ name: f.name, status: "pending" as const })));
    setCurrentStep("ai");
    setProcessingDetails([t("processingFile")]);

    await new Promise((r) => setTimeout(r, 300));

    try {
      const totalFiles = selectedFiles.length;
      const mergedRows: PreviewResult["rows"] = [];
      const columnMap = new Map<string, PreviewResult["columns"][number]>();
      const headersSet = new Set<string>();
      const perFileMapped: Array<{ name: string; mapped: string[]; headers: string[] }> = [];
      let warningsTotal = 0;
      let failed = false;

      // Loop: استخراج البيانات من كل ملف على حدة ثم الدمج (union)
      // أي فشل يوقف العملية كلها ويُسجل بوضوح
      for (let i = 0; i < totalFiles; i++) {
        const file = selectedFiles[i];
        setProcessingDetails((prev) => [
          ...prev,
          t("processingFileName", { name: file.name, current: i + 1, total: totalFiles }),
        ]);
        setFileStatuses((prev) => prev.map((s, idx) => (idx === i ? { ...s, status: "reading" as const } : s)));

        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error("file-read-failed"));
          reader.readAsDataURL(file);
        }).catch(() => {
          pushIssue(codeToProcessingIssue("file-read-failed", file.name, i));
          setFileStatuses((prev) => prev.map((s, idx) => (idx === i ? { ...s, status: "failed" as const, note: "file-read-failed" } : s)));
          failed = true;
          throw new Error(`__stop__:${file.name}`);
        });

        if (failed) break;

        setFileStatuses((prev) => prev.map((s, idx) => (idx === i ? { ...s, status: "processing" as const } : s)));

        let result: PreviewResult;
        try {
          result = await processExcelFile(base64, file.name);
        } catch (err: any) {
          const raw = String(err?.message || "processing-failed").replace(`${file.name}: `, "");
          pushIssue(codeToProcessingIssue(raw, file.name, i));
          setFileStatuses((prev) => prev.map((s, idx) => (idx === i ? { ...s, status: "failed" as const, note: raw } : s)));
          // علّم الباقي كمتخطى لأن الفشل يوقف العملية
          setFileStatuses((prev) => prev.map((s, idx) => (idx > i && s.status === "pending" ? { ...s, status: "skipped" as const } : s)));
          failed = true;
          throw new Error(`__stop__:${file.name}`);
        }

        // وسم الصفوف باسم ملف المصدر (للمعاينة فقط)
        const taggedRows = result.rows.map((row) => ({ ...row, sourceFile: file.name }));
        mergedRows.push(...taggedRows);

        for (const col of result.columns) {
          if (!columnMap.has(col.key)) columnMap.set(col.key, col);
        }
        for (const h of result.headers) headersSet.add(h);
        warningsTotal += result.warningsCount;
        perFileMapped.push({
          name: file.name,
          mapped: result.diagnostics?.mappedKeys ?? [],
          headers: result.headers,
        });

        // تحذيرات جودة البيانات لكل ملف — ظاهرة بوضوح
        const diag = result.diagnostics;
        if (diag?.unmappedHeaders && diag.unmappedHeaders.length > 0) {
          pushIssue({
            stage: "processing",
            severity: "warning",
            code: "unmapped-columns",
            fileName: file.name,
            fileIndex: i,
            title: t("warnUnmappedTitle"),
            reason: t("warnUnmappedReason", { name: file.name, count: diag.unmappedHeaders.length }),
            suggestion: t("warnUnmappedFix"),
            details: diag.unmappedHeaders,
          });
        }
        if (diag?.missingCritical && diag.missingCritical.length > 0) {
          const labels = diag.missingCritical.map((k) => {
            if (k === "owner_phone") return t("phone");
            if (k === "owner_name") return t("ownerName");
            return k;
          });
          pushIssue({
            stage: "processing",
            severity: "error",
            code: "missing-critical-columns",
            fileName: file.name,
            fileIndex: i,
            title: t("errMissingCriticalTitle"),
            reason: t("errMissingCriticalReason", { name: file.name, cols: labels.join("، ") }),
            suggestion: t("errMissingCriticalFix"),
            details: result.headers,
          });
        }
        if (diag && diag.emptyRowsSkipped > 0) {
          pushIssue({
            stage: "processing",
            severity: "info",
            code: "empty-rows-skipped",
            fileName: file.name,
            fileIndex: i,
            title: t("infoEmptyRowsTitle"),
            reason: t("infoEmptyRowsReason", { name: file.name, count: diag.emptyRowsSkipped }),
          });
        }

        setFileStatuses((prev) => prev.map((s, idx) => (idx === i ? { ...s, status: "success" as const, rows: result.totalRows } : s)));
        setProcessingDetails((prev) => [
          ...prev,
          t("processingFileDone", { name: file.name, rows: result.totalRows }),
        ]);

        await new Promise((r) => setTimeout(r, 200));
      }

      if (failed) {
        setProcessing(false);
        setCurrentStep("upload");
        return;
      }

      // كشف عدم تشابه أسماء الأعمدة بين الملفات
      if (perFileMapped.length > 1) {
        const base = new Set(perFileMapped[0].mapped);
        perFileMapped.slice(1).forEach((f, k) => {
          const idx = k + 1;
          const onlyInBase = perFileMapped[0].mapped.filter((m) => !f.mapped.includes(m));
          const onlyInFile = f.mapped.filter((m) => !base.has(m));
          if (onlyInBase.length > 0 || onlyInFile.length > 0) {
            pushIssue({
              stage: "processing",
              severity: "warning",
              code: "header-mismatch",
              fileName: f.name,
              fileIndex: idx,
              title: t("warnMismatchTitle"),
              reason: t("warnMismatchReason", { name: f.name, base: perFileMapped[0].name }),
              suggestion: t("warnMismatchFix"),
              details: [
                ...onlyInBase.map((m) => `− ${perFileMapped[0].name}: ${m}`),
                ...onlyInFile.map((m) => `+ ${f.name}: ${m}`),
              ],
            });
          }
        });
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
      // التوقف المتعمد بعد تسجيل الخطأ بتفاصيله — لا حاجة لخطأ عام
      if (String(err?.message || "").startsWith("__stop__")) {
        setProcessing(false);
        setCurrentStep("upload");
        return;
      }
      pushIssue({
        stage: "processing",
        severity: "error",
        code: "unexpected",
        title: t("errProcessingTitle"),
        reason: String(err?.message || "processing-failed"),
        suggestion: t("errProcessingFix"),
      });
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
      const raw = String(err?.message || "confirm-failed");
      pushIssue({
        stage: "confirm",
        severity: "error",
        code: raw.split(":")[0] || "confirm-failed",
        title: t("errConfirmTitle"),
        reason: t("errConfirmReason", { error: raw }),
        suggestion: t("errConfirmFix"),
        details: [raw],
      });
      setConfirming(false);
      setShowConfirm(false);
      // ارجع لخطوة المراجعة ليرى المستخدم الخطأ بوضوح
      setCurrentStep("review");
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

        {issues.length > 0 && (
          <UploadIssuesPanel issues={issues} onDismiss={dismissIssue} onClearAll={clearIssues} />
        )}

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
              <Button variant="outline" onClick={() => { setPreviewData(null); setCurrentStep("upload"); setSelectedFiles([]); setFileStatuses([]); setProcessedFileNames([]); setSelectedIndices([]); }}>
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
          {issues.length > 0 && (
            <UploadIssuesPanel issues={issues} onDismiss={dismissIssue} onClearAll={clearIssues} />
          )}

          <ExcelUploader
            multiple
            selectedFiles={selectedFiles}
            onFilesSelect={handleFilesSelect}
            onRejectedFiles={handleRejectedFiles}
            onRemoveFile={handleRemoveFile}
            onClear={handleClear}
            errorIndices={errorIndices}
          />

          {/* حالة كل ملف — ناجح / فاشل / جارٍ */}
          {fileStatuses.some((s) => s.status !== "pending") && (
            <div className="space-y-1.5 rounded-xl border bg-muted/20 p-3">
              <p className="px-1 text-xs font-bold text-foreground">{t("filesStatusTitle")}</p>
              {fileStatuses.map((s, i) => (
                <div
                  key={`${s.name}-${i}`}
                  className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 text-xs ${
                    s.status === "success"
                      ? "border-emerald-300 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/30"
                      : s.status === "failed"
                        ? "border-red-300 bg-red-50 dark:border-red-900/60 dark:bg-red-950/30"
                        : s.status === "skipped"
                          ? "border-muted bg-muted/40 opacity-70"
                          : "border-sky-300 bg-sky-50 dark:border-sky-900/60 dark:bg-sky-950/30"
                  }`}
                >
                  {s.status === "success" ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  ) : s.status === "failed" ? (
                    <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                  ) : s.status === "skipped" ? (
                    <MinusCircle className="h-4 w-4 shrink-0 text-muted-foreground" />
                  ) : s.status === "pending" ? (
                    <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
                  ) : (
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin text-sky-600" />
                  )}
                  <span className="min-w-0 flex-1 truncate font-medium" title={s.name} dir="auto">
                    <span className="me-1 font-bold">{i + 1}.</span> {s.name}
                  </span>
                  <span className="shrink-0 font-medium text-muted-foreground">
                    {s.status === "success" && typeof s.rows === "number"
                      ? t("fileStatusSuccess", { count: s.rows })
                      : s.status === "failed"
                        ? t("fileStatusFailed")
                        : s.status === "skipped"
                          ? t("fileStatusSkipped")
                          : s.status === "pending"
                            ? t("fileStatusPending")
                            : t("fileStatusWorking")}
                  </span>
                </div>
              ))}
            </div>
          )}

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

          {hasBlockingErrors && !processing && (
            <div className="flex items-start gap-2 rounded-lg border border-red-300 bg-red-50 p-3 text-xs text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{t("fixErrorsFirst")}</span>
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
