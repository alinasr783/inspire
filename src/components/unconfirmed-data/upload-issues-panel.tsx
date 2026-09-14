"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  AlertOctagon,
  AlertTriangle,
  Info,
  X,
  Copy,
  Check,
  Trash2,
  ChevronDown,
  FileWarning,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export type IssueStage = "upload" | "processing" | "confirm";
export type IssueSeverity = "error" | "warning" | "info";

export interface UploadIssue {
  id: string;
  stage: IssueStage;
  severity: IssueSeverity;
  code: string;
  fileName?: string;
  fileIndex?: number;
  /** عنوان قصير */
  title: string;
  /** السبب بالتفصيل */
  reason: string;
  /** اقتراح الحل */
  suggestion?: string;
  /** تفاصيل إضافية (أسماء أعمدة مثلاً) */
  details?: string[];
}

interface Props {
  issues: UploadIssue[];
  onDismiss: (id: string) => void;
  onClearAll: () => void;
}

const severityStyle: Record<IssueSeverity, string> = {
  error:
    "border-red-300 bg-red-50 dark:border-red-900/60 dark:bg-red-950/30",
  warning:
    "border-amber-300 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/30",
  info: "border-sky-300 bg-sky-50 dark:border-sky-900/60 dark:bg-sky-950/30",
};

const severityIcon: Record<IssueSeverity, typeof AlertOctagon> = {
  error: AlertOctagon,
  warning: AlertTriangle,
  info: Info,
};

export function UploadIssuesPanel({ issues, onDismiss, onClearAll }: Props) {
  const t = useTranslations("UnconfirmedData");
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  if (issues.length === 0) return null;

  const errors = issues.filter((i) => i.severity === "error").length;
  const warnings = issues.filter((i) => i.severity === "warning").length;
  const infos = issues.filter((i) => i.severity === "info").length;

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const copyAll = async () => {
    const text = issues
      .map((i) => {
        const parts = [
          `[${i.severity.toUpperCase()}/${i.stage}]`,
          i.fileName ? `${i.fileName}` : null,
          `${i.title}: ${i.reason}`,
          i.suggestion ? `Suggestion: ${i.suggestion}` : null,
          i.details?.length ? `Details: ${i.details.join(" | ")}` : null,
        ].filter(Boolean);
        return parts.join(" ");
      })
      .join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard غير متاح */
    }
  };

  const stageLabel = (stage: IssueStage) => {
    if (stage === "upload") return t("issueStageUpload");
    if (stage === "processing") return t("issueStageProcessing");
    return t("issueStageConfirm");
  };

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="overflow-hidden rounded-xl border-2 border-red-200 dark:border-red-900/60"
    >
      {/* شريط الملخص */}
      <div className="flex flex-wrap items-center gap-2 bg-red-600 px-4 py-2.5 text-white dark:bg-red-900">
        <AlertOctagon className="h-5 w-5 shrink-0" />
        <p className="text-sm font-bold">
          {t("issuesTitle", { count: issues.length })}
        </p>
        <div className="flex items-center gap-1.5 text-xs">
          {errors > 0 && (
            <span className="rounded-full bg-white/20 px-2 py-0.5 font-medium">
              {t("issuesErrors", { count: errors })}
            </span>
          )}
          {warnings > 0 && (
            <span className="rounded-full bg-white/20 px-2 py-0.5 font-medium">
              {t("issuesWarnings", { count: warnings })}
            </span>
          )}
          {infos > 0 && (
            <span className="rounded-full bg-white/20 px-2 py-0.5 font-medium">
              {t("issuesInfos", { count: infos })}
            </span>
          )}
        </div>
        <div className="ms-auto flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={copyAll}
            className="h-7 gap-1 text-xs text-white hover:bg-white/20 hover:text-white"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? t("copied") : t("copyErrors")}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearAll}
            className="h-7 gap-1 text-xs text-white hover:bg-white/20 hover:text-white"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {t("clearErrors")}
          </Button>
        </div>
      </div>

      {/* قائمة الأخطاء */}
      <div className="max-h-80 space-y-2 overflow-y-auto bg-background p-3">
        {issues.map((issue) => {
          const Icon = severityIcon[issue.severity];
          const isOpen = expanded.has(issue.id);
          const color =
            issue.severity === "error"
              ? "text-red-600 dark:text-red-400"
              : issue.severity === "warning"
                ? "text-amber-600 dark:text-amber-400"
                : "text-sky-600 dark:text-sky-400";
          return (
            <div
              key={issue.id}
              className={`rounded-lg border p-3 ${severityStyle[issue.severity]}`}
            >
              <div className="flex items-start gap-2.5">
                <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${color}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-sm font-bold text-foreground">
                      {issue.title}
                    </span>
                    <span className="rounded-full bg-foreground/10 px-2 py-0.5 text-[11px] font-medium text-foreground">
                      {stageLabel(issue.stage)}
                    </span>
                    <span className="rounded bg-foreground/10 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                      {issue.code}
                    </span>
                  </div>

                  {issue.fileName && (
                    <div className="mt-1 flex items-center gap-1 text-xs font-medium text-foreground/80">
                      <FileWarning className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate" title={issue.fileName}>
                        {typeof issue.fileIndex === "number"
                          ? `#${issue.fileIndex + 1} — ${issue.fileName}`
                          : issue.fileName}
                      </span>
                    </div>
                  )}

                  <p className="mt-1 text-xs leading-relaxed text-foreground/90">
                    <span className="font-semibold">{t("issueReason")}: </span>
                    {issue.reason}
                  </p>

                  {issue.suggestion && (
                    <p className="mt-1 text-xs leading-relaxed text-foreground/80">
                      <span className="font-semibold">💡 {t("issueFix")}: </span>
                      {issue.suggestion}
                    </p>
                  )}

                  {issue.details && issue.details.length > 0 && (
                    <div className="mt-1.5">
                      <button
                        type="button"
                        onClick={() => toggleExpand(issue.id)}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                      >
                        <ChevronDown
                          className={`h-3 w-3 transition-transform ${isOpen ? "rotate-180" : ""}`}
                        />
                        {t("issueDetails", { count: issue.details.length })}
                      </button>
                      {isOpen && (
                        <ul className="mt-1.5 max-h-32 space-y-1 overflow-y-auto rounded-md bg-background/70 p-2">
                          {issue.details.map((d, i) => (
                            <li
                              key={i}
                              className="truncate font-mono text-[11px] text-foreground/80"
                              title={d}
                              dir="auto"
                            >
                              • {d}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDismiss(issue.id)}
                  className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                  aria-label={t("dismissError")}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
