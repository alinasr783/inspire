"use client";

import { useState, useEffect, useCallback, useTransition, useRef } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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

const statusStyles: Record<string, string> = {
  pending:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200",
  approved:
    "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200",
};

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

  const handleApprove = (user: UserProfile) => {
    const confirmed = window.confirm(
      t("approveConfirm", {
        name: [user.first_name, user.second_name].filter(Boolean).join(" ") || user.email,
      })
    );
    if (!confirmed) return;

    setApproving(user.id);
    startTransition(async () => {
      const result = await setApprovalReturn(user.id, "approved");
      setApproving(null);
      if (result.success) {
        toast.success(
          t("userApproved", {
            name: [user.first_name, user.second_name].filter(Boolean).join(" ") || user.email,
          })
        );
        fetchUsers();
      }
    });
  };

  const handleReject = (user: UserProfile) => {
    const confirmed = window.confirm(
      t("rejectConfirm", {
        name: [user.first_name, user.second_name].filter(Boolean).join(" ") || user.email,
      }) +
        "\n\n" +
        t("rejectPermanent")
    );
    if (!confirmed) return;

    setApproving(user.id);
    startTransition(async () => {
      const result = await setApprovalReturn(user.id, "rejected");
      setApproving(null);
      if (result.success) {
        toast.success(
          t("userRejected", {
            name: [user.first_name, user.second_name].filter(Boolean).join(" ") || user.email,
          })
        );
        fetchUsers();
      }
    });
  };

  const handleRoleChange = (user: UserProfile) => {
    const newRole = user.role === "admin" ? "user" : "admin";
    const confirm = window.confirm(
      t("changeRoleConfirm", {
        name: [user.first_name, user.second_name].filter(Boolean).join(" ") || user.email,
        role: t(newRole === "admin" ? "role_admin" : "role_user"),
      })
    );
    if (!confirm) return;

    setRoleChanging(user.id);
    startTransition(async () => {
      const result = await changeUserRole(user.id, newRole);
      setRoleChanging(null);
      if (result.success) {
        toast.success(
          t("roleChanged", {
            name: [user.first_name, user.second_name].filter(Boolean).join(" ") || user.email,
            role: t(newRole === "admin" ? "role_admin" : "role_user"),
          })
        );
        fetchUsers();
      }
    });
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
                        {[u.first_name, u.second_name]
                          .filter(Boolean)
                          .join(" ") || "—"}
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
                                onClick={() => handleApprove(u)}
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
                                onClick={() => handleReject(u)}
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
                              onClick={() => handleReject(u)}
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
                              onClick={() => handleApprove(u)}
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
                            onClick={() => handleRoleChange(u)}
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
    </div>
  );
}
