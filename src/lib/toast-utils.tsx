"use client";

import { toast } from "sonner";
import { CheckCircle2, XCircle, AlertTriangle, Info } from "lucide-react";

function getDirection(): "rtl" | "ltr" {
  if (typeof document === "undefined") return "ltr";
  return document.documentElement.dir === "rtl" ? "rtl" : "ltr";
}

export function showSuccess(message: string) {
  toast(message, {
    icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
    duration: 3000,
    style: {
      border: "1px solid rgba(16, 185, 129, 0.3)",
      background: "rgba(16, 185, 129, 0.06)",
    },
  });
}

export function showError(message: string) {
  toast(message, {
    icon: <XCircle className="h-4 w-4 text-red-500" />,
    duration: 5000,
    style: {
      border: "1px solid rgba(239, 68, 68, 0.3)",
      background: "rgba(239, 68, 68, 0.06)",
    },
  });
}

export function showWarning(message: string) {
  toast(message, {
    icon: <AlertTriangle className="h-4 w-4 text-amber-500" />,
    duration: 4000,
    style: {
      border: "1px solid rgba(245, 158, 11, 0.3)",
      background: "rgba(245, 158, 11, 0.06)",
    },
  });
}

export function showInfo(message: string) {
  toast(message, {
    icon: <Info className="h-4 w-4 text-blue-500" />,
    duration: 3000,
    style: {
      border: "1px solid rgba(59, 130, 246, 0.3)",
      background: "rgba(59, 130, 246, 0.06)",
    },
  });
}
