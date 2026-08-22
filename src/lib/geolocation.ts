export type LocationErrorCode = "unsupported" | "denied" | "unavailable" | "timeout";

export class LocationError extends Error {
  code: LocationErrorCode;
  constructor(code: LocationErrorCode, message: string) {
    super(message);
    this.name = "LocationError";
    this.code = code;
  }
}

function getCode(err: GeolocationPositionError): LocationErrorCode {
  switch (err.code) {
    case err.PERMISSION_DENIED:
      return "denied";
    case err.POSITION_UNAVAILABLE:
      return "unavailable";
    case err.TIMEOUT:
      return "timeout";
    default:
      return "unavailable";
  }
}

/**
 * Gets the user's current location with a resilient strategy:
 * 1. Try high-accuracy GPS first (most precise).
 * 2. If it times out OR the position is unavailable, retry with a faster,
 *    cached, lower-accuracy fix (uses Wi-Fi/cell triangulation + last known).
 * 3. If that also fails, reject with a `LocationError`.
 */
export function getCurrentLocation(): Promise<{ latitude: number; longitude: number }> {
  if (typeof window === "undefined" || !navigator.geolocation) {
    return Promise.reject(new LocationError("unsupported", "Geolocation not supported"));
  }

  return new Promise((resolve, reject) => {
    let settled = false;
    const settle = (fn: () => void) => {
      if (!settled) {
        settled = true;
        fn();
      }
    };

    const success = (position: GeolocationPosition) => {
      settle(() =>
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        })
      );
    };

    const failure = (err: GeolocationPositionError) => {
      settle(() => reject(new LocationError(getCode(err), err.message)));
    };

    const attemptLowAccuracy = () => {
      navigator.geolocation.getCurrentPosition(success, failure, {
        enableHighAccuracy: false,
        timeout: 15000,
        maximumAge: 120000,
      });
    };

    const attemptHighAccuracy = () => {
      navigator.geolocation.getCurrentPosition(
        success,
        (err) => {
          if (err.code === err.TIMEOUT || err.code === err.POSITION_UNAVAILABLE) {
            attemptLowAccuracy();
          } else {
            failure(err);
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    };

    attemptHighAccuracy();
  });
}
