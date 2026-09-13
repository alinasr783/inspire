"use client";

import { useState, useCallback, useMemo, useRef } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, CheckCircle2, AlertCircle, Trash2 } from "lucide-react";
import {
  MultiExcelUploader,
  type MultiFileItem,
} from "@/components/unconfirmed-data/multi-excel-uploader";
import { AiProgressSteps, type Step } from "@/components/unconfirmed-data/ai-progress-steps";
import { DataPreviewTable } from "@/components/unconfirmed-data/data-preview-table";
import { ConfirmDialog } from "@/components/unconfirmed-data/confirm-dialog";
import { MultiFileErrorDialog } from "@/components/unconfirmed-data/multi-file-error-dialog";
import { FolderFilePicker } from "@/components/unconfirmed-data/folder-file-picker";
import {
  createConfirmedUpload,
  appendConfirmedRecords,
  deleteConfirmedUpload,
  type PreviewResult,
  type PreviewRow,
} from "@/lib/unconfirmed-data-actions";
import { UNCONFIRMED_UPLOAD_LIMITS } from "@/lib/unconfirmed-upload-limits";
import { parseExcelBuffer } from "@/lib/excel-parse";
import { Link, useRouter } from "@/i18n/navigation";

type MergedRow = PreviewRow & { _sourceFile: string };

interface MergedPreview {
  totalRows: number;
  warningsCount: number;
  columns: Array<{ key: string; label: string; type: string; target: string; targetDuplicate: boolean }>;
  rows: MergedRow[];
  headersByFile: Record<string, string[]>;
  filesIncluded: string[];
  skippedFiles: string[];
}

interface ErrorDialogState {
  fileName: string;
  errorMessage: string;
  remainingCount: number;
}

