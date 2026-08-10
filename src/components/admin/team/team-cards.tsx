"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2, UsersRound } from "lucide-react";
import { EmployeeCard } from "@/components/admin/team/employee-card";
import { useTeamMembersQuery } from "@/hooks/queries/use-team-query";
import type { TeamMemberRow } from "@/lib/team-actions";

interface TeamCardsProps {
  initialData: TeamMemberRow[];
}

export function TeamCards({ initialData }: TeamCardsProps) {
  const t = useTranslations("Team");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "disabled">("all");

  const { data: members, isLoading } = useTeamMembersQuery(initialData);

  const filtered = useMemo(() => {
    if (!members) return [];
    return members
      .filter((m) => {
        if (filter === "active" && m.approval_status !== "approved") return false;
        if (filter === "disabled" && m.approval_status !== "rejected") return false;
        if (search) {
          const s = search.toLowerCase();
          const name = [m.first_name, m.second_name].filter(Boolean).join(" ").toLowerCase();
          return name.includes(s) || m.email.toLowerCase().includes(s) || (m.position ?? "").toLowerCase().includes(s);
        }
        return true;
      });
  }, [members, filter, search]);

  const counts = useMemo(() => {
    if (!members) return { all: 0, active: 0, disabled: 0 };
    return {
      all: members.length,
      active: members.filter((m) => m.approval_status === "approved").length,
      disabled: members.filter((m) => m.approval_status === "rejected").length,
    };
  }, [members]);

  if (isLoading && !members) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <UsersRound className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        </div>

        <div className="relative max-w-xs w-full">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ps-9"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant={filter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("all")}
          className="gap-1.5"
        >
          {t("allEmployees")}
          <Badge variant="secondary" className="h-5 min-w-5 rounded-full px-1 text-[11px]">
            {counts.all}
          </Badge>
        </Button>
        <Button
          variant={filter === "active" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("active")}
          className="gap-1.5"
        >
          {t("active")}
          <Badge variant="secondary" className="h-5 min-w-5 rounded-full px-1 text-[11px]">
            {counts.active}
          </Badge>
        </Button>
        <Button
          variant={filter === "disabled" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("disabled")}
          className="gap-1.5"
        >
          {t("disabled")}
          <Badge variant="secondary" className="h-5 min-w-5 rounded-full px-1 text-[11px]">
            {counts.disabled}
          </Badge>
        </Button>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <UsersRound className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <p className="text-sm text-muted-foreground">
            {search ? t("noEmployees") : t("noEmployees")}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((member) => (
            <EmployeeCard key={member.id} member={member} />
          ))}
        </div>
      )}
    </div>
  );
}
