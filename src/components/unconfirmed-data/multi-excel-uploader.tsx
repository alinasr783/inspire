"use client";

import { useState, useRef } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Upload, FileSpreadsheet, X, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { UNCONFIRMED_UPLOAD_LIMITS } from "@/lib/unconfirmed-upload-limits";

export type MultiFileStatus = "pending" | "processing" | "success" | "error";

export interface MultiFileItem {
  id: string;
  file: File;
  status: MultiFileStatus;
  error?: string;
  rowsCount?: number;
}

interface MultiExcelUploaderProps {
  files: MultiFileItem[];
  onAddFiles: (files: File[]) => void;
  onRemove: (id: string) => void;
  disabled?: boolean;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const isExcelFile = (f: File) =>
  f.name.toLowerCase().endsWith(".xlsx") || f.name.toLowerCase().endsWith(".xls");

export function MultiExcelUploader({ files, onAddFiles, onRemove, disabled }: MultiExcelUploaderProps) {
  const t = useTranslations("UnconfirmedData");
  const [dragOver, setDragOver] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const totalBytes = files.reduce((s, f) => s + f.file.size, 0);

  const acceptFiles = (list: FileList | File[]) => {
    const arr = Array.from(list).filter(isExcelFile);
    if (arr.length === 0) {
      setLocalError(t("invalidFileType"));
      return;
    }
    const incomingBytes = arr.reduce((s, f) => s + f.size, 0);
    if (totalBytes + incomingBytes > UNCONFIRMED_UPLOAD_LIMITS.maxTotalBytes) {
      setLocalError(
        t("totalTooLarge", {
          size: formatSize(totalBytes + incomingBytes),
          max: UNCONFIRMED_UPLOAD_LIMITS.maxTotalBytes / (1024 * 1024),
        })
      );
      return;
    }
    setLocalError(null);
    onAddFiles(arr);
  };

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (!disabled) acceptFiles(e.dataTransfer.files);
        }}
        onClick={() => { if (!disabled) inputRef.current?.click(); }}
        className={`relative cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
          dragOver
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-muted/30"
        } ${disabled ? "pointer-events-none opacity-50" : ""}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls"
          multiple
          onChange={(e) => {
            if (e.target.files) acceptFiles(e.target.files);
            e.target.value = "";
          }}
          className="hidden"
        />
        <Upload className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
        <p className="text-sm font-medium text-foreground">{t("uploadExcelMulti")}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          .xlsx .xls — {t("totalSize", { size: formatSize(totalBytes), max: UNCONFIRMED_UPLOAD_LIMITS.maxTotalBytes / (1024 * 1024) })}
          {files.length > 0 && ` (${files.length} ${t("filesCountShort")})`}
        </p>
      </div>

      {localError && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="text-xs">{localError}</span>
        </div>
      )}

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((item) => (
            <div
              key={item.id}
              className={`flex items-center gap-3 rounded-xl border-2 p-3 ${
                item.status === "error"
                  ? "border-red-200 bg-red-50/50 dark:border-red-900/50 dark:bg-red-950/20"
                  : item.status === "success"
                  ? "border-green-200 bg-green-50/50 dark:border-green-900/50 dark:bg-green-950/20"
                  : "border-primary/30 bg-primary/5"
              }`}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium">{item.file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatSize(item.file.size)}
                  {item.status === "success" && item.rowsCount != null && (
                    <span className="ms-1 text-green-600 dark:text-green-400">
                      ✓ {item.rowsCount}
                    </span>
                  )}
                  {item.status === "processing" && (
                    <span className="ms-1 inline-flex items-center gap-1 text-primary">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      {t("processing")}
                    </span>
                  )}
                </p>
                {item.status === "error" && item.error && (
                  <p className="mt-0.5 truncate text-xs text-red-600 dark:text-red-400">{item.error}</p>
                )}
              </div>
              {item.status === "success" ? (
                <CheckCircle2 className="h-5 w-5 shrink-0 text-green-500" />
              ) : item.status === "error" ? (
                <AlertCircle className="h-5 w-5 shrink-0 text-red-500" />
              ) : null}
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => { e.stopPropagation(); onRemove(item.id); }}
                disabled={disabled}
                className="h-8 w-8 shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