const newId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export default function AddUnconfirmedDataPage() {
  const t = useTranslations("UnconfirmedData");
  const router = useRouter();

  const [currentStep, setCurrentStep] = useState<Step>("upload");
  const [files, setFiles] = useState<MultiFileItem[]>([]);
  const [previewData, setPreviewData] = useState<MergedPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [processingDetails, setProcessingDetails] = useState<string[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [selectToInput, setSelectToInput] = useState("");
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [errorDialog, setErrorDialog] = useState<ErrorDialogState | null>(null);
  const [confirmSummary, setConfirmSummary] = useState<{
    succeeded: Array<{ fileName: string; rows: number }>;
    failed: Array<{ fileName: string; reason: string }>;
  } | null>(null);

  const decisionRef = useRef<((action: "continue" | "stop", remember: boolean) => void) | null>(null);

  const selectedSet = useMemo(() => new Set(selectedIndices), [selectedIndices]);

  const friendlyError = useCallback(
    (code: string, fileName: string) => {
      const clean = (code || "").split(":")[0].trim();
      switch (clean) {
        case "file-too-large":
          return t("fileTooLarge", { name: fileName, max: 15 });
        case "excel-corrupt":
          return t("fileCorrupt", { name: fileName });
        case "excel-empty":
          return t("fileEmpty", { name: fileName });
        case "no-valid-columns":
          return t("noValidColumns", { name: fileName });
        case "file-read-failed":
          return t("fileReadFailed", { name: fileName });
        case "unauthorized":
          return t("errorUnauthorized");
        default:
          return `${fileName}: ${code}`;
      }
    },
    [t]
  );

  const handleAddFiles = useCallback((newFiles: File[]) => {
    setFiles((prev) => [
      ...prev,
      ...newFiles.map((f) => ({ id: newId(), file: f, status: "pending" as const })),
    ]);
    setError(null);
  }, []);

  const handleRemove = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const waitForDecision = useCallback(
    (fileName: string, errorMessage: string, remainingCount: number) =>
      new Promise<{ action: "continue" | "stop"; remember: boolean }>((resolve) => {
        setErrorDialog({ fileName, errorMessage, remainingCount });
        decisionRef.current = (action, remember) => resolve({ action, remember });
      }),
    []
  );

  const handleStartProcessing = async () => {
    if (files.length === 0 || processing) return;

    setProcessing(true);
    setError(null);
    setConfirmSummary(null);
    setCurrentStep("ai");
    setProcessingDetails([t("processingFiles", { count: files.length })]);
    setFiles((prev) => prev.map((f) => ({ ...f, status: "pending" as const, error: undefined, rowsCount: undefined })));

    const results: PreviewResult[] = [];
    const skipped: string[] = [];
    let autoSkip = false;
    let stopped = false;

    const snapshot = files;

    for (let i = 0; i < snapshot.length; i++) {
      const item = snapshot[i];
      setFiles((prev) => prev.map((f) => (f.id === item.id ? { ...f, status: "processing" as const } : f)));
      setProcessingDetails((prev) => [...prev, t("processingFileName", { name: item.file.name, current: i + 1, total: snapshot.length })]);

      try {
        // Local parse (no server round-trip): avoids Server Action payload limits
        // on huge previews ("Maximum array nesting exceeded").
        if (item.file.size > UNCONFIRMED_UPLOAD_LIMITS.maxBytesPerFile) {
          throw new Error("file-too-large");
        }
        const buf = await item.file.arrayBuffer();
        const result = parseExcelBuffer(buf, item.file.name);
        results.push(result);
        setFiles((prev) =>
          prev.map((f) => (f.id === item.id ? { ...f, status: "success" as const, rowsCount: result.totalRows } : f))
        );
        setProcessingDetails((prev) => [...prev, t("processingFileDone", { name: item.file.name, rows: result.totalRows })]);
      } catch (err: unknown) {
        const raw = err instanceof Error ? err.message : "processing-failed";
        const msg = friendlyError(raw, item.file.name);
        const remaining = snapshot.length - i - 1;

        if (autoSkip) {
          skipped.push(item.file.name);
          setFiles((prev) => prev.map((f) => (f.id === item.id ? { ...f, status: "error" as const, error: msg } : f)));
          setProcessingDetails((prev) => [...prev, t("processingFileSkipped", { name: item.file.name })]);
          continue;
        }

        const decision = await waitForDecision(item.file.name, msg, remaining);
        setErrorDialog(null);
        decisionRef.current = null;

        if (decision.remember) autoSkip = true;

        if (decision.action === "continue") {
          skipped.push(item.file.name);
          setFiles((prev) => prev.map((f) => (f.id === item.id ? { ...f, status: "error" as const, error: msg } : f)));
          setProcessingDetails((prev) => [...prev, t("processingFileSkipped", { name: item.file.name })]);
        } else {
          setFiles((prev) => prev.map((f) => (f.id === item.id ? { ...f, status: "error" as const, error: msg } : f)));
          stopped = true;
          break;
        }
      }
    }

    if (stopped) {
      setProcessing(false);
      setCurrentStep("upload");
      return;
    }

    if (results.length === 0) {
      setError(t("allFilesFailed"));
      setProcessing(false);
      setCurrentStep("upload");
      return;
    }

    // Merge: union columns (preserve order), tag rows with source file
    const colMap = new Map<string, { key: string; label: string; type: string; target: string; targetDuplicate: boolean }>();
    for (const r of results) {
      for (const c of r.columns) {
        const prev = colMap.get(c.key);
        if (!prev) {
          colMap.set(c.key, { key: c.key, label: c.label, type: c.type, target: c.target ?? "", targetDuplicate: c.targetDuplicate ?? false });
        } else if (c.targetDuplicate) {
          prev.targetDuplicate = true;
        }
      }
    }
    const taggedRows: MergedRow[] = results.flatMap((r, ri) => {
      const name = r.sourceFile || `file-${ri + 1}`;
      return r.rows.map((row) => ({ ...row, _sourceFile: name }));
    });

    const headersByFile: Record<string, string[]> = {};
    for (const r of results) {
      headersByFile[r.sourceFile || ""] = r.headers;
    }

    setPreviewData({
      totalRows: taggedRows.length,
      warningsCount: results.reduce((s, r) => s + r.warningsCount, 0),
      columns: Array.from(colMap.values()),
      rows: taggedRows,
      headersByFile,
      filesIncluded: results.map((r) => r.sourceFile || ""),
      skippedFiles: skipped,
    });
    setSelectedIndices([]);
    setSelectToInput("");
    setSourceFilter("all");
    setProcessingDetails((prev) => [...prev, t("processingDone")]);
    await new Promise((r) => setTimeout(r, 300));
    setCurrentStep("review");
    setProcessing(false);
  };

  // ---- review helpers (global indices into previewData.rows) ----
  const visibleGlobalIndices = useMemo(() => {
    if (!previewData) return [];
    if (sourceFilter === "all") return previewData.rows.map((_, i) => i);
    return previewData.rows.map((r, i) => ({ r, i })).filter(({ r }) => r._sourceFile === sourceFilter).map(({ i }) => i);
  }, [previewData, sourceFilter]);

  const visibleRows = useMemo(() => {
    if (!previewData) return [];
    return visibleGlobalIndices.map((gi) => previewData.rows[gi]);
  }, [previewData, visibleGlobalIndices]);

  const visibleSelectedPositions = useMemo(() => {
    const pos: number[] = [];
    visibleGlobalIndices.forEach((gi, p) => {
      if (selectedSet.has(gi)) pos.push(p);
    });
    return pos;
  }, [visibleGlobalIndices, selectedSet]);

  const remainingRows = useMemo(() => {
    if (!previewData) return [];
    return previewData.rows.filter((_, i) => !selectedSet.has(i));
  }, [previewData, selectedSet]);

  const toggleSelect = (pos: number) => {
    const gi = visibleGlobalIndices[pos];
    if (gi == null) return;
    setSelectedIndices((prev) => (prev.includes(gi) ? prev.filter((i) => i !== gi) : [...prev, gi]));
  };

  const toggleSelectAll = () => {
    if (!previewData) return;
    const allVisibleSelected = visibleGlobalIndices.every((gi) => selectedSet.has(gi));
    if (allVisibleSelected) {
      setSelectedIndices((prev) => prev.filter((i) => !visibleGlobalIndices.includes(i)));
    } else {
      setSelectedIndices((prev) => Array.from(new Set([...prev, ...visibleGlobalIndices])));
    }
  };

  const selectTo = () => {
    if (!previewData) return;
    const num = parseInt(selectToInput, 10);
    if (isNaN(num) || num < 1) return;
    setSelectedIndices(visibleGlobalIndices.slice(0, Math.max(num, 0)));
  };

  const deleteSelected = () => {
    if (!previewData) return;
    const remaining = previewData.rows.filter((_, i) => !selectedSet.has(i));
    setPreviewData({ ...previewData, rows: remaining, totalRows: remaining.length });
    setSelectedIndices([]);
  };

  const handleConfirm = async () => {
    if (!previewData || remainingRows.length === 0) return;
    setConfirming(true);
    setError(null);

    // Group remaining rows back per source file, then save each file in small
    // chunks — no single Server Action call carries a giant nested array.
    const byFile = new Map<string, PreviewRow[]>();
    for (const row of remainingRows) {
      const list = byFile.get(row._sourceFile) || [];
      const { _sourceFile: _omit, ...rest } = row as MergedRow;
      void _omit;
      list.push(rest);
      byFile.set(row._sourceFile, list);
    }

    const succeeded: Array<{ fileName: string; rows: number }> = [];
    const failed: Array<{ fileName: string; reason: string }> = [];
    const chunkSize = UNCONFIRMED_UPLOAD_LIMITS.confirmChunkSize;

    for (const [fileName, rows] of byFile.entries()) {
      let uploadId: string | null = null;
      try {
        if (rows.length === 0) throw new Error("no-rows-to-confirm");
        const created = await createConfirmedUpload({
          fileName,
          totalRows: rows.length,
          fileId: selectedFileId,
        });
        uploadId = created.uploadId;

        for (let offset = 0; offset < rows.length; offset += chunkSize) {
          await appendConfirmedRecords({
            uploadId,
            rows: rows.slice(offset, offset + chunkSize),
            startRow: offset,
            fileId: selectedFileId,
          });
        }

        succeeded.push({ fileName, rows: rows.length });
      } catch (err: unknown) {
        if (uploadId) {
          try {
            await deleteConfirmedUpload(uploadId);
          } catch {
            // rollback best-effort; keep the original error
          }
        }
        failed.push({
          fileName,
          reason: err instanceof Error ? err.message : "confirm-failed",
        });
      }
    }

    setConfirming(false);
    setShowConfirm(false);

    if (succeeded.length === 0) {
      setError(failed[0]?.reason || "confirm-failed");
      return;
    }

    setConfirmSummary({ succeeded, failed });
    setCurrentStep("confirm");
  };

  const resetToUpload = () => {
    setPreviewData(null);
    setCurrentStep("upload");
    setFiles([]);
    setSelectedIndices([]);
    setSourceFilter("all");
    setError(null);
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
                {confirmSummary
                  ? t("multiUploadSuccess", {
                      files: confirmSummary.succeeded.length,
                      rows: confirmSummary.succeeded.reduce((s, f) => s + f.rows, 0),
                    })
                  : t("uploadSuccess")}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                {remainingRows.length} / {previewData.totalRows} {t("totalRecords")}
                {" — "}
                {t("mergedFrom", { count: previewData.filesIncluded.length })}
              </p>
            )}
          </div>
        </div>

        <AiProgressSteps currentStep={currentStep} />

        {previewData.skippedFiles.length > 0 && currentStep !== "confirm" && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span className="text-xs">
              {t("skippedFiles")}: {previewData.skippedFiles.join("، ")}
            </span>
          </div>
        )}

        {currentStep !== "confirm" && (
          <>
            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-base">{t("preview")}</CardTitle>
                  <div className="flex items-center gap-2">
                    <select
                      value={sourceFilter}
                      onChange={(e) => setSourceFilter(e.target.value)}
                      className="h-8 rounded-md border bg-background px-2 text-xs"
                    >
                      <option value="all">{t("allFiles")}</option>
                      {previewData.filesIncluded.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
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
                <DataPreviewTable
                  columns={previewData.columns}
                  rows={visibleRows}
                  locale="ar"
                  selectedIndices={visibleSelectedPositions}
                  onToggleSelect={toggleSelect}
                  showMapping
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
                      checked={visibleGlobalIndices.length > 0 && visibleGlobalIndices.every((gi) => selectedSet.has(gi))}
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
              <Button variant="outline" onClick={resetToUpload}>
                {t("backToUploads")}
              </Button>
              <Button onClick={() => setShowConfirm(true)} disabled={remainingRows.length === 0}>
                <CheckCircle2 className="h-4 w-4" />
                {t("confirmAdd")}
              </Button>
            </div>
          </>
        )}

        {currentStep === "confirm" && confirmSummary && (
          <Card>
            <CardContent className="space-y-2 pt-6">
              {confirmSummary.succeeded.map((f) => (
                <div key={f.fileName} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="font-medium">{f.fileName}</span>
                  <span className="text-muted-foreground">— {f.rows} {t("totalRecords")}</span>
                </div>
              ))}
              {confirmSummary.failed.map((f) => (
                <div key={f.fileName} className="flex items-center gap-2 text-sm text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  <span className="font-medium">{f.fileName}</span>
                  <span className="font-mono text-xs">{f.reason}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {currentStep === "confirm" && (
          <div className="flex justify-center">
            <Button onClick={() => router.push("/unconfirmed-data")}>
              <ArrowLeft className="h-4 w-4" />
              {t("backToUploads")}
            </Button>
          </div>
        )}

        <ConfirmDialog
          open={showConfirm}
          totalRows={remainingRows.length}
          totalColumns={previewData.columns.length}
          warningsCount={previewData.warningsCount}
          filesCount={previewData.filesIncluded.length}
          skippedFiles={previewData.skippedFiles}
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
          <p className="text-sm text-muted-foreground">{t("uploadExcelMulti")}</p>
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
          <CardTitle className="text-base">{t("uploadExcelMulti")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <MultiExcelUploader
            files={files}
            onAddFiles={handleAddFiles}
            onRemove={handleRemove}
            disabled={processing}
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
            <Button onClick={handleStartProcessing} disabled={files.length === 0 || processing}>
              {processing ? t("processing") : t("startProcessing")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <MultiFileErrorDialog
        open={errorDialog !== null}
        fileName={errorDialog?.fileName || ""}
        errorMessage={errorDialog?.errorMessage || ""}
        remainingCount={errorDialog?.remainingCount || 0}
        onContinueWithoutFile={(remember) => decisionRef.current?.("continue", remember)}
        onStop={() => decisionRef.current?.("stop", false)}
      />
    </div>
  );
}
