"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Users,
  Building2,
  CalendarCheck,
  ListChecks,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { TeamMemberRow } from "@/lib/team-actions";
import { cn } from "@/lib/utils";

interface EmployeeCardProps {
  member: TeamMemberRow;
}

export function EmployeeCard({ member }: EmployeeCardProps) {
  const t = useTranslations("Team");
  const fullName = [member.first_name, member.second_name].filter(Boolean).join(" ") || member.email;
  const initials = `${member.first_name?.[0] ?? ""}${member.second_name?.[0] ?? ""}`.toUpperCase() || "?";

  return (
    <Card className="group relative overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5">
      <Link
        href={`/admin/team/${member.id}`}
        className="block p-6"
      >
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-4">
            <Avatar className="h-20 w-20 ring-2 ring-border ring-offset-2 ring-offset-background transition-all group-hover:ring-primary/30">
              <AvatarImage src={member.avatar_url ?? undefined} alt={fullName} className="object-cover" />
              <AvatarFallback className="text-lg font-semibold bg-primary/10 text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span
              className={cn(
                "absolute -bottom-1 -end-1 h-4 w-4 rounded-full border-2 border-background",
                member.approval_status === "approved" ? "bg-green-500" : "bg-red-500"
              )}
            />
          </div>

          <h3 className="text-base font-semibold truncate max-w-full">{fullName}</h3>

          {member.position && (
            <Badge variant="secondary" className="mt-1 text-[11px]">
              {member.position}
            </Badge>
          )}

          <div className="mt-4 grid w-full grid-cols-3 gap-2">
            <div className="flex flex-col items-center rounded-lg bg-muted/50 px-2 py-2">
              <Users className="h-4 w-4 text-muted-foreground mb-0.5" />
              <span className="text-sm font-bold">{member.clients_count}</span>
              <span className="text-[10px] text-muted-foreground">{t("clients")}</span>
            </div>
            <div className="flex flex-col items-center rounded-lg bg-muted/50 px-2 py-2">
              <Building2 className="h-4 w-4 text-muted-foreground mb-0.5" />
              <span className="text-sm font-bold">{member.properties_count}</span>
              <span className="text-[10px] text-muted-foreground">{t("properties")}</span>
            </div>
            <div className="flex flex-col items-center rounded-lg bg-muted/50 px-2 py-2">
              <CalendarCheck className="h-4 w-4 text-muted-foreground mb-0.5" />
              <span className="text-sm font-bold">{member.visits_count}</span>
              <span className="text-[10px] text-muted-foreground">{t("visits")}</span>
            </div>
          </div>

          {member.tasks_pending > 0 && (
            <div className="mt-3 flex w-full items-center gap-2 rounded-lg bg-orange-50 px-3 py-2 dark:bg-orange-950/30">
              <ListChecks className="h-4 w-4 shrink-0 text-orange-600 dark:text-orange-400" />
              <span className="text-xs text-orange-700 dark:text-orange-300">
                {member.tasks_pending} {t("pendingTasks")}
              </span>
            </div>
          )}
        </div>
      </Link>

      <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-primary/40 to-primary opacity-0 transition-opacity group-hover:opacity-100" />
    </Card>
  );
}
