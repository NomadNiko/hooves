"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import useAuth from "@/services/auth/use-auth";
import {
  usePostRideService,
  useGetRideService,
  usePatchRideService,
  useGetRidesService,
} from "@/services/api/services/rides";
import { useGetDriverProfilesService } from "@/services/api/services/driver-profiles";
import {
  Ride,
  RideStatus,
  STANDS,
  STAND_COORDS,
} from "@/services/api/types/ride";
import dynamic from "next/dynamic";
import LocationPermissionPrompt from "@/components/location-permission";

// mapbox-gl touches window at import time, so load it client-side only.
function MapLoadingFallback() {
  const { t } = useTranslation("ride");
  return (
    <div className="rounded-lg border h-[320px] flex items-center justify-center text-sm text-muted-foreground">
      {t("ride:map.loading")}
    </div>
  );
}

const DriverTrackingMap = dynamic(
  () => import("@/components/map/driver-tracking-map"),
  {
    ssr: false,
    loading: () => <MapLoadingFallback />,
  }
);
import HTTP_CODES_ENUM from "@/services/api/types/http-codes";
import { useSnackbar } from "@/hooks/use-snackbar";
import { useTranslation } from "@/services/i18n/client";
import { useMapboxRoute } from "@/hooks/use-mapbox-route";

import withPageRequiredAuth from "@/services/auth/with-page-required-auth";

