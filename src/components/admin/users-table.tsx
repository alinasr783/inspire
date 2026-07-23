"use client";

import { useState, useEffect, useCallback, useTransition, useRef } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";
import {
  Search,
  Loader2,
  Shield,
  ShieldCheck,
  UserCheck,
  UserX,
} from "lucide-react";
import {
  getUsers,
  setApprovalReturn,
  changeUserRole,
  type UserProfile,
} from "@/lib/auth-actions";
import { toast } from "sonner";

type StatusFilter = "all" | "pending" | "approved" | "rejected";

type DialogAction =
  | { type: "approve"; user: UserProfile }
  | { type: "reject"; user: UserProfile }
  | { type: "role"; user: UserProfile; newRole: "user" | "admin" }
  | null;

const statusStyles: Record<string, string> = {
  pending:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200",
  approved:
    "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200",
};

function userName(u: UserProfile) {
  return [u.first_name, u.second_name].filter(Boolean).join(" ") || u.email;
}

export function UsersTable() {
  const t = useTranslations("Admin");
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [approving, setApproving] = useState<string | null>(null);
  const [roleChanging, setRoleChanging] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const pollingRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const [dialog, setDialog] = useState<DialogAction>(null);

  const fetchUsers = useCallback(async () => {
    const data = await getUsers({
      status: filter === "all" ? undefined : filter,
      search: search || undefined,
    });
    setUsers(data);
    setLoading(false);
  }, [filter, search]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    pollingRef.current = setInterval(fetchUsers, 5000);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [fetchUsers]);

  const counts = {
    all: users.length,
    pending: users.filter((u) => u.approval_status === "pending").length,
    approved: users.filter((u) => u.approval_status === "approved").length,
    rejected: users.filter((u) => u.approval_status === "rejected").length,
  };

  const executeApprove = (userId: string) => {
    setApproving(userId);
    startTransition(async () => {
      const result = await setApprovalReturn(userId, "approved");
      setApproving(null);
      if (result.success) {
        const u = users.find((x) => x.id === userId);
        toast.success(t("userApproved", { name: u ? userName(u) : "" }));
        fetchUsers();
      }
    });
  };

  const executeReject = (userId: string) => {
    setApproving(userId);
    startTransition(async () => {
      const result = await setApprovalReturn(userId, "rejected");
      setApproving(null);
      if (result.success) {
        const u = users.find((x) => x.id === userId);
        toast.success(t("userRejected", { name: u ? userName(u) : "" }));
        fetchUsers();
      }
    });
  };

  const executeRoleChange = (userId: string, newRole: "user" | "admin") => {
    setRoleChanging(userId);
    startTransition(async () => {
      const result = await changeUserRole(userId, newRole);
      setRoleChanging(null);
      if (result.success) {
        const u = users.find((x) => x.id === userId);
        toast.success(
          t("roleChanged", {
            name: u ? userName(u) : "",
            role: t(newRole === "admin" ? "role_admin" : "role_user"),
          })
        );
        fetchUsers();
      }
    });
  };

  const handleDialogConfirm = () => {
    if (!dialog) return;
    if (dialog.type === "approve") {
      executeApprove(dialog.user.id);
    } else if (dialog.type === "reject") {
      executeReject(dialog.user.id);
    } else if (dialog.type === "role") {
      executeRoleChange(dialog.user.id, dialog.newRole);
    }
    setDialog(null);
  };

  const tabs: { key: StatusFilter; label: string; count: number }[] = [
    { key: "all", label: t("allUsers"), count: counts.all },
    { key: "pending", label: t("pendingUsers"), count: counts.pending },
    { key: "approved", label: t("approvedUsers"), count: counts.approved },
    { key: "rejected", label: t("rejectedUsers"), count: counts.rejected },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>

        <div className="relative max-w-xs w-full">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("searchUsers")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ps-9"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <Button
            key={tab.key}
            variant={filter === tab.key ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(tab.key)}
            className="gap-1.5"
          >
            {tab.label}
            <Badge
              variant="secondary"
              className="h-5 min-w-5 rounded-full px-1 text-[11px]"
            >
              {loading ? "..." : tab.count}
            </Badge>
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {tabs.find((t) => t.key === filter)?.label ?? t("allUsers")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : users.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              {search ? t("noSearchResults") : t("empty")}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-start text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="px-3 py-2 text-start font-medium">
                      {t("name")}
                    </th>
                    <th className="px-3 py-2 text-start font-medium">
                      {t("email")}
                    </th>
                    <th className="px-3 py-2 text-start font-medium hidden sm:table-cell">
                      {t("phone")}
                    </th>
                    <th className="px-3 py-2 text-start font-medium">
                      {t("status")}
                    </th>
                    <th className="px-3 py-2 text-start font-medium hidden md:table-cell">
                      {t("role")}
                    </th>
                    <th className="px-3 py-2 text-start font-medium">
                      {t("actions")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr
                      key={u.id}
                      className="border-b last:border-0 transition-colors hover:bg-muted/30"
                    >
                      <td className="px-3 py-2 font-medium">
                        {userName(u) || "—"}
                      </td>
                      <td className="px-3 py-2 text-xs" dir="ltr">
                        {u.email}
                      </td>
                      <td className="px-3 py-2 text-xs hidden sm:table-cell" dir="ltr">
                        {u.phone || "—"}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                            statusStyles[u.approval_status] ??
                              statusStyles.pending
                          )}
                        >
                          {t(`status_${u.approval_status}`)}
                        </span>
                      </td>
                      <td className="px-3 py-2 hidden md:table-cell">
                        <span className="inline-flex items-center gap-1 text-xs">
                          {u.role === "admin" ? (
                            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                          ) : (
                            <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                          {t(u.role === "admin" ? "role_admin" : "role_user")}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-1.5">
                          {u.approval_status === "pending" && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => setDialog({ type: "approve", user: u })}
                                disabled={isPending && approving === u.id}
                                className="h-8 px-2.5 text-xs"
                              >
                                {isPending && approving === u.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <UserCheck className="h-3.5 w-3.5" />
                                )}
                                <span className="ms-1">{t("approve")}</span>
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => setDialog({ type: "reject", user: u })}
                                disabled={isPending && approving === u.id}
                                className="h-8 px-2.5 text-xs"
                              >
                                {isPending && approving === u.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <UserX className="h-3.5 w-3.5" />
                                )}
                                <span className="ms-1">{t("reject")}</span>
                              </Button>
                            </>
                          )}
                          {u.approval_status === "approved" && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => setDialog({ type: "reject", user: u })}
                              disabled={isPending && approving === u.id}
                              className="h-8 px-2.5 text-xs"
                            >
                              <UserX className="h-3.5 w-3.5" />
                              <span className="ms-1">{t("reject")}</span>
                            </Button>
                          )}
                          {u.approval_status === "rejected" && (
                            <Button
                              size="sm"
                              onClick={() => setDialog({ type: "approve", user: u })}
                              disabled={isPending && approving === u.id}
                              className="h-8 px-2.5 text-xs"
                            >
                              <UserCheck className="h-3.5 w-3.5" />
                              <span className="ms-1">{t("approve")}</span>
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setDialog({
                                type: "role",
                                user: u,
                                newRole: u.role === "admin" ? "user" : "admin",
                              })
                            }
                            disabled={isPending && roleChanging === u.id}
                            className="h-8 px-2.5 text-xs"
                          >
                            {isPending && roleChanging === u.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : u.role === "admin" ? (
                              <Shield className="h-3.5 w-3.5" />
                            ) : (
                              <ShieldCheck className="h-3.5 w-3.5" />
                            )}
                            <span className="ms-1">{t("changeRole")}</span>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={dialog !== null}
        onOpenChange={(open) => {
          if (!open) setDialog(null);
        }}
        title={
          dialog?.type === "approve"
            ? t("approveConfirm", { name: userName(dialog.user) })
            : dialog?.type === "reject"
              ? t("rejectConfirm", { name: userName(dialog.user) })
              : dialog?.type === "role"
                ? t("changeRoleConfirm", {
                    name: userName(dialog.user),
                    role: t(
                      dialog.newRole === "admin" ? "role_admin" : "role_user"
                    ),
                  })
                : ""
        }
        description={
          dialog?.type === "reject" ? t("rejectPermanent") : undefined
        }
        confirmLabel={
          dialog?.type === "approve"
            ? t("approve")
            : dialog?.type === "reject"
              ? t("reject")
              : t("changeRoleReassign")
        }
        cancelLabel={t("cancel")}
        variant={dialog?.type === "reject" ? "destructive" : "default"}
        loading={false}
        onConfirm={handleDialogConfirm}
      />
    </div>
  );
}
