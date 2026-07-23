"use client";

import { useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { getPendingUsersCount } from "@/lib/auth-actions";

export function usePendingUsersBadge(role?: string) {
  const prevCountRef = useRef(0);

  const checkCount = useCallback(async () => {
    if (role !== "admin") return;
    try {
      const count = await getPendingUsersCount();
      const prev = prevCountRef.current;
      prevCountRef.current = count;

      if (count > prev && prev > 0) {
        toast("", {
          description: `لديك ${count} طلبات تسجيل جديدة`,
          action: {
            label: "عرض المستخدمين",
            onClick: () => {
              window.location.href = "/ar/admin/users";
            },
          },
          duration: 6000,
        });
      }
    } catch {
      // Silently fail
    }
  }, [role]);

  useEffect(() => {
    checkCount();
    const interval = setInterval(checkCount, 10000);
    return () => clearInterval(interval);
  }, [checkCount]);

  return prevCountRef;
}
