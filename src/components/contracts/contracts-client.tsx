"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { useContractTemplates, useDeleteTemplateMutation } from "@/hooks/queries/use-contracts-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  FileText,
  Edit,
  Trash2,
  Eye,
  Loader2,
  FileCheck,
} from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface ContractsClientProps {
  isAdmin: boolean;
}

export function ContractsClient({ isAdmin }: ContractsClientProps) {
  const { data: templates, isLoading } = useContractTemplates();
  const deleteMutation = useDeleteTemplateMutation();
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const result = await deleteMutation.mutateAsync(deleteTarget);
    if (result.success) {
      toast.success("تم حذف القالب بنجاح");
    } else {
      toast.error("فشل حذف القالب");
    }
    setDeleteTarget(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-bold">قوالب العقود</CardTitle>
          {isAdmin && (
            <Link href="/contracts/templates/new">
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                انشاء عقد
              </Button>
            </Link>
          )}
        </CardHeader>
        <CardContent>
          {(!templates || templates.length === 0) ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FileText className="h-16 w-16 text-muted-foreground/30 mb-4" />
              <p className="text-lg font-medium text-muted-foreground">لا توجد قوالب عقود حالياً</p>
              {isAdmin && (
                <>
                  <p className="mt-1 text-sm text-muted-foreground/60">
                    اضغط على زر &quot;انشاء عقد&quot; لإنشاء أول قالب عقد
                  </p>
                  <Link href="/contracts/templates/new" className="mt-4">
                    <Button variant="outline" className="gap-2">
                      <Plus className="h-4 w-4" />
                      انشاء عقد جديد
                    </Button>
                  </Link>
                </>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">اسم القالب</TableHead>
                  <TableHead className="text-right">تاريخ الإنشاء</TableHead>
                  <TableHead className="text-right">آخر تحديث</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-center">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates!.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell className="text-right font-medium">{template.name}</TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {format(new Date(template.created_at), "dd MMMM yyyy", { locale: ar })}
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {format(new Date(template.updated_at), "dd MMMM yyyy", { locale: ar })}
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          template.is_active
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                        }`}
                      >
                        {template.is_active ? "نشط" : "غير نشط"}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Link href={`/contracts/templates/${template.id}/fill`}>
                          <Button variant="ghost" size="icon" title="ملء العقد">
                            <FileCheck className="h-4 w-4 text-primary" />
                          </Button>
                        </Link>
                        {isAdmin && (
                          <>
                            <Link href={`/contracts/templates/${template.id}/edit`}>
                              <Button variant="ghost" size="icon" title="تعديل">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="حذف"
                              onClick={() => setDeleteTarget(template.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="حذف القالب"
        description="هل أنت متأكد من حذف هذا القالب؟ سيتم حذف جميع العقود المرتبطة به أيضاً. هذا الإجراء لا يمكن التراجع عنه."
        confirmLabel="حذف"
        cancelLabel="إلغاء"
        variant="destructive"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
