"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { MapPin, Loader2, CheckCircle2 } from "lucide-react";
import { checkIn } from "@/lib/attendance-actions";

interface CheckInButtonProps {
  checkedIn: boolean;
  onSuccess: () => void;
}

export function CheckInButton({ checkedIn, onSuccess }: CheckInButtonProps) {
  const t = useTranslations("Attendance");
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
    name: string;
  } | null>(null);

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
      setLocation({ latitude, longitude, name: "" });

      const result = await checkIn({
        latitude,
        longitude,
        location_name: `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
      });

      if (result.success) {
        onSuccess();
      } else {
        if (result.error === "already-checked-in") {
          toast.error(t("alreadyCheckedIn"));
        } else {
          toast.error(t("checkInFailed"));
        }
      }
    } catch (err: unknown) {
      if (err instanceof GeolocationPositionError) {
        toast.error(t("locationError"));
      } else {
        toast.error(t("checkInFailed"));
      }
    } finally {
      setLoading(false);
    }
  }, [onSuccess, t]);

  if (checkedIn) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center dark:border-emerald-800 dark:bg-emerald-950">
        <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
        <h2 className="mt-3 text-lg font-bold text-emerald-700 dark:text-emerald-400">
          {t("alreadyCheckedInTitle")}
        </h2>
        <p className="mt-1 text-sm text-emerald-600/80 dark:text-emerald-400/70">
          {t("alreadyCheckedInDesc")}
        </p>
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
        {location && (
          <p className="mt-2 text-xs text-muted-foreground">
            {location.name}
          </p>
        )}
        <Button
          size="lg"
          className="mt-4 gap-2"
          onClick={handleCheckIn}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <MapPin className="h-5 w-5" />
          )}
          {loading ? t("checkingIn") : t("checkIn")}
        </Button>
      </div>
    </div>
  );
}
