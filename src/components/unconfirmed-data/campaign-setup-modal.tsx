"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, MessageSquare } from "lucide-react";

interface CampaignSetupModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { count: number; delayMinSec: number; delayMaxSec: number; message: string }) => void;
  loading?: boolean;
}

export function CampaignSetupModal({ open, onClose, onSubmit, loading }: CampaignSetupModalProps) {
  const t = useTranslations("UnconfirmedData");
  const [count, setCount] = useState(10);
  const [delayMinSec, setDelayMinSec] = useState(10);
  const [delayMaxSec, setDelayMaxSec] = useState(20);
  const [message, setMessage] = useState("");

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="w-full max-w-lg rounded-xl border bg-background p-6 shadow-lg">
        <div className="flex items-center gap-3 mb-6">
          <MessageSquare className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">{t("confirmData")}</h2>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">{t("recordsCount")}</Label>
            <Input
              type="number"
              min={1}
              max={1000}
              value={count}
              onChange={(e) => setCount(parseInt(e.target.value) || 1)}
            />
            <p className="text-xs text-muted-foreground">{t("recordsCountHint")}</p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium">{t("delayBetweenSends")}</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                max={300}
                step={1}
                value={delayMinSec}
                onChange={(e) => setDelayMinSec(parseInt(e.target.value) || 1)}
                className="w-20"
              />
              <span className="text-xs text-muted-foreground">—</span>
              <Input
                type="number"
                min={1}
                max={300}
                step={1}
                value={delayMaxSec}
                onChange={(e) => setDelayMaxSec(Math.max(parseInt(e.target.value) || 1, delayMinSec))}
                className="w-20"
              />
              <span className="text-sm text-muted-foreground">{t("seconds")}</span>
            </div>
            <p className="text-xs text-muted-foreground">{t("delayRangeHint")}</p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium">{t("messageTemplate")}</Label>
            <Textarea
              rows={5}
              dir="rtl"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t("messagePlaceholder")}
            />
            <p className="text-xs text-muted-foreground">{t("messageHint")}</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 mt-6">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            {t("cancel")}
          </Button>
          <Button onClick={() => onSubmit({ count, delayMinSec, delayMaxSec, message })} disabled={loading || !count || !message.trim()}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("startSending")}
          </Button>
        </div>
      </div>
    </div>
  );
}
