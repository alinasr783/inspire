"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Dialog } from "@base-ui/react/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Check, X, Users } from "lucide-react";
import { addPartner, removePartner } from "@/lib/finance-actions";
import { cn } from "@/lib/utils";

type AdminUser = {
  id: string;
  first_name: string | null;
  second_name: string | null;
  position: string | null;
  avatar_url: string | null;
};

function getName(u: AdminUser): string {
  return [u.first_name, u.second_name].filter(Boolean).join(" ") || "—";
}

export function PartnerManager({
  open,
  onOpenChange,
  allAdmins,
  partnerIds,
  onChanged,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allAdmins: AdminUser[];
  partnerIds: Set<string>;
  onChanged: () => void;
}) {
  const t = useTranslations("Finances");
  const [busy, setBusy] = useState<string | null>(null);
  const [optimisticIds, setOptimisticIds] = useState<Set<string>>(partnerIds);

  useEffect(() => {
    setOptimisticIds(partnerIds);
  }, [partnerIds]);

  const toggle = async (user: AdminUser, isPartner: boolean) => {
    setBusy(user.id);

    setOptimisticIds((prev) => {
      const next = new Set(prev);
      if (isPartner) next.delete(user.id);
      else next.add(user.id);
      return next;
    });

    const result = isPartner ? await removePartner(user.id) : await addPartner(user.id);
    setBusy(null);
    if (result.success) {
      toast.success(isPartner ? t("partnerRemoved") : t("partnerAdded"));
      onChanged();
    } else {
      toast.error(isPartner ? t("partnerRemoveFailed") : t("partnerAddFailed"));
      setOptimisticIds(partnerIds);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[2px]" />
        <Dialog.Popup className="fixed start-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border bg-card p-6 shadow-xl">
          <div className="flex items-center justify-between">
            <Dialog.Title className="text-lg font-semibold flex items-center gap-2">
              <Users className="size-5 text-purple-600" /> {t("managePartners")}
            </Dialog.Title>
            <Dialog.Close render={<Button variant="ghost" size="icon" className="size-8"><X className="size-4" /></Button>} />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{t("managePartnersDesc")}</p>

          <div className="mt-5 space-y-2 max-h-[60vh] overflow-y-auto">
            {allAdmins.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">{t("noAdminUsers")}</p>
            ) : (
              allAdmins.map((user) => {
                const isPartner = optimisticIds.has(user.id);
                return (
                  <div key={user.id} className={cn("flex items-center gap-3 rounded-xl border p-3", isPartner && "border-primary/40 bg-primary/5")}>
                    <Avatar className="size-9 rounded-lg shrink-0">
                      <AvatarImage src={user.avatar_url ?? undefined} />
                      <AvatarFallback className="rounded-lg bg-primary/10 text-[10px]">{getName(user).split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{getName(user)}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{user.position || "Admin"}</p>
                    </div>
                    {isPartner && <Badge className="text-[10px] bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">{t("partner")}</Badge>}
                    <Button
                      variant={isPartner ? "outline" : "default"}
                      size="sm"
                      className="gap-1 shrink-0"
                      onClick={() => toggle(user, isPartner)}
                      disabled={busy === user.id}
                    >
                      {isPartner ? (<><X className="size-3.5" />{busy === user.id ? "..." : t("remove")}</>) : (<><Check className="size-3.5" />{busy === user.id ? "..." : t("add")}</>)}
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
