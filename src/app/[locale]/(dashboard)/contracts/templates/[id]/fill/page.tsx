"use client";

import { useCallback } from "react";
import { useParams } from "next/navigation";
import { ContractFillForm } from "@/components/contracts/contract-fill-form";
import { useContractTemplate, useCreateInstanceMutation } from "@/hooks/queries/use-contracts-query";
import { toast } from "sonner";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export default function FillTemplatePage() {
  const params = useParams();
  const templateId = params.id as string;
  const { data: template, isLoading: templateLoading } = useContractTemplate(templateId);
  const createInstanceMutation = useCreateInstanceMutation();

  const handleSave = useCallback(
    async (filledData: Record<string, string>) => {
      const result = await createInstanceMutation.mutateAsync({
        template_id: templateId,
        filled_data: filledData,
      });
      if (result.success) {
        toast.success("تم حفظ العقد بنجاح");
      } else {
        toast.error("فشل حفظ العقد");
      }
    },
    [templateId, createInstanceMutation]
  );

  if (templateLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!template) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-lg text-muted-foreground">القالب غير موجود</p>
        <Link href="/contracts" className="mt-4">
          <Button variant="outline">العودة للقوالب</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4" dir="rtl">
      <ContractFillForm
        templateContent={template.content}
        templateName={template.name}
        onSave={handleSave}
        saving={createInstanceMutation.isPending}
      />
    </div>
  );
}
