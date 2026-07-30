"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/services/i18n/client";

type LocationState =
  | "idle"
  | "requesting"
  | "granted"
  | "denied"
  | "unavailable";

type Props = {
  /** Called with coordinates once permission is granted and position acquired. */
  onLocation: (lat: number, lng: number) => void;
  /** If true, starts requesting immediately on mount. */
  autoRequest?: boolean;
};

/**
 * Handles the browser geolocation permission flow. If the user denies,
 * shows a clear prompt with a button to re-ask. Works for both riders
 * and drivers.
 *
 * Note: browsers only show the native permission dialog once per page
 * load if the user has previously denied. After a hard deny, re-calling
 * getCurrentPosition still triggers the denied callback but won't re-show
 * the browser prompt — the user must go to site settings. We inform them
 * of this clearly.
 */
export function useLocationPermission(
  onLocation: (lat: number, lng: number) => void
) {
  const { t } = useTranslation("common");
  const [state, setState] = useState<LocationState>("idle");
  const [error, setError] = useState<string | null>(null);

  // Held in a ref so that callers passing an inline arrow don't change the
  // identity of requestLocation. Without this, an unstable callback makes
  // the auto-request effect re-fire on every render, repeatedly hitting
  // geolocation and churning any state the caller derives from it.
  const onLocationRef = useRef(onLocation);
  useEffect(() => {
    onLocationRef.current = onLocation;
  }, [onLocation]);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setState("unavailable");
      setError(t("common:locationPermission.errors.notSupported"));
      return;
    }

    setState("requesting");
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setState("granted");
        setError(null);
        onLocationRef.current(pos.coords.latitude, pos.coords.longitude);
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setState("denied");
          setError(t("common:locationPermission.errors.denied"));
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setState("unavailable");
          setError(t("common:locationPermission.errors.unavailable"));
        } else {
          setState("denied");
          setError(t("common:locationPermission.errors.timeout"));
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [t]);

  return { state, error, requestLocation };
}

/**
 * A UI overlay/banner component that prompts the user to grant location.
 * Renders nothing when location is granted.
 */
export function LocationPermissionPrompt({
  onLocation,
  autoRequest = true,
}: Props) {
  const { t } = useTranslation("common");
  const { state, error, requestLocation } = useLocationPermission(onLocation);

  useEffect(() => {
    if (autoRequest) {
      requestLocation();
    }
  }, [autoRequest, requestLocation]);

  // Don't render anything if permission is granted or we haven't asked yet
  if (state === "granted" || (state === "idle" && !autoRequest)) return null;

  if (state === "requesting") {
    return (
      <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950 p-4 text-center">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          {t("common:locationPermission.requesting")}
        </p>
      </div>
    );
  }

  if (state === "denied" || state === "unavailable") {
    return (
      <div className="rounded-lg border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950 p-4 text-center space-y-3">
        <p className="text-sm text-orange-800 dark:text-orange-200">
          ⚠️ {error}
        </p>
        <p className="text-xs text-orange-700 dark:text-orange-300">
          {t("common:locationPermission.resetHelp")}
        </p>
        <Button size="sm" onClick={requestLocation}>
          {t("common:locationPermission.actions.allowAccess")}
        </Button>
      </div>
    );
  }

  return null;
}

export default LocationPermissionPrompt;
