"use client";

import { useState, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import { useContractInstance } from "@/hooks/queries/use-contracts-query";
import { renderTiptapHtml } from "@/lib/generate-docx";
import { generateDocx } from "@/lib/generate-docx";
import { generatePdf } from "@/lib/generate-pdf";
import { Button } from "@/components/ui/button";
import { ArrowRight, Download, Printer, FileText, FileImage, Loader2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

export default function ViewInstancePage() {
  const params = useParams();
  const instanceId = params.id as string;
  const { data: instance, isLoading } = useContractInstance(instanceId);
  const [generating, setGenerating] = useState(false);

  const previewHtml = useMemo(() => {
    if (!instance?.template?.content) return "";
    return renderTiptapHtml(
      instance.template.content,
      instance.filled_data as Record<string, string>
    );
  }, [instance]);

  const handleDownloadDocx = useCallback(async () => {
    if (generating || !instance?.template?.content) return;
    setGenerating(true);
    try {
      const blob = await generateDocx(
        instance.template.content,
        instance.filled_data as Record<string, string>
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${instance.template.name || "عقد"}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setGenerating(false);
    }
  }, [generating, instance]);

  const handleDownloadPdf = useCallback(async () => {
    if (generating) return;
    setGenerating(true);
    try {
      const blob = await generatePdf(previewHtml);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${instance?.template?.name || "عقد"}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setGenerating(false);
    }
  }, [generating, previewHtml, instance]);

  const handlePrint = useCallback(() => {
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head><meta charset="utf-8"><title>${instance?.template?.name || "عقد"}</title>
      <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700;900&family=Amiri:ital,wght@0,400;0,700;1,400;1,700&family=Reem+Kufi:wght@400;500;600;700&family=Aref+Ruqaa:wght@400;700&display=swap" rel="stylesheet">
      <style>
        @page { margin: 15mm; size: A4; }
        body { font-family: 'Cairo', sans-serif; direction: rtl; line-height: 2; color: #000; font-size: 14px; }
        @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
      </style>
      </head>
      <body>${previewHtml}</body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 500);
  }, [previewHtml, instance]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!instance) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-lg text-muted-foreground">العقد غير موجود</p>
        <Link href="/contracts/instances" className="mt-4">
          <Button variant="outline">العودة</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-row flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/contracts/instances">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowRight className="h-4 w-4" />
              العودة
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold">{instance.template?.name || "عقد"}</h1>
            <p className="text-sm text-muted-foreground">
              {instance.created_at
                ? format(new Date(instance.created_at), "dd MMMM yyyy - HH:mm", { locale: ar })
                : ""}
              {instance.client?.customer_name ? ` · ${instance.client.customer_name}` : ""}
              {instance.unit?.customer_name ? ` · ${instance.unit.customer_name}` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleDownloadDocx} disabled={generating} size="sm" className="gap-2">
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
            Word
          </Button>
          <Button onClick={handleDownloadPdf} disabled={generating} size="sm" variant="secondary" className="gap-2">
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileImage className="h-4 w-4" />}
            PDF
          </Button>
          <Button onClick={handlePrint} size="sm" variant="outline" className="gap-2">
            <Printer className="h-4 w-4" />
            طباعة
          </Button>
        </div>
      </div>

      <div className="rounded-xl border bg-white p-8 shadow-inner min-h-[500px]">
        <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
      </div>
    </div>
  );
}
