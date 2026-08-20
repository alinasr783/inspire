"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { MapPin, Loader2, CheckCircle2, LogIn, LogOut } from "lucide-react";
import { checkIn, checkOut } from "@/lib/attendance-actions";
import { getCurrentLocation, LocationError } from "@/lib/geolocation";

interface CheckInButtonProps {
  checkedIn: boolean;
  checkedOut: boolean;
  onSuccess: (type: "in" | "out") => void;
}

function locationErrorMessage(t: (key: string) => string, err: unknown) {
  if (err instanceof LocationError) {
    return t(`locationError_${err.code}`);
  }
  return t("locationError");
}

export function CheckInButton({ checkedIn, checkedOut, onSuccess }: CheckInButtonProps) {
  const t = useTranslations("Attendance");
  const [loading, setLoading] = useState(false);

  const handleCheckIn = useCallback(async () => {
    setLoading(true);
    let coords: { latitude: number; longitude: number };
    try {
      coords = await getCurrentLocation();
    } catch (err) {
      toast.error(locationErrorMessage(t, err));
      setLoading(false);
      return;
    }

    const result = await checkIn({
      latitude: coords.latitude,
      longitude: coords.longitude,
      location_name: `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`,
    });

    if (result.success) {
      onSuccess("in");
    } else if (result.error === "already-checked-in") {
      toast.error(t("alreadyCheckedIn"));
    } else {
      toast.error(t("checkInFailed"));
    }
    setLoading(false);
  }, [onSuccess, t]);

  const handleCheckOut = useCallback(async () => {
    setLoading(true);
    let coords: { latitude: number; longitude: number };
    try {
      coords = await getCurrentLocation();
    } catch (err) {
      toast.error(locationErrorMessage(t, err));
      setLoading(false);
      return;
    }

    const result = await checkOut({
      latitude: coords.latitude,
      longitude: coords.longitude,
      location_name: `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`,
    });

    if (result.success) {
      onSuccess("out");
    } else if (result.error === "already-checked-out") {
      toast.error(t("alreadyCheckedOut"));
    } else if (result.error === "no-active-checkin") {
      toast.error(t("noActiveCheckIn"));
    } else {
      toast.error(t("checkOutFailed"));
    }
    setLoading(false);
  }, [onSuccess, t]);

  if (checkedIn && checkedOut) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center dark:border-emerald-800 dark:bg-emerald-950">
        <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
        <h2 className="mt-3 text-lg font-bold text-emerald-700 dark:text-emerald-400">
          {t("dayCompleteTitle")}
        </h2>
        <p className="mt-1 text-sm text-emerald-600/80 dark:text-emerald-400/70">
          {t("dayCompleteDesc")}
        </p>
      </div>
    );
  }

  if (checkedIn) {
    return (
      <div className="rounded-xl border bg-card p-6 shadow-sm ring-1 ring-foreground/5">
        <div className="text-center">
          <LogOut className="mx-auto h-12 w-12 text-amber-500" />
          <h2 className="mt-3 text-lg font-bold">{t("checkOutTitle")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("checkOutDesc")}
          </p>
          <Button
            size="lg"
            variant="default"
            className="mt-4 gap-2"
            onClick={handleCheckOut}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <LogOut className="h-5 w-5" />
            )}
            {loading ? t("checkingOut") : t("checkOut")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm ring-1 ring-foreground/5">
      <div className="text-center">
        <MapPin className="mx-auto h-12 w-12 text-primary" />
        <h2 className="mt-3 text-lg font-bold">{t("checkInTitle")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("checkInDesc")}
        </p>
        <Button
          size="lg"
          className="mt-4 gap-2"
          onClick={handleCheckIn}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <LogIn className="h-5 w-5" />
          )}
          {loading ? t("checkingIn") : t("checkIn")}
        </Button>
      </div>
    </div>
  );
}
