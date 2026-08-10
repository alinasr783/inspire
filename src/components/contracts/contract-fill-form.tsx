"use client";

import { useState, useMemo, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { extractInputFieldNames, renderTiptapHtml } from "@/lib/generate-docx";
import { generateDocx } from "@/lib/generate-docx";
import { generatePdf } from "@/lib/generate-pdf";
import { Loader2, Printer, FileText, FileImage, Download, Eye, EyeOff, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface ContractFillFormProps {
  templateContent: Record<string, unknown>;
  templateName: string;
  onSave?: (filledData: Record<string, string>) => Promise<void>;
  saving?: boolean;
}

export function ContractFillForm({
  templateContent,
  templateName,
  onSave,
  saving = false,
}: ContractFillFormProps) {
  const inputNames = useMemo(() => {
    console.log("[FillForm] templateContent:", templateContent);
    const names = extractInputFieldNames(templateContent);
    console.log("[FillForm] extracted names:", names);
    return names;
  }, [templateContent]);
  const [filledData, setFilledData] = useState<Record<string, string>>({});
  const [showPreview, setShowPreview] = useState(false);
  const [generating, setGenerating] = useState(false);

  const handleInputChange = useCallback((name: string, value: string) => {
    setFilledData((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleFillDummy = useCallback(() => {
    const dummyNames = [
      "محمد أحمد محمود",
      "عمر خالد العمري",
      "فاطمة حسن السيد",
      "سارة إبراهيم نور",
      "علي عبد الرحمن",
      "يوسف مصطفى كمال",
    ];
    const dummyPhones = [
      "01001234567",
      "01119876543",
      "01225551234",
      "01550001122",
    ];
    const dummyIds = [
      "29501011234567",
      "29005151234567",
      "28510251234567",
    ];
    const dummyAddresses = [
      "القاهرة - مدينة نصر - شارع عباس العقاد",
      "الجيزة - المهندسين - شارع جامعة الدول العربية",
      "الإسكندرية - سموحة - شارع 14 مايو",
    ];
    const dummyDates = [
      "10/8/2026",
      "15/9/2026",
      "1/1/2027",
    ];
    const dummyNumbers = [
      "500,000",
      "1,250,000",
      "750,000",
      "2,000,000",
    ];
    const dummyDays = [
      "الأحد",
      "الاثنين",
      "الثلاثاء",
      "الأربعاء",
      "الخميس",
    ];

    const getDummy = (name: string): string => {
      const n = name.toLowerCase();
      if (n.includes("اسم") || n.includes("طرف") || n.includes("سيد") || n.includes("السيد") || n.includes("البائع") || n.includes("المشتري") || n.includes("العميل") || n.includes("المالك")) {
        return dummyNames[inputNames.length % dummyNames.length];
      }
      if (n.includes("تليفون") || n.includes("هاتف") || n.includes("جوال") || n.includes("رقم الهاتف") || n.includes("موبايل")) {
        return dummyPhones[inputNames.length % dummyPhones.length];
      }
      if (n.includes("رقم") && (n.includes("قومي") || n.includes("بطاقة") || n.includes("هوية"))) {
        return dummyIds[inputNames.length % dummyIds.length];
      }
      if (n.includes("عنوان") || n.includes("مقيم") || n.includes("سكن") || n.includes("محافظة")) {
        return dummyAddresses[inputNames.length % dummyAddresses.length];
      }
      if (n.includes("تاريخ") || n.includes("موافق") || n.includes("يوم")) {
        return dummyDates[inputNames.length % dummyDates.length];
      }
      if (n.includes("اليوم") && (n.includes("اسبوع") || n.includes("أسبوع"))) {
        return dummyDays[inputNames.length % dummyDays.length];
      }
      if (n.includes("سعر") || n.includes("مبلغ") || n.includes("قيمة") || n.includes("مقدم") || n.includes("عربون")) {
        return dummyNumbers[inputNames.length % dummyNumbers.length] + " جنيه";
      }
      if (n.includes("جنية") || n.includes("جنيه")) {
        return dummyNumbers[inputNames.length % dummyNumbers.length] + " جنيه";
      }
      if (n.includes("جنسية") || n.includes("دولة")) {
        return "مصر";
      }
      if (n.includes("مهنة") || n.includes("وظيفة")) {
        return "مهندس";
      }
      return `[بيانات ${name}]`;
    };

    const dummy: Record<string, string> = {};
    inputNames.forEach((name) => {
      dummy[name] = getDummy(name);
    });
    setFilledData(dummy);
    toast.success("تم ملء البيانات التجريبية بنجاح");
  }, [inputNames]);

  const previewHtml = useMemo(() => {
    if (!templateContent) return "";
    return renderTiptapHtml(templateContent, filledData);
  }, [templateContent, filledData]);

  const handleDownloadDocx = useCallback(async () => {
    if (generating) return;
    setGenerating(true);
    try {
      const blob = await generateDocx(templateContent, filledData);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${templateName || "عقد"}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setGenerating(false);
    }
  }, [generating, templateContent, filledData, templateName]);

  const openContractWindow = useCallback(() => {
    const win = window.open("", "_blank");
    if (!win) return;
    const fontLink = "https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700;900&family=Amiri:ital,wght@0,400;0,700;1,400;1,700&family=Reem+Kufi:wght@400;500;600;700&family=Aref+Ruqaa:wght@400;700&display=swap";
    win.document.write(`<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="utf-8"><title>${templateName}</title>
<link href="${fontLink}" rel="stylesheet">
<style>
  @page { margin: 15mm; size: A4; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  body { font-family: 'Cairo', sans-serif; direction: rtl; line-height: 2; color: #000; font-size: 14px; padding: 20px; }
</style></head>
<body>${previewHtml}</body>
</html>`);
    win.document.close();
    return win;
  }, [previewHtml, templateName]);

  const handleDownloadPdf = useCallback(async () => {
    if (generating) return;
    setGenerating(true);
    try {
      const blob = await generatePdf(previewHtml);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${templateName || "عقد"}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("فشل توليد PDF");
    } finally {
      setGenerating(false);
    }
  }, [generating, previewHtml, templateName]);

  const handlePrint = useCallback(() => {
    const win = openContractWindow();
    if (win) {
      win.focus();
      win.print();
    }
  }, [openContractWindow]);

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">ملء العقد: {templateName}</h2>
        <Button
          variant={showPreview ? "default" : "outline"}
          size="sm"
          onClick={() => setShowPreview(!showPreview)}
        >
          {showPreview ? (
            <>
              <EyeOff className="h-4 w-4 ml-1" />
              إخفاء المعاينة
            </>
          ) : (
            <>
              <Eye className="h-4 w-4 ml-1" />
              معاينة العقد
            </>
          )}
        </Button>
      </div>

      {!showPreview ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">البيانات المطلوبة</CardTitle>
            {inputNames.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleFillDummy}
                className="gap-2"
              >
                <Sparkles className="h-3.5 w-3.5" />
                بيانات تجريبية
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {inputNames.length === 0 ? (
              <div className="space-y-4">
                <p className="text-center text-sm text-muted-foreground py-4">
                  لا توجد حقول إدخال في هذا القالب
                </p>
                <details className="rounded-lg border bg-muted/30 p-3">
                  <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
                    عرض محتوى القالب الخام (للتشخيص)
                  </summary>
                  <pre className="mt-2 max-h-80 overflow-auto rounded bg-background p-3 text-left text-[11px] leading-relaxed whitespace-pre-wrap break-all" dir="ltr">
                    {JSON.stringify(templateContent, null, 2)}
                  </pre>
                </details>
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2">
                {inputNames.map((name) => (
                  <div key={name} className="space-y-2">
                    <Label htmlFor={`input-${name}`} className="text-sm font-semibold">
                      {name}
                    </Label>
                    <Input
                      id={`input-${name}`}
                      value={filledData[name] || ""}
                      onChange={(e) => handleInputChange(name, e.target.value)}
                      placeholder={`ادخل ${name}`}
                      className="text-right"
                      dir="rtl"
                    />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-xl border bg-white p-8 shadow-inner min-h-[500px]">
          <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center gap-3 border-t pt-4">
        <Button onClick={handleDownloadDocx} disabled={generating} className="gap-2">
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
          تحميل Word
        </Button>
        <Button onClick={handleDownloadPdf} disabled={generating} variant="secondary" className="gap-2">
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileImage className="h-4 w-4" />}
          تحميل PDF
        </Button>
        <Button onClick={handlePrint} variant="outline" className="gap-2">
          <Printer className="h-4 w-4" />
          طباعة
        </Button>
        {onSave && (
          <Button
            onClick={() => onSave(filledData)}
            disabled={saving}
            variant="ghost"
            className="gap-2 mr-auto"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            حفظ في النظام
          </Button>
        )}
      </div>
    </div>
  );
}
