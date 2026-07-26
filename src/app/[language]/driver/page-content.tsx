"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import useAuth from "@/services/auth/use-auth";
import {
  useGetDriverProfilesService,
  usePostDriverProfileService,
  usePatchDriverProfileService,
} from "@/services/api/services/driver-profiles";
import {
  useGetRidesService,
  usePatchRideService,
} from "@/services/api/services/rides";
import { usePostLocationPingService } from "@/services/api/services/location";
import { DriverProfile } from "@/services/api/types/driver-profile";
import { Ride, RideStatus } from "@/services/api/types/ride";
import HTTP_CODES_ENUM from "@/services/api/types/http-codes";
import { useSnackbar } from "@/hooks/use-snackbar";
import { useTranslation } from "@/services/i18n/client";

import withPageRequiredAuth from "@/services/auth/with-page-required-auth";

function DriverPageContent() {
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const { t } = useTranslation("driver");

  const getDriverProfiles = useGetDriverProfilesService();
  const postDriverProfile = usePostDriverProfileService();
  const patchDriverProfile = usePatchDriverProfileService();
  const getRides = useGetRidesService();
  const patchRide = usePatchRideService();
  const postLocationPing = usePostLocationPingService();

  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentLocation, setCurrentLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [locationStatus, setLocationStatus] = useState<string>("");

  // Form state for creating profile
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [carriageName, setCarriageName] = useState("");

  // Load driver profile for current user
  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const loadProfile = useCallback(async () => {
    if (!user?.id) return;
    const { status, data } = await getDriverProfiles({ page: 1, limit: 50 });
    if (status === HTTP_CODES_ENUM.OK && data) {
      const myProfile = data.data.find((p) => p.userId === user.id);
      if (myProfile) {
        setProfile(myProfile);
      }
    }
    setLoading(false);
  }, [user?.id, getDriverProfiles]);

  // Load rides
  const loadRides = useCallback(async () => {
    const { status, data } = await getRides({ page: 1, limit: 50 });
    if (status === HTTP_CODES_ENUM.OK && data) {
      setRides(data.data);
    }
  }, [getRides]);

  useEffect(() => {
    loadProfile();
    loadRides();
  }, [loadProfile, loadRides]);

  // Poll for new rides every 5 seconds when active
  useEffect(() => {
    if (!profile?.isActive) return;
    const interval = setInterval(loadRides, 5000);
    return () => clearInterval(interval);
  }, [profile?.isActive, loadRides]);

  // Geolocation tracking — send position every 5s when active
  const [locationDenied, setLocationDenied] = useState(false);
  const [retryCounter, setRetryCounter] = useState(0);

  useEffect(() => {
    if (!profile?.isActive) {
      setCurrentLocation(null);
      setLocationStatus("");
      setLocationDenied(false);
      return;
    }
    if (!navigator.geolocation) {
      setLocationStatus(t("driver:location.notSupported"));
      return;
    }

    setLocationStatus(t("driver:location.requesting"));
    setLocationDenied(false);

    const sendLocation = () => {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude: lat, longitude: lng } = pos.coords;
          setCurrentLocation({ lat, lng });
          setLocationStatus(t("driver:location.trackingActive"));
          setLocationDenied(false);
          await postLocationPing({ lat, lng });
        },
        (err) => {
          if (err.code === err.PERMISSION_DENIED) {
            setLocationStatus(t("driver:location.denied"));
            setLocationDenied(true);
          } else {
            setLocationStatus(
              t("driver:location.error", { message: err.message })
            );
          }
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    };

    sendLocation(); // Immediately
    if (!locationDenied) {
      const interval = setInterval(sendLocation, 5000);
      return () => clearInterval(interval);
    }
  }, [profile?.isActive, postLocationPing, retryCounter, locationDenied, t]);

  // Create profile
  const handleCreateProfile = async () => {
    if (!user?.id || !displayName.trim()) return;
    const { status, data } = await postDriverProfile({
      userId: user.id,
      displayName: displayName.trim(),
      bio: bio.trim() || undefined,
      carriageName: carriageName.trim() || undefined,
      isActive: false,
    });
    if (status === HTTP_CODES_ENUM.CREATED) {
      setProfile(data);
      enqueueSnackbar(t("driver:onboarding.alerts.profileCreated"), {
        variant: "success",
      });
    }
  };

  // Toggle active
  const handleToggleActive = async () => {
    if (!profile) return;
    const newState = !profile.isActive;
    const { status, data } = await patchDriverProfile({
      id: profile.id,
      data: { isActive: newState },
    });
    if (status === HTTP_CODES_ENUM.OK && data) {
      setProfile(data);
      enqueueSnackbar(
        newState
          ? t("driver:dashboard.alerts.nowActive")
          : t("driver:dashboard.alerts.nowOffline"),
        { variant: "success" }
      );
    }
  };

  // Accept a ride
  const handleAcceptRide = async (ride: Ride) => {
    if (!profile) return;
    const { status, data } = await patchRide({
      id: ride.id,
      data: {
        status: RideStatus.ACCEPTED,
        driverId: profile.userId,
        driverName: profile.displayName,
      },
    });
    if (status === HTTP_CODES_ENUM.OK && data) {
      enqueueSnackbar(
        t("driver:incomingRequests.alerts.accepted", {
          dropoff: ride.dropoff,
        }),
        { variant: "success" }
      );
      loadRides();
    }
  };

  // Advance ride status
  const handleAdvanceRide = async (ride: Ride, newStatus: RideStatus) => {
    const patchData: Record<string, unknown> = { status: newStatus };
    if (newStatus === RideStatus.COMPLETED) {
      patchData.paid = true;
    }
    const { status } = await patchRide({
      id: ride.id,
      data: patchData as { status: string; paid?: boolean },
    });
    if (status === HTTP_CODES_ENUM.OK) {
      enqueueSnackbar(
        t("driver:activeRides.alerts.rideUpdated", { status: newStatus }),
        { variant: "success" }
      );
      loadRides();
    }
  };

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-8">
        <p>{t("driver:loading")}</p>
      </div>
    );
  }

  // No profile yet — show creation form
  if (!profile) {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">
          {t("driver:onboarding.heading")}
        </h1>
        <p className="text-muted-foreground mb-4">
          {t("driver:onboarding.description")}
        </p>
        <div className="space-y-4">
          <div>
            <Label htmlFor="displayName">
              {t("driver:onboarding.inputs.displayName.label")}
            </Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={t(
                "driver:onboarding.inputs.displayName.placeholder"
              )}
            />
          </div>
          <div>
            <Label htmlFor="carriageName">
              {t("driver:onboarding.inputs.carriageName.label")}
            </Label>
            <Input
              id="carriageName"
              value={carriageName}
              onChange={(e) => setCarriageName(e.target.value)}
              placeholder={t(
                "driver:onboarding.inputs.carriageName.placeholder"
              )}
            />
          </div>
          <div>
            <Label htmlFor="bio">
              {t("driver:onboarding.inputs.bio.label")}
            </Label>
            <Input
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder={t("driver:onboarding.inputs.bio.placeholder")}
            />
          </div>
          <Button onClick={handleCreateProfile} disabled={!displayName.trim()}>
            {t("driver:onboarding.actions.createProfile")}
          </Button>
        </div>
      </div>
    );
  }

  // Has profile — show dashboard
  const requestedRides = rides.filter((r) => r.status === RideStatus.REQUESTED);
  const myActiveRides = rides.filter(
    (r) =>
      r.driverId === profile.userId &&
      (r.status === RideStatus.ACCEPTED || r.status === RideStatus.IN_PROGRESS)
  );

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">
            {t("driver:dashboard.heading")}
          </h1>
          <p className="text-muted-foreground">
            {profile.displayName}
            {profile.carriageName && ` — ${profile.carriageName}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="active-toggle">
            {profile.isActive
              ? t("driver:dashboard.status.active")
              : t("driver:dashboard.status.offline")}
          </Label>
          <Switch
            id="active-toggle"
            checked={profile.isActive ?? false}
            onCheckedChange={handleToggleActive}
          />
        </div>
      </div>

      {!profile.isActive && (
        <div className="rounded-lg border p-4 text-center text-muted-foreground">
          {t("driver:dashboard.inactivePrompt")}
        </div>
      )}

      {profile.isActive && (
        <>
          {/* Location tracking status */}
          {locationDenied ? (
            <div className="rounded-lg border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950 p-4 mb-6 text-center space-y-2">
              <p className="text-sm text-orange-800 dark:text-orange-200">
                {t("driver:location.deniedWarning")}
              </p>
              <p className="text-xs text-orange-700 dark:text-orange-300">
                {t("driver:location.deniedHelp")}
              </p>
              <Button size="sm" onClick={() => setRetryCounter((c) => c + 1)}>
                {t("driver:location.allowAccess")}
              </Button>
            </div>
          ) : (
            <div className="rounded-lg border p-3 mb-6 flex items-center justify-between bg-muted/30">
              <div className="text-sm">
                <span className="font-medium">📍 {locationStatus}</span>
                {currentLocation && (
                  <span className="ml-2 text-muted-foreground">
                    ({currentLocation.lat.toFixed(5)},{" "}
                    {currentLocation.lng.toFixed(5)})
                  </span>
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                {t("driver:location.pingingFrequency")}
              </div>
            </div>
          )}

          {/* My active rides */}
          {myActiveRides.length > 0 && (
            <section className="mb-8">
              <h2 className="text-lg font-semibold mb-3">
                {t("driver:activeRides.heading")}
              </h2>
              <div className="space-y-3">
                {myActiveRides.map((ride) => (
                  <div
                    key={ride.id}
                    className="rounded-lg border p-4 flex flex-col gap-2"
                  >
                    <div className="flex justify-between">
                      <span className="font-medium">
                        {ride.pickup} → {ride.dropoff}
                      </span>
                      <span className="text-sm px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                        {t(`driver:activeRides.statusLabels.${ride.status}`)}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {t("driver:activeRides.riderLine", {
                        riderName:
                          ride.riderName ||
                          t("driver:activeRides.anonymousRider"),
                        fare:
                          ride.fare !== null
                            ? `$${ride.fare}`
                            : t("driver:activeRides.noFare"),
                      })}
                    </div>
                    <div className="flex gap-2 mt-1">
                      {ride.status === RideStatus.ACCEPTED && (
                        <Button
                          size="sm"
                          onClick={() =>
                            handleAdvanceRide(ride, RideStatus.IN_PROGRESS)
                          }
                        >
                          {t("driver:activeRides.actions.startTrip")}
                        </Button>
                      )}
                      {ride.status === RideStatus.IN_PROGRESS && (
                        <Button
                          size="sm"
                          onClick={() =>
                            handleAdvanceRide(ride, RideStatus.COMPLETED)
                          }
                        >
                          {t("driver:activeRides.actions.completeAndCheckout")}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() =>
                          handleAdvanceRide(ride, RideStatus.CANCELLED)
                        }
                      >
                        {t("driver:activeRides.actions.cancel")}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Incoming ride requests */}
          <section>
            <h2 className="text-lg font-semibold mb-3">
              {t("driver:incomingRequests.heading")}{" "}
              <span className="text-sm font-normal text-muted-foreground">
                {t("driver:incomingRequests.autoRefreshes")}
              </span>
            </h2>
            {requestedRides.length === 0 ? (
              <div className="rounded-lg border p-4 text-center text-muted-foreground">
                {t("driver:incomingRequests.empty")}
              </div>
            ) : (
              <div className="space-y-3">
                {requestedRides.map((ride) => (
                  <div
                    key={ride.id}
                    className="rounded-lg border p-4 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-medium">
                        {ride.pickup} → {ride.dropoff}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {t("driver:incomingRequests.riderLine", {
                          riderName:
                            ride.riderName ||
                            t("driver:activeRides.anonymousRider"),
                          fare:
                            ride.fare !== null
                              ? `$${ride.fare}`
                              : t("driver:activeRides.noFare"),
                        })}
                      </div>
                    </div>
                    <Button size="sm" onClick={() => handleAcceptRide(ride)}>
                      {t("driver:incomingRequests.actions.accept")}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

export default withPageRequiredAuth(DriverPageContent);
