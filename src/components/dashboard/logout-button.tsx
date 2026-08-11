"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { logout } from "@/lib/auth-actions";

export function LogoutButton() {
  const t = useTranslations();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    try {
      await logout();
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="size-8 text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950 dark:hover:text-red-300 sm:hidden"
        onClick={() => setConfirmOpen(true)}
      >
        <LogOut className="size-4" />
      </Button>

      <Button
        variant="outline"
        size="sm"
        className="hidden gap-1.5 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950 dark:hover:text-red-300 sm:inline-flex"
        onClick={() => setConfirmOpen(true)}
      >
        <LogOut className="size-3.5" />
        {t("Common.logout")}
      </Button>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t("Common.logout")}
        description="Are you sure you want to sign out?"
        confirmLabel={loading ? "Signing out..." : t("Common.logout")}
        cancelLabel="Cancel"
        variant="destructive"
        loading={loading}
        onConfirm={handleLogout}
      />
    </>
  );
}