function RidePageContent() {
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const { t } = useTranslation("ride");

  const postRide = usePostRideService();
  const getRide = useGetRideService();
  const patchRide = usePatchRideService();
  const getRides = useGetRidesService();
  const getDriverProfiles = useGetDriverProfilesService();

  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [activeRide, setActiveRide] = useState<Ride | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [restoring, setRestoring] = useState(true);
  const [driverLocation, setDriverLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  // Fetch actual road-following route geometry from Mapbox Directions API.
  // Route preview (hail form): pickup → dropoff
  const previewRoute = useMapboxRoute(
    pickup ? STAND_COORDS[pickup] : null,
    dropoff ? STAND_COORDS[dropoff] : null
  );

  // Active ride routes:
  // - Accepted: driver → pickup (approach)
  // - In progress: driver → dropoff (trip)
  const approachRoute = useMapboxRoute(
    activeRide?.status === RideStatus.ACCEPTED ? driverLocation : null,
    activeRide?.status === RideStatus.ACCEPTED
      ? STAND_COORDS[activeRide?.pickup ?? ""]
      : null
  );
  const tripRoute = useMapboxRoute(
    activeRide?.status === RideStatus.IN_PROGRESS ? driverLocation : null,
    activeRide?.status === RideStatus.IN_PROGRESS
      ? STAND_COORDS[activeRide?.dropoff ?? ""]
      : null
  );

  // Restore any in-flight ride on mount so navigating away and back
  // resumes the existing ride instead of starting a new one.
  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const restoreActiveRide = useCallback(async () => {
    if (!user?.id) return;
    const { status, data } = await getRides({ page: 1, limit: 200 });
    if (status === HTTP_CODES_ENUM.OK && data) {
      const inFlight = data.data
        .filter(
          (r) =>
            r.riderId === user.id &&
            (r.status === RideStatus.REQUESTED ||
              r.status === RideStatus.ACCEPTED ||
              r.status === RideStatus.IN_PROGRESS)
        )
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

      if (inFlight.length > 0) {
        setActiveRide(inFlight[0]);
      }
    }
    setRestoring(false);
  }, [user?.id, getRides]);

  useEffect(() => {
    restoreActiveRide();
  }, [restoreActiveRide]);

  // Poll active ride status
  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const pollRide = useCallback(async () => {
    if (!activeRide?.id) return;
    const { status, data } = await getRide({ id: activeRide.id });
    if (status === HTTP_CODES_ENUM.OK && data) {
      setActiveRide(data);
      // Stop polling when completed or cancelled
      if (
        data.status === RideStatus.COMPLETED ||
        data.status === RideStatus.CANCELLED
      ) {
        return;
      }
    }
  }, [activeRide?.id, getRide]);

  useEffect(() => {
    if (
      !activeRide ||
      activeRide.status === RideStatus.COMPLETED ||
      activeRide.status === RideStatus.CANCELLED
    )
      return;
    const interval = setInterval(pollRide, 3000);
    return () => clearInterval(interval);
  }, [activeRide, pollRide]);

  // Poll driver location when ride is active
  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const pollDriverLocation = useCallback(async () => {
    if (!activeRide?.driverId) return;
    const { status, data } = await getDriverProfiles({ page: 1, limit: 50 });
    if (status === HTTP_CODES_ENUM.OK && data) {
      const driverProfile = data.data.find(
        (p) => p.userId === activeRide.driverId
      );
      // eslint-disable-next-line eqeqeq
      if (driverProfile?.lat != null && driverProfile?.lng != null) {
        setDriverLocation({ lat: driverProfile.lat, lng: driverProfile.lng });
      }
    }
  }, [activeRide?.driverId, getDriverProfiles]);

  useEffect(() => {
    if (
      !activeRide?.driverId ||
      activeRide.status === RideStatus.COMPLETED ||
      activeRide.status === RideStatus.CANCELLED ||
      activeRide.status === RideStatus.REQUESTED
    )
      return;
    pollDriverLocation();
    const interval = setInterval(pollDriverLocation, 4000);
    return () => clearInterval(interval);
  }, [activeRide?.driverId, activeRide?.status, pollDriverLocation]);

  // Hail a ride
  const handleHailRide = async () => {
    if (!user?.id || !pickup || !dropoff) return;
    // Guard: never create a second ride while one is already in flight
    if (activeRide || submitting || restoring) return;
    setSubmitting(true);
    const riderName =
      `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() ||
      t("ride:riderDefaultName");
    const fare = 12 + Math.floor(Math.random() * 10); // $12-$21 fake fare
    const { status, data } = await postRide({
      riderId: user.id,
      riderName,
      pickup,
      dropoff,
      status: RideStatus.REQUESTED,
      fare,
    });
    setSubmitting(false);
    if (status === HTTP_CODES_ENUM.CREATED && data) {
      setActiveRide(data);
      enqueueSnackbar(t("ride:hailForm.alerts.requested"), {
        variant: "success",
      });
    }
  };

  // Cancel ride
  const handleCancelRide = async () => {
    if (!activeRide) return;
    const { status, data } = await patchRide({
      id: activeRide.id,
      data: { status: RideStatus.CANCELLED },
    });
    if (status === HTTP_CODES_ENUM.OK && data) {
      setActiveRide(data);
      enqueueSnackbar(t("ride:activeRide.alerts.cancelled"), {
        variant: "success",
      });
    }
  };

  // New ride (reset)
  const handleNewRide = () => {
    setActiveRide(null);
    setPickup("");
    setDropoff("");
  };

  // Status display helper
  const statusLabel = (status?: string | null) => {
    switch (status) {
      case RideStatus.REQUESTED:
        return t("ride:activeRide.statusLabels.requested");
      case RideStatus.ACCEPTED:
        return t("ride:activeRide.statusLabels.accepted");
      case RideStatus.IN_PROGRESS:
        return t("ride:activeRide.statusLabels.in_progress");
      case RideStatus.COMPLETED:
        return t("ride:activeRide.statusLabels.completed");
      case RideStatus.CANCELLED:
        return t("ride:activeRide.statusLabels.cancelled");
      default:
        return status || t("ride:activeRide.statusLabels.unknown");
    }
  };

  // While checking for an existing ride, avoid flashing the hail form
  if (restoring) {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">
          {t("ride:restoring.heading")}
        </h1>
        <p className="text-muted-foreground">{t("ride:restoring.checking")}</p>
      </div>
    );
  }

  // Active ride view
  if (activeRide) {
    const isTerminal =
      activeRide.status === RideStatus.COMPLETED ||
      activeRide.status === RideStatus.CANCELLED;

    return (
      <div className="mx-auto w-full max-w-md px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">
          {t("ride:activeRide.heading")}
        </h1>

        <div className="rounded-lg border p-6 space-y-4">
          <div className="text-lg font-medium">
            {activeRide.pickup} → {activeRide.dropoff}
          </div>

          <div className="text-xl font-semibold">
            {statusLabel(activeRide.status)}
          </div>

          {activeRide.driverName && (
            <div className="text-muted-foreground">
              {t("ride:activeRide.driverLabel")}{" "}
              <span className="font-medium">{activeRide.driverName}</span>
            </div>
          )}

          {/* Live map — driver en route or trip underway */}
          {(activeRide.status === RideStatus.ACCEPTED ||
            activeRide.status === RideStatus.IN_PROGRESS) && (
            <div className="space-y-2">
              <DriverTrackingMap
                driverLocation={driverLocation}
                pickupCoords={STAND_COORDS[activeRide.pickup] ?? null}
                dropoffCoords={STAND_COORDS[activeRide.dropoff] ?? null}
                pickupLabel={activeRide.pickup}
                dropoffLabel={activeRide.dropoff}
                fitMode={
                  activeRide.status === RideStatus.IN_PROGRESS
                    ? "driverAndDropoff"
                    : "driverAndPickup"
                }
                routeLine={
                  activeRide.status === RideStatus.IN_PROGRESS
                    ? (tripRoute ?? undefined)
                    : (approachRoute ?? undefined)
                }
              />
              <div className="text-xs text-muted-foreground">
                {driverLocation
                  ? t("ride:activeRide.map.livePosition", {
                      lat: driverLocation.lat.toFixed(5),
                      lng: driverLocation.lng.toFixed(5),
                    })
                  : t("ride:activeRide.map.waitingForDriver")}
              </div>
            </div>
          )}

          <div className="text-muted-foreground">
            {t("ride:activeRide.fareLabel")}{" "}
            <span className="font-medium">
              ${activeRide.fare ?? t("ride:activeRide.noFare")}
            </span>
            {activeRide.paid && (
              <span className="ml-2 text-green-600 font-medium">
                {t("ride:activeRide.paid")}
              </span>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            {!isTerminal && (
              <Button variant="destructive" onClick={handleCancelRide}>
                {t("ride:activeRide.actions.cancelRide")}
              </Button>
            )}
            {isTerminal && (
              <Button onClick={handleNewRide}>
                {t("ride:activeRide.actions.hailAnother")}
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Hail form
  return (
    <div className="mx-auto w-full max-w-md px-4 py-8">
      <h1 className="text-2xl font-bold mb-2">{t("ride:hailForm.heading")}</h1>
      <p className="text-muted-foreground mb-6">
        {t("ride:hailForm.description")}
      </p>

      {/* Ask for location so we can show the rider on the map */}
      <div className="mb-4">
        <LocationPermissionPrompt
          onLocation={() => {
            // Location granted — no action needed for now; the map will
            // use the driver's location. Future: auto-select nearest stand.
          }}
        />
      </div>

      <div className="space-y-4">
        <div>
          <Label>{t("ride:hailForm.inputs.pickup.label")}</Label>
          <Select value={pickup} onValueChange={setPickup}>
            <SelectTrigger>
              <SelectValue
                placeholder={t("ride:hailForm.inputs.pickup.placeholder")}
              />
            </SelectTrigger>
            <SelectContent>
              {STANDS.map((stand) => (
                <SelectItem
                  key={stand}
                  value={stand}
                  disabled={stand === dropoff}
                >
                  {stand}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>{t("ride:hailForm.inputs.dropoff.label")}</Label>
          <Select value={dropoff} onValueChange={setDropoff}>
            <SelectTrigger>
              <SelectValue
                placeholder={t("ride:hailForm.inputs.dropoff.placeholder")}
              />
            </SelectTrigger>
            <SelectContent>
              {STANDS.map((stand) => (
                <SelectItem
                  key={stand}
                  value={stand}
                  disabled={stand === pickup}
                >
                  {stand}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          className="w-full"
          size="lg"
          onClick={handleHailRide}
          disabled={!pickup || !dropoff || pickup === dropoff || submitting}
        >
          {submitting
            ? t("ride:hailForm.actions.requesting")
            : t("ride:hailForm.actions.hailCarriage")}
        </Button>

        {/* Route preview map — appears once both stands are selected */}
        {pickup && dropoff && pickup !== dropoff && (
          <div className="pt-2">
            <DriverTrackingMap
              driverLocation={null}
              pickupCoords={STAND_COORDS[pickup] ?? null}
              dropoffCoords={STAND_COORDS[dropoff] ?? null}
              pickupLabel={pickup}
              dropoffLabel={dropoff}
              fitMode="pickupAndDropoff"
              routeLine={previewRoute ?? undefined}
              height={240}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default withPageRequiredAuth(RidePageContent);
