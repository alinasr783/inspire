"use client";

import { useState, useCallback } from "react";
import { useRouter } from "@/i18n/navigation";
import { ContractEditor } from "@/components/contracts/contract-editor";
import { useCreateTemplateMutation } from "@/hooks/queries/use-contracts-query";
import { toast } from "sonner";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export default function NewTemplatePage() {
  const router = useRouter();
  const createMutation = useCreateTemplateMutation();
  const [templateName, setTemplateName] = useState("");
  const [editorContent, setEditorContent] = useState<Record<string, unknown>>({
    type: "doc",
    content: [
      {
        type: "paragraph",
        attrs: { textAlign: "right", dir: "rtl" },
        content: [],
      },
    ],
  });

  const handleSave = useCallback(
    async (content: Record<string, unknown>) => {
      if (!templateName.trim()) {
        toast.error("الرجاء إدخال اسم القالب");
        return;
      }
      const result = await createMutation.mutateAsync({
        name: templateName.trim(),
        content,
      });
      if (result.success) {
        toast.success("تم إنشاء القالب بنجاح");
        router.push("/contracts");
      } else {
        toast.error("فشل إنشاء القالب");
      }
    },
    [templateName, createMutation, router]
  );

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex items-center gap-3">
        <Link href="/contracts">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowRight className="h-4 w-4" />
            العودة
          </Button>
        </Link>
        <h1 className="text-xl font-bold">انشاء قالب عقد جديد</h1>
      </div>

      <ContractEditor
        initialContent={editorContent}
        onSave={handleSave}
        saving={createMutation.isPending}
        templateName={templateName}
        onNameChange={setTemplateName}
      />
    </div>
  );
}
