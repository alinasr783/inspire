"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
import { useParams } from "next/navigation";
import { ContractEditor } from "@/components/contracts/contract-editor";
import { useContractTemplate, useUpdateTemplateMutation } from "@/hooks/queries/use-contracts-query";
import { toast } from "sonner";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export default function EditTemplatePage() {
  const router = useRouter();
  const params = useParams();
  const templateId = params.id as string;
  const { data: template, isLoading } = useContractTemplate(templateId);
  const updateMutation = useUpdateTemplateMutation();
  const [templateName, setTemplateName] = useState("");

  useEffect(() => {
    if (template) {
      setTemplateName(template.name);
    }
  }, [template]);

  const handleSave = useCallback(
    async (content: Record<string, unknown>) => {
      if (!templateName.trim()) {
        toast.error("الرجاء إدخال اسم القالب");
        return;
      }
      const result = await updateMutation.mutateAsync({
        templateId,
        data: { name: templateName.trim(), content },
      });
      if (result.success) {
        toast.success("تم تحديث القالب بنجاح");
        router.push("/contracts");
      } else {
        toast.error("فشل تحديث القالب");
      }
    },
    [templateId, templateName, updateMutation, router]
  );

  if (isLoading) {
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
      <div className="flex items-center gap-3">
        <Link href="/contracts">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowRight className="h-4 w-4" />
            العودة
          </Button>
        </Link>
        <h1 className="text-xl font-bold">تعديل القالب: {template.name}</h1>
      </div>

      <ContractEditor
        initialContent={template.content}
        onSave={handleSave}
        saving={updateMutation.isPending}
        templateName={templateName}
        onNameChange={setTemplateName}
      />
    </div>
  );
}
