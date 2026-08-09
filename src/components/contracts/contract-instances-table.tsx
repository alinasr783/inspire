"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { useContractInstances, useDeleteInstanceMutation } from "@/hooks/queries/use-contracts-query";
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
import { Eye, Trash2, Loader2, FileStack, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export function ContractInstancesTable() {
  const { data: instances, isLoading } = useContractInstances();
  const deleteMutation = useDeleteInstanceMutation();
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const result = await deleteMutation.mutateAsync(deleteTarget);
    if (result.success) {
      toast.success("تم حذف العقد بنجاح");
    } else {
      toast.error("فشل حذف العقد");
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
      <div className="flex items-center gap-3">
        <Link href="/contracts">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            العودة للقوالب
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-bold">العقود المحفوظة</CardTitle>
        </CardHeader>
        <CardContent>
          {(!instances || instances.length === 0) ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FileStack className="h-16 w-16 text-muted-foreground/30 mb-4" />
              <p className="text-lg font-medium text-muted-foreground">لا توجد عقود محفوظة</p>
              <p className="mt-1 text-sm text-muted-foreground/60">
                قم بملء أحد القوالب لحفظ العقد في النظام
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">القالب</TableHead>
                  <TableHead className="text-right">العميل</TableHead>
                  <TableHead className="text-right">العقار</TableHead>
                  <TableHead className="text-right">تاريخ الإنشاء</TableHead>
                  <TableHead className="text-center">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {instances!.map((instance) => (
                  <TableRow key={instance.id}>
                    <TableCell className="text-right font-medium">
                      {instance.template?.name || "—"}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {instance.client?.customer_name || "—"}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {instance.unit?.customer_name || "—"}
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {format(new Date(instance.created_at), "dd MMMM yyyy", { locale: ar })}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Link href={`/contracts/instances/${instance.id}`}>
                          <Button variant="ghost" size="icon" title="عرض">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="حذف"
                          onClick={() => setDeleteTarget(instance.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
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
        title="حذف العقد المحفوظ"
        description="هل أنت متأكد من حذف هذا العقد المحفوظ؟ هذا الإجراء لا يمكن التراجع عنه."
        confirmLabel="حذف"
        cancelLabel="إلغاء"
        variant="destructive"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
