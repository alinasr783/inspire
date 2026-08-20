"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, LogIn, MapPin, X } from "lucide-react";
import { checkIn, checkTodayStatus } from "@/lib/attendance-actions";
import { getEgyptToday } from "@/lib/utils";

export function CheckInReminder() {
  const t = useTranslations("Attendance");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const checkedInRef = useRef(false);
  const dismissedDateRef = useRef<string>("");

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        const status = await checkTodayStatus();
        if (cancelled) return;
        checkedInRef.current = status.checkedIn;
        if (!status.checkedIn) {
          const today = getEgyptToday();
          if (dismissedDateRef.current !== today) {
            setOpen(true);
          }
        }
      } catch {
        // ignore — reminder should never break the app
      }
    };

    void check();

    const interval = setInterval(() => {
      const today = getEgyptToday();
      if (!checkedInRef.current && dismissedDateRef.current !== today) {
        void check();
      }
    }, 60000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const handleCheckIn = useCallback(async () => {
    setLoading(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error("geolocation-not-supported"));
          return;
        }
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        });
      });

      const { latitude, longitude } = position.coords;
      const result = await checkIn({
        latitude,
        longitude,
        location_name: `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
      });

      if (result.success) {
        checkedInRef.current = true;
        setOpen(false);
        toast.success(t("checkInSuccess"));
      } else if (result.error === "already-checked-in") {
        checkedInRef.current = true;
        setOpen(false);
      } else {
        toast.error(t("checkInFailed"));
      }
    } catch {
      toast.error(t("locationError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  const handleDismiss = useCallback(() => {
    dismissedDateRef.current = getEgyptToday();
    setOpen(false);
  }, []);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) handleDismiss();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <button
          onClick={handleDismiss}
          aria-label={t("dismiss")}
          className="absolute end-3 top-3 z-10 flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
        >
          <X className="size-4" />
        </button>
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <LogIn className="h-5 w-5 text-primary" />
            </div>
            <DialogTitle>{t("checkInReminderTitle")}</DialogTitle>
          </div>
          <DialogDescription className="pt-2 leading-relaxed">
            {t("checkInReminderDesc")}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Button
            size="lg"
            className="w-full gap-2"
            onClick={handleCheckIn}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MapPin className="h-4 w-4" />
            )}
            {loading ? t("checkingIn") : t("checkIn")}
          </Button>
          <Button variant="ghost" size="sm" onClick={handleDismiss}>
            {t("later")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
