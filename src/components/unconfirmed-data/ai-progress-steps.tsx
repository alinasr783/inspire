"use client";

import { useTranslations } from "next-intl";
import { Check, Loader2, Upload, Brain, Eye, ShieldCheck } from "lucide-react";

export type Step = "upload" | "ai" | "review" | "confirm";

interface AiProgressStepsProps {
  currentStep: Step;
  statusMessage?: string;
}

const stepConfig: Record<Step, { icon: typeof Upload; key: string }> = {
  upload: { icon: Upload, key: "stepUpload" },
  ai: { icon: Brain, key: "stepAI" },
  review: { icon: Eye, key: "stepReview" },
  confirm: { icon: ShieldCheck, key: "stepConfirm" },
};

const stepOrder: Step[] = ["upload", "ai", "review", "confirm"];

export function AiProgressSteps({ currentStep, statusMessage }: AiProgressStepsProps) {
  const t = useTranslations("UnconfirmedData");
  const currentIdx = stepOrder.indexOf(currentStep);

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-4">
        <div className="flex flex-col items-center gap-1">
          {stepOrder.map((step, idx) => {
            const config = stepConfig[step];
            const Icon = config.icon;
            const isCompleted = idx < currentIdx;
            const isCurrent = idx === currentIdx;
            const isPending = idx > currentIdx;

            return (
              <div key={step} className="flex flex-col items-center">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all ${
                    isCompleted
                      ? "border-green-500 bg-green-500 text-white"
                      : isCurrent
                      ? "border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                      : "border-muted-foreground/30 bg-muted text-muted-foreground"
                  }`}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </div>
                {idx < stepOrder.length - 1 && (
                  <div
                    className={`my-1 h-8 w-0.5 rounded-full ${
                      idx < currentIdx
                        ? "bg-green-400"
                        : "bg-muted-foreground/20"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        <div className="flex-1 space-y-6 pt-0.5">
          {stepOrder.map((step, idx) => {
            const config = stepConfig[step];
            const Icon = config.icon;
            const isCompleted = idx < currentIdx;
            const isCurrent = idx === currentIdx;
            const isPending = idx > currentIdx;

            return (
              <div key={step} className={`flex items-center gap-3 ${isPending ? "opacity-40" : ""}`}>
                <div>
                  <p
                    className={`text-sm font-medium ${
                      isCurrent
                        ? "text-primary"
                        : isCompleted
                        ? "text-green-600 dark:text-green-400"
                        : "text-muted-foreground"
                    }`}
                  >
                    {t(config.key)}
                  </p>
                  {isCurrent && statusMessage && (
                    <p className="mt-0.5 text-xs text-muted-foreground">{statusMessage}</p>
                  )}
                </div>
                {isCurrent && (
                  <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
                )}
                {isCompleted && (
                  <Check className="h-4 w-4 text-green-500 shrink-0" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
