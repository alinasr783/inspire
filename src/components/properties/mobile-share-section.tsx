"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { updateShareText } from "@/lib/unit-actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { WhatsAppIcon } from "@/components/ui/brand-icons";
import { Copy, Check, Pencil, X, ChevronDown, ChevronUp } from "lucide-react";

interface MobileShareSectionProps {
  unitId: string;
  shareText: string;
  canEdit: boolean;
}

export function MobileShareSection({ unitId, shareText, canEdit }: MobileShareSectionProps) {
  const t = useTranslations("Properties");
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(shareText);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!editing) {
      setText(shareText);
    }
  }, [shareText, editing]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateShareText(unitId, text);
      toast.success(t("saved") ?? "Saved");
      setEditing(false);
    } catch {
      toast.error(t("errors.updateFailed") ?? "Update failed");
    }
    setSaving(false);
  };

  const handleCancel = () => {
    setText(shareText);
    setEditing(false);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;

  return (
    <div className="px-6 pb-6 md:hidden">
      <Button
        variant="outline"
        size="sm"
        className="w-full justify-center gap-1.5"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? (
          <ChevronUp className="size-3.5" />
        ) : (
          <ChevronDown className="size-3.5" />
        )}
        {t("seeMore") ?? "See More"}
      </Button>

      {expanded && (
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t("shareText") ?? "Share Text"}
            </span>
            {canEdit && !editing && (
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground hover:text-foreground"
                onClick={() => setEditing(true)}
              >
                <Pencil className="size-3.5" />
              </Button>
            )}
          </div>

          {editing ? (
            <div className="space-y-2">
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="min-h-[160px] resize-y text-sm"
                placeholder={t("shareTextPlaceholder") ?? "Property details..."}
                disabled={saving}
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={handleCancel} disabled={saving}>
                  <X className="size-3.5 me-1" />
                  {t("cancel")}
                </Button>
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  <Check className="size-3.5 me-1" />
                  {t("save")}
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <p className="whitespace-pre-wrap rounded-lg border bg-muted/40 p-3 text-sm leading-relaxed">
                {text}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="justify-center gap-1.5"
                  onClick={handleCopy}
                >
                  {copied ? (
                    <Check className="size-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="size-3.5" />
                  )}
                  {copied ? (t("copied") ?? "Copied") : t("copy")}
                </Button>
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 rounded-md bg-[#25D366] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#1fad54] transition-colors"
                >
                  <WhatsAppIcon className="size-3.5" />
                  {t("whatsapp")}
                </a>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
