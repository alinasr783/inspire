"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Upload, FileSpreadsheet, X, Trash2 } from "lucide-react";

interface ExcelUploaderProps {
  // وضع ملف واحد (للتوافق مع الصفحات القديمة)
  onFileSelect?: (file: File) => void;
  selectedFile?: File | null;
  // وضع ملفات متعددة
  onFilesSelect?: (files: File[]) => void;
  selectedFiles?: File[];
  onRemoveFile?: (index: number) => void;
  onClear?: () => void;
  multiple?: boolean;
  /** ملفات مرفوضة بسبب الامتداد — لعرضها كأخطاء واضحة */
  onRejectedFiles?: (files: File[]) => void;
  /** مؤشرات الملفات التي فشلت معالجتها — تُميز بالأحمر */
  errorIndices?: Set<number> | number[];
}

const isExcelFile = (file: File) =>
  file.name.toLowerCase().endsWith(".xlsx") ||
  file.name.toLowerCase().endsWith(".xls");

export function ExcelUploader({
  onFileSelect,
  selectedFile,
  onFilesSelect,
  selectedFiles,
  onRemoveFile,
  onClear,
  multiple,
  onRejectedFiles,
  errorIndices,
}: ExcelUploaderProps) {
  const t = useTranslations("UnconfirmedData");
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isMulti = multiple || !!onFilesSelect || Array.isArray(selectedFiles);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = Array.from(e.dataTransfer.files);
    const rejected = dropped.filter((f) => !isExcelFile(f));
    if (rejected.length > 0) onRejectedFiles?.(rejected);
    const files = dropped.filter(isExcelFile);
    if (files.length === 0) return;
    if (isMulti) {
      if (onFilesSelect) onFilesSelect(files);
      else if (onFileSelect) files.forEach((f) => onFileSelect(f));
    } else {
      onFileSelect?.(files[0]);
    }
    // السماح بإعادة اختيار نفس الملفات مرة أخرى
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    const rejected = picked.filter((f) => !isExcelFile(f));
    if (rejected.length > 0) onRejectedFiles?.(rejected);
    const files = picked.filter(isExcelFile);
    if (files.length === 0) return;
    if (isMulti) {
      if (onFilesSelect) onFilesSelect(files);
      else if (onFileSelect) files.forEach((f) => onFileSelect(f));
    } else {
      onFileSelect?.(files[0]);
    }
    // السماح بإعادة اختيار نفس الملف مرة أخرى
    e.target.value = "";
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // ---------- وضع الملفات المتعددة ----------
  if (isMulti) {
    const files = selectedFiles ?? [];
    return (
      <div className="space-y-3">
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`relative cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
            dragOver
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-muted/30"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls"
            multiple
            onChange={handleFileChange}
            className="hidden"
          />
          <Upload className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">
            {t("uploadExcelMultiple")}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            .xlsx .xls — {t("dragDropMultiple")}
          </p>
        </div>

        {files.length > 0 && (
          <div className="space-y-2 rounded-xl border bg-muted/20 p-3">
            <div className="flex items-center justify-between px-1">
              <p className="text-xs font-medium text-muted-foreground">
                {t("filesSelected", { count: files.length })}
              </p>
              {onClear && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClear}
                  className="h-7 gap-1 text-xs text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                  {t("clearAll")}
                </Button>
              )}
            </div>
            {files.map((file, i) => {
              const hasError = errorIndices
                ? Array.isArray(errorIndices)
                  ? errorIndices.includes(i)
                  : errorIndices.has(i)
                : false;
              return (
              <div
                key={`${file.name}-${file.size}-${i}`}
                className={`flex items-center gap-3 rounded-lg border-2 px-3 py-2 ${
                  hasError
                    ? "border-red-400 bg-red-50 dark:bg-red-950/30"
                    : "border-primary/20 bg-primary/5"
                }`}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <FileSpreadsheet className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate" title={file.name}>
                    <span className="me-1 inline-flex h-5 min-w-5 items-center justify-center rounded bg-primary/10 px-1 text-[10px] font-bold text-primary">
                      {i + 1}
                    </span>
                    {file.name}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {formatSize(file.size)}
                  </p>
                </div>
                {onRemoveFile && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onRemoveFile(i)}
                    className="h-7 w-7 shrink-0"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
                {hasError && (
                  <span className="shrink-0 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white">
                    {t("fileFailed")}
                  </span>
                )}
              </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ---------- وضع ملف واحد (قديم) ----------
  if (selectedFile) {
    return (
      <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
            <FileSpreadsheet className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{selectedFile.name}</p>
            <p className="text-xs text-muted-foreground">{formatSize(selectedFile.size)}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClear} className="h-8 w-8 shrink-0">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`relative cursor-pointer rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
        dragOver
          ? "border-primary bg-primary/5"
          : "border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-muted/30"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={handleFileChange}
        className="hidden"
      />
      <Upload className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
      <p className="text-sm font-medium text-foreground">
        {t("uploadExcel")}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        .xlsx .xls
      </p>
    </div>
  );
}
